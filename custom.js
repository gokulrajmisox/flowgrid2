/* ============================================
   Custom Cursor & Interactive Enhancements
   ============================================ */
(function() {
  'use strict';

  import('/assets/js/liquid-logo.mjs').catch(function(err) {
    console.warn('[LiquidLogo] Module load failed:', err);
  });

  document.addEventListener('DOMContentLoaded', function() {

    // --- Custom Cursor ---
    if (window.matchMedia('(hover: hover)').matches) {
      var dot = document.createElement('div');
      dot.id = 'custom-cursor';
      var ring = document.createElement('div');
      ring.id = 'custom-cursor-ring';
      document.body.appendChild(dot);
      document.body.appendChild(ring);

      var mx = 0, my = 0;   // actual mouse
      var dx = 0, dy = 0;   // dot (instant)
      var rx = 0, ry = 0;   // ring (trailing)

      document.addEventListener('mousemove', function(e) {
        mx = e.clientX;
        my = e.clientY;
      });

      (function loop() {
        dx = mx; dy = my;
        rx += (mx - rx) * 0.15;
        ry += (my - ry) * 0.15;
        dot.style.left  = dx + 'px';
        dot.style.top   = dy + 'px';
        ring.style.left = rx + 'px';
        ring.style.top  = ry + 'px';
        requestAnimationFrame(loop);
      })();

      // Hover detection
      document.addEventListener('mouseover', function(e) {
        var el = e.target;
        if (el.closest('a, button, [role="button"], .project-item, .header-menu-link, #header-right-menu-btn, #header-right-talk-btn')) {
          dot.classList.add('--hover');
          ring.classList.add('--hover');
        }
      });
      document.addEventListener('mouseout', function(e) {
        var el = e.target;
        if (el.closest('a, button, [role="button"], .project-item, .header-menu-link, #header-right-menu-btn, #header-right-talk-btn')) {
          dot.classList.remove('--hover');
          ring.classList.remove('--hover');
        }
      });
    }

    // Note: Section visibility and scroll transitions are managed directly by
    // the virtual scroll engine in hoisted.js; hiding tall sections (e.g.
    // #about-who at 14,580px) behind a viewport IntersectionObserver threshold
    // prevents them from ever becoming visible.

    // --- Dynamic Year in Footer ---
    var copyright = document.getElementById('footer-bottom-copyright');
    if (copyright) {
      copyright.textContent = copyright.textContent.replace(/©\d{4}/, '©' + new Date().getFullYear());
    }

    console.log('[CUSTOM]', 'Enhancements loaded.');
  });
})();
