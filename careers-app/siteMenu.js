function initSiteMenu() {
  const header = document.getElementById('header');
  const menuBtn = document.getElementById('header-right-menu-btn');
  const headerMenu = document.getElementById('header-menu');
  const backdrop = document.getElementById('header-background');
  const modal = document.getElementById('project-tile-modal');
  if (!header || !menuBtn || !headerMenu) return;

  const setMenuOpen = (isOpen) => {
    header.classList.toggle('--menu-opened', isOpen);
    menuBtn.classList.toggle('--opened', isOpen);
    headerMenu.classList.toggle('--opened', isOpen);
    backdrop?.classList.toggle('--opened', isOpen);

    menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    headerMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  };

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = headerMenu.classList.contains('--opened');
    setMenuOpen(!isOpen);
  });

  backdrop?.addEventListener('click', () => {
    setMenuOpen(false);
  });

  document.addEventListener('click', (e) => {
    if (!headerMenu.classList.contains('--opened')) return;
    if (!header.contains(e.target)) {
      setMenuOpen(false);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && headerMenu.classList.contains('--opened')) {
      setMenuOpen(false);
      menuBtn.focus();
    }
  });

  headerMenu.querySelectorAll('.header-menu-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('data-scroll-target');
      if (targetId) {
        e.preventDefault();
        setMenuOpen(false);
        const target = document.getElementById(targetId);
        if (target) {
          if (window.__flowgridLenis) {
            window.__flowgridLenis.scrollTo(target, { duration: 1.15 });
          } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        return;
      }

      if (link.classList.contains('--active')) {
        e.preventDefault();
        setMenuOpen(false);
        if (window.__flowgridLenis) {
          window.__flowgridLenis.scrollTo(0, { duration: 1.0 });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      setMenuOpen(false);
    });
  });

  if (modal && typeof MutationObserver !== 'undefined') {
    const modalObserver = new MutationObserver(() => {
      if (modal.classList.contains('show')) {
        setMenuOpen(false);
      }
    });
    modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }
}

initSiteMenu();
