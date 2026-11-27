import Lenis from 'lenis';
import { isHeaderOverDarkSection } from './endSectionUtils.js';

function init() {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const lenis = prefersReducedMotion
    ? null
    : new Lenis({
        lerp: 0.095,
        smoothWheel: true,
        anchors: true,
      });

  if (lenis) {
    window.__flowgridLenis = lenis;
    if (document.body.classList.contains('no-scroll')) {
      lenis.stop();
    }

    if (typeof MutationObserver !== 'undefined') {
      const scrollLockObserver = new MutationObserver(() => {
        if (document.body.classList.contains('no-scroll')) {
          lenis.stop();
        } else {
          lenis.start();
        }
      });
      scrollLockObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    lenis.on('scroll', () => {
      updateScrollbar();
      updateBottomSectionsUI();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.requestAnimationFrame(update);

  const scrollbar = document.getElementById('scrollbar');
  const scrollbarHandle = document.getElementById('scrollbar-handle');
  const h1Topline = document.getElementById('h1-topline');
  const h1Tagline = document.getElementById('h1-tagline');
  const header = document.getElementById('header');
  const endSection = document.getElementById('end-section');
  const footerSection = document.getElementById('footer-section');
  const scrollNavSection = document.getElementById('scroll-nav-section');
  const scrollNavBarInner = document.getElementById('scroll-nav-next-bar-inner');
  const endBottomBtn = document.getElementById('end-bottom');
  const footerUpBtn = document.getElementById('footer-bottom-up');

  if (endBottomBtn && footerSection) {
    endBottomBtn.addEventListener('click', () => {
      if (lenis) {
        lenis.scrollTo(footerSection, { duration: 1.1 });
      } else {
        footerSection.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });
  }

  if (footerUpBtn) {
    footerUpBtn.addEventListener('click', () => {
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.25 });
      } else {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });
  }

  if (h1Topline || h1Tagline) {
    const headlineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
          } else {
            entry.target.classList.remove('animate');
          }
        });
      },
      { root: null, rootMargin: '0px', threshold: 0 }
    );

    if (h1Topline) headlineObserver.observe(h1Topline);
    if (h1Tagline) headlineObserver.observe(h1Tagline);
  }

  function onScroll() {
    updateScrollbar();
    updateBottomSectionsUI();
  }

  function updateBottomSectionsUI() {
    if (header) {
      const darkRects = [];
      if (endSection) darkRects.push(endSection.getBoundingClientRect());
      if (scrollNavSection) darkRects.push(scrollNavSection.getBoundingClientRect());
      const overDark = isHeaderOverDarkSection(darkRects, 44);
      header.classList.toggle('--on-dark-section', overDark);
    }

    if (scrollNavSection && scrollNavBarInner) {
      const rect = scrollNavSection.getBoundingClientRect();
      const vh = window.innerHeight || 900;
      const ratio = Math.min(1, Math.max(0.2, (vh - rect.top) / Math.max(1, rect.height + 80)));
      scrollNavBarInner.style.transform = `scaleX(${ratio.toFixed(3)})`;
    }
  }

  function update(time) {
    if (lenis) {
      lenis.raf(time);
    }
    updateScrollbar();
    updateBottomSectionsUI();
    if (Array.isArray(window.__flowgridFrameCallbacks)) {
      for (let i = 0; i < window.__flowgridFrameCallbacks.length; i++) {
        window.__flowgridFrameCallbacks[i](time);
      }
    }
    window.requestAnimationFrame(update);
  }

  function updateScrollbar() {
    if (!scrollbar || !scrollbarHandle) return;
    const totalHeight = Math.max(document.body.scrollHeight, window.innerHeight);
    const heightPerViewport = totalHeight / Math.max(1, window.innerHeight);
    const handleHeight = Math.max(12, scrollbar.clientHeight / Math.max(1, heightPerViewport));
    scrollbarHandle.style.height = `${handleHeight}px`;

    const currentScroll = lenis ? lenis.scroll : window.scrollY;
    const maxScroll = Math.max(1, totalHeight - window.innerHeight);
    const scrollProgress = Math.min(1, Math.max(0, currentScroll / maxScroll));
    const maxTop = Math.max(0, scrollbar.clientHeight - handleHeight);
    scrollbarHandle.style.top = `${scrollProgress * maxTop}px`;
  }
}

init();
