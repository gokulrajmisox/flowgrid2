import {
  CAREERS_FORM_CONFIG,
  INTERNSHIP_ROLES,
  buildRoleDetailModel,
} from '../data/careers.js';
import {
  AntigravityController,
  resolveRoleAntigravityPreset,
} from './antigravity.js';
import RoleHeroVisual from './roleHeroVisual.js';
import { detectSoftwareWebGL } from './utils/utils.js';

export default class RoleDetailView {
  modalEl = document.getElementById('project-tile-modal');
  innerEl = document.getElementById('detail-experience-inner');
  heroVisualMount = document.getElementById('modal-hero-visual-mount');
  antigravityMount = document.getElementById('detail-antigravity-bg');
  isSoftwareGl = detectSoftwareWebGL();
  activeRole = INTERNSHIP_ROLES[0];
  selectedDuration = CAREERS_FORM_CONFIG.durations[0];
  selectedWorkMode = CAREERS_FORM_CONFIG.workModes[0];
  expandedRespIndex = 0;
  onSwitchRole = null;
  revealObserver = null;

  constructor({ onSwitchRole } = {}) {
    this.onSwitchRole = onSwitchRole;
    this.heroVisual = new RoleHeroVisual(this.heroVisualMount);
    if (this.antigravityMount) {
      this.antigravity = new AntigravityController(
        this.antigravityMount,
        {
          ...resolveRoleAntigravityPreset(this.activeRole.visualType, this.isSoftwareGl),
          active: false,
        }
      );
    }
    this.bindControls();
    this.setupRevealObserver();
  }

