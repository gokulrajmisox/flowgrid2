import Lenis from 'lenis';

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
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.requestAnimationFrame(update);

  const scrollbar = document.getElementById('scrollbar');
  const scrollbarHandle = document.getElementById('scrollbar-handle');
  const h1Topline = document.getElementById('h1-topline');
  const h1Tagline = document.getElementById('h1-tagline');

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
  }

  function update(time) {
    if (lenis) {
      lenis.raf(time);
    }
    updateScrollbar();
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