  bindControls() {
    const durationGroup = document.getElementById('modal-duration-group');
    const modeGroup = document.getElementById('modal-mode-group');
    const respList = document.getElementById('detail-responsibilities-list');
    const prevBtn = document.getElementById('detail-prev-role-btn');
    const nextBtn = document.getElementById('detail-next-role-btn');

    durationGroup?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-value]');
      if (!btn) return;
      this.setDuration(btn.dataset.value);
    });

    durationGroup?.addEventListener('keydown', (e) => {
      this.handleSegmentedKeyNav(e, CAREERS_FORM_CONFIG.durations, (v) => this.setDuration(v));
    });

    modeGroup?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-value]');
      if (!btn) return;
      this.setWorkMode(btn.dataset.value);
    });

    modeGroup?.addEventListener('keydown', (e) => {
      this.handleSegmentedKeyNav(e, CAREERS_FORM_CONFIG.workModes, (v) => this.setWorkMode(v));
    });

    respList?.addEventListener('click', (e) => {
      const trigger = e.target.closest('.detail-resp-trigger');
      if (!trigger) return;
      const idx = Number(trigger.dataset.index);
      this.expandedRespIndex = this.expandedRespIndex === idx ? -1 : idx;
      this.syncResponsibilityStates();
    });

    prevBtn?.addEventListener('click', () => {
      const model = buildRoleDetailModel(this.activeRole, {
        duration: this.selectedDuration,
        workMode: this.selectedWorkMode,
      });
      if (model.prevRole) this.transitionToRole(model.prevRole);
    });

    nextBtn?.addEventListener('click', () => {
      const model = buildRoleDetailModel(this.activeRole, {
        duration: this.selectedDuration,
        workMode: this.selectedWorkMode,
      });
      if (model.nextRole) this.transitionToRole(model.nextRole);
    });
  }

  handleSegmentedKeyNav(event, values, setter) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const currentIdx = values.indexOf(
      event.currentTarget.id === 'modal-duration-group'
        ? this.selectedDuration
        : this.selectedWorkMode
    );
    const dir = event.key === 'ArrowRight' ? 1 : -1;
    const nextIdx = (currentIdx + dir + values.length) % values.length;
    setter(values[nextIdx]);
    const buttons = event.currentTarget.querySelectorAll('button[data-value]');
    buttons[nextIdx]?.focus();
  }

  setupRevealObserver() {
    if (!this.modalEl || typeof IntersectionObserver === 'undefined') return;
    const revealTargets = this.modalEl.querySelectorAll('[data-detail-reveal]');
    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      { root: this.modalEl, rootMargin: '0px 0px -40px 0px', threshold: 0.08 }
    );
    revealTargets.forEach((el) => this.revealObserver.observe(el));
  }

  setDuration(value) {
    if (!CAREERS_FORM_CONFIG.durations.includes(value)) return;
    this.selectedDuration = value;
    this.syncDynamicSelections();
  }

  setWorkMode(value) {
    if (!CAREERS_FORM_CONFIG.workModes.includes(value)) return;
    this.selectedWorkMode = value;
    this.syncDynamicSelections();
  }

  transitionToRole(nextRole) {
    if (!nextRole || !this.innerEl) return;
    this.innerEl.classList.add('is-switching');
    window.setTimeout(() => {
      this.renderRole(nextRole);
      if (this.modalEl) this.modalEl.scrollTop = 0;
      this.onSwitchRole?.(nextRole);
      window.requestAnimationFrame(() => {
        this.innerEl.classList.remove('is-switching');
      });
    }, 170);
  }

  renderRole(role) {
    if (!role) return;
    this.activeRole = role;
    this.expandedRespIndex = 0;

    // Hero controlled multi-line headline
    const headlineEl = document.getElementById('modal-role-title');
    if (headlineEl) {
      headlineEl.replaceChildren();
      role.heroLines.forEach((line, i) => {
        const span = document.createElement('span');
        span.className = 'detail-hero-line';
        span.style.setProperty('--line-delay', `${i * 70}ms`);
        span.textContent = line;
        headlineEl.appendChild(span);
      });
    }

    const summaryEl = document.getElementById('modal-role-summary');
    if (summaryEl) summaryEl.textContent = role.summary;

    const overviewEl = document.getElementById('detail-overview-copy');
    if (overviewEl) overviewEl.textContent = role.overview;

    const whoEl = document.getElementById('detail-who-copy');
    if (whoEl) whoEl.textContent = role.whoShouldApply;

    // Cover visual frame (natural tone, separate caption below image)
    const coverImg = document.getElementById('detail-cover-img');
    const coverCaption = document.getElementById('detail-cover-caption');
    if (coverImg) {
      coverImg.src = `/${role.image}`;
      coverImg.alt = `${role.title} — Flowgrid Studio Track Preview`;
    }
    if (coverCaption) {
      coverCaption.textContent = `TRACK ${role.indexNumber} · ${role.department.toUpperCase()} · ${role.title.toUpperCase()}`;
    }

    // What you will work on
    const workOnEl = document.getElementById('detail-work-on-list');
    if (workOnEl) {
      workOnEl.replaceChildren();
      role.workOn.forEach((point) => {
        const li = document.createElement('li');
        li.textContent = point;
        workOnEl.appendChild(li);
      });
    }

    // Responsibilities interactive numbered list
    const respListEl = document.getElementById('detail-responsibilities-list');
    if (respListEl) {
      respListEl.replaceChildren();
      role.responsibilities.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'detail-resp-row';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'detail-resp-trigger';
        btn.dataset.index = String(idx);
        btn.setAttribute('aria-expanded', idx === 0 ? 'true' : 'false');

        const codeSpan = document.createElement('span');
        codeSpan.className = 'detail-resp-code';
        codeSpan.textContent = `${item.index} / ${item.verb}`;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'detail-resp-title';
        titleSpan.textContent = item.title;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'detail-resp-chevron';
        iconSpan.setAttribute('aria-hidden', 'true');
        iconSpan.textContent = idx === 0 ? '−' : '+';

        btn.append(codeSpan, titleSpan, iconSpan);

        const panel = document.createElement('div');
        panel.className = 'detail-resp-panel';
        panel.hidden = idx !== 0;

        const p = document.createElement('p');
        p.textContent = item.detail;
        panel.appendChild(p);

        row.append(btn, panel);
        respListEl.appendChild(row);
      });
      this.syncResponsibilityStates();
    }

    // Core skills typographic sequence
    const skillsTypoEl = document.getElementById('detail-skills-typo');
    if (skillsTypoEl) {
      skillsTypoEl.replaceChildren();
      role.skills.forEach((skill, idx) => {
        const item = document.createElement('span');
        item.className = 'detail-skill-token';
        item.tabIndex = 0;
        item.textContent = skill.toUpperCase();
        skillsTypoEl.appendChild(item);

        if (idx < role.skills.length - 1) {
          const sep = document.createElement('span');
          sep.className = 'detail-skill-sep';
          sep.setAttribute('aria-hidden', 'true');
          sep.textContent = '/';
          skillsTypoEl.appendChild(sep);
        }
      });
    }

    // Skills you will develop
    const developEl = document.getElementById('detail-skills-develop-list');
    if (developEl) {
      developEl.replaceChildren();
      role.skillsDevelop.forEach((skill) => {
        const li = document.createElement('li');
        li.textContent = skill;
        developEl.appendChild(li);
      });
    }

    // Topbar role index indicator
    const indexReadout = document.getElementById('detail-topbar-index');
    if (indexReadout) {
      indexReadout.textContent = `${role.indexNumber} / ${String(INTERNSHIP_ROLES.length).padStart(2, '0')} · ${role.department.toUpperCase()}`;
    }

    this.heroVisual.setRoleType(role.visualType);
    this.antigravity?.setOptions(
      resolveRoleAntigravityPreset(role.visualType, this.isSoftwareGl)
    );
    this.syncDynamicSelections();

    // Ensure top reveal sections show cleanly immediately
    this.modalEl?.querySelectorAll('[data-detail-reveal]').forEach((el, i) => {
      if (i < 2) el.classList.add('is-revealed');
      else el.classList.remove('is-revealed');
    });
  }

  syncResponsibilityStates() {
    const rows = document.querySelectorAll('#detail-responsibilities-list .detail-resp-row');
    rows.forEach((row, idx) => {
      const isOpen = idx === this.expandedRespIndex;
      const btn = row.querySelector('.detail-resp-trigger');
      const panel = row.querySelector('.detail-resp-panel');
      const icon = row.querySelector('.detail-resp-chevron');
      row.classList.toggle('is-open', isOpen);
      btn?.setAttribute('aria-expanded', String(isOpen));
      if (panel) panel.hidden = !isOpen;
      if (icon) icon.textContent = isOpen ? '−' : '+';
    });
  }

  syncDynamicSelections() {
    const model = buildRoleDetailModel(this.activeRole, {
      duration: this.selectedDuration,
      workMode: this.selectedWorkMode,
    });

    const kickerEl = document.getElementById('modal-role-kicker');
    if (kickerEl) kickerEl.textContent = model.kicker;

    // Sticky application panel metadata
    const stickyTitle = document.getElementById('sticky-role-title');
    const stickyCategory = document.getElementById('sticky-role-category');
    const stickyDuration = document.getElementById('sticky-role-duration');
    const stickyMode = document.getElementById('sticky-role-mode');
    const stickyStatus = document.getElementById('sticky-role-status');
    const finalSelectionNote = document.getElementById('final-cta-selection');
    const mobileBarMeta = document.getElementById('mobile-sticky-meta');

    if (stickyTitle) stickyTitle.textContent = this.activeRole.title;
    if (stickyCategory) stickyCategory.textContent = this.activeRole.department;
    if (stickyDuration) stickyDuration.textContent = model.durationLabel;
    if (stickyMode) stickyMode.textContent = model.workModeLabel;
    if (stickyStatus) stickyStatus.textContent = `${this.activeRole.status} · Applications Active`;
    if (finalSelectionNote) {
      finalSelectionNote.textContent = `Selected configuration: ${this.activeRole.formRoleValue} · ${model.durationLabel} · ${model.workModeLabel}`;
    }
    if (mobileBarMeta) {
      mobileBarMeta.textContent = `${this.activeRole.formRoleValue} · ${model.durationLabel} · ${model.workModeLabel}`;
    }

    // Duration segmented indicator & active state
    const durationGroup = document.getElementById('modal-duration-group');
    const durIdx = Math.max(0, CAREERS_FORM_CONFIG.durations.indexOf(this.selectedDuration));
    durationGroup?.style.setProperty('--active-index', String(durIdx));
    durationGroup?.querySelectorAll('button[data-value]').forEach((btn) => {
      const active = btn.dataset.value === this.selectedDuration;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    // Work Mode segmented indicator & active state
    const modeGroup = document.getElementById('modal-mode-group');
    const modeIdx = Math.max(0, CAREERS_FORM_CONFIG.workModes.indexOf(this.selectedWorkMode));
    modeGroup?.style.setProperty('--active-index', String(modeIdx));
    modeGroup?.querySelectorAll('button[data-value]').forEach((btn) => {
      const active = btn.dataset.value === this.selectedWorkMode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    // Update all Apply CTA anchors with live prefilled Google Form parameters
    const applyTargets = [
      document.getElementById('modal-apply-link'),
      document.getElementById('final-apply-link'),
      document.getElementById('mobile-apply-link'),
    ];
    applyTargets.forEach((link) => {
      if (link) link.href = model.applicationUrl;
    });

    const prevBtn = document.getElementById('detail-prev-role-btn');
    const nextBtn = document.getElementById('detail-next-role-btn');
    if (prevBtn && model.prevRole) {
      prevBtn.setAttribute('aria-label', `Previous role: ${model.prevRole.title}`);
    }
    if (nextBtn && model.nextRole) {
      nextBtn.setAttribute('aria-label', `Next role: ${model.nextRole.title}`);
    }
  }

  open() {
    this.antigravity?.setActive(true);
    this.heroVisual.start();
    this.heroVisual.resize();
  }

  close() {
    this.antigravity?.setActive(false);
    this.heroVisual.stop();
  }
}
