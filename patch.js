/**
 * flowgrid Clone - Patch Script
 * 
 * Fixes issues caused by placeholder assets (empty .buf models, 1px textures)
 * that break the Three.js loading chain in the cloned site.
 * 
 * Must be loaded BEFORE hoisted.81170750.js
 */
(function() {
  'use strict';

  // =========================================================
  // 0. DYNAMIC BASE PATH DETECTION (for GitHub Pages support)
  // =========================================================
  var pathname = window.location.pathname;
  var base = "/";
  if (pathname.includes("/projects/")) {
    base = pathname.substring(0, pathname.indexOf("/projects/") + 1);
  } else if (pathname.includes("/about.html")) {
    base = pathname.substring(0, pathname.indexOf("/about.html") + 1);
  } else if (pathname.includes("/projects.html")) {
    base = pathname.substring(0, pathname.indexOf("/projects.html") + 1);
  } else if (pathname.includes("/index.html")) {
    base = pathname.substring(0, pathname.indexOf("/index.html") + 1);
  } else if (/\/(about|projects)\/?$/.test(pathname)) {
    base = pathname.replace(/\/(about|projects)\/?$/, "/");
  } else {
    base = pathname;
  }
  if (!base.endsWith("/")) {
    base += "/";
  }
  window.BASE_PATH = base;
  console.log('[PATCH] Dynamic BASE_PATH set to:', window.BASE_PATH);

  // =========================================================
  // 0.1 GLOBAL NETWORK URL NORMALIZATION (Fix double slashes)
  // =========================================================
  function normalizeUrl(url) {
    if (typeof url !== 'string') return url;
    // Normalize double slashes in path (preserving protocol)
    var parts = url.split('://');
    if (parts.length === 2) {
      return parts[0] + '://' + parts[1].replace(/\/+/g, '/');
    }
    // For relative/absolute paths
    return url.replace(/\/+/g, '/');
  }

  // Hook Fetch
  var originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      input = normalizeUrl(input);
    } else if (input && typeof input.url === 'string') {
      try {
        var newUrl = normalizeUrl(input.url);
        input = new Request(newUrl, input);
      } catch (e) {}
    }
    return originalFetch.call(this, input, init);
  };

  // Hook XMLHttpRequest
  var originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    if (typeof url === 'string') {
      url = normalizeUrl(url);
    }
    return originalOpen.call(this, method, url, async, user, password);
  };

  // Hook HTMLImageElement src
  var originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (originalSrcDescriptor && originalSrcDescriptor.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      get: function() {
        return originalSrcDescriptor.get.call(this);
      },
      set: function(val) {
        if (typeof val === 'string') {
          val = normalizeUrl(val);
        }
        originalSrcDescriptor.set.call(this, val);
      }
    });
  }

  // Hook HTMLMediaElement src (audio/video)
  var originalVideoSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  if (originalVideoSrcDescriptor && originalVideoSrcDescriptor.set) {
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      get: function() {
        return originalVideoSrcDescriptor.get.call(this);
      },
      set: function(val) {
        if (typeof val === 'string') {
          val = normalizeUrl(val);
        }
        originalVideoSrcDescriptor.set.call(this, val);
      }
    });
  }

  const PATCH_TAG = '[PATCH]';
  const FORCE_READY_TIMEOUT = 15000; // ms - emergency fallback only if engine stalls
  const SCROLL_RESET_DELAY = 500;   // ms - delay before scrolling to top

  // =========================================================
  // 1. GLOBAL ERROR SUPPRESSION
  //    Catch Three.js parsing errors from empty .buf files
  //    so they don't crash the loading pipeline
  // =========================================================
  let suppressedErrors = 0;

  window.onerror = function(message, source, lineno, colno, error) {
    const msg = String(message).toLowerCase();
    const isAssetError = (
      msg.includes('buffer') ||
      msg.includes('arraybuffer') ||
      msg.includes('dataview') ||
      msg.includes('typed array') ||
      msg.includes('bytelength') ||
      msg.includes('offset') ||
      msg.includes('float32array') ||
      msg.includes('uint16array') ||
      msg.includes('uint32array') ||
      msg.includes('cannot read properties of') ||
      msg.includes('is not a function') ||
      msg.includes('undefined') ||
      msg.includes('null')
    );

    if (isAssetError) {
      suppressedErrors++;
      if (suppressedErrors <= 5) {
        console.warn(PATCH_TAG, 'Suppressed asset error:', message);
      } else if (suppressedErrors === 6) {
        console.warn(PATCH_TAG, '(Further asset errors will be silently suppressed)');
      }
      return true; // Prevent default error handling
    }
    return false; // Let other errors through
  };

  window.addEventListener('unhandledrejection', function(event) {
    const reason = String(event.reason || '').toLowerCase();
    if (reason.includes('buffer') || reason.includes('fetch') || 
        reason.includes('arraybuffer') || reason.includes('load')) {
      console.warn(PATCH_TAG, 'Suppressed promise rejection:', event.reason);
      event.preventDefault();
    }
  });

  // =========================================================
  // 2. FORCE PRELOADER COMPLETION
  //    If the preloader doesn't finish naturally (due to parse
  //    errors), force it to hide after a timeout
  // =========================================================
  function forceReady() {
    const preloader = document.getElementById('preloader');
    const transitionOverlay = document.getElementById('transition-overlay');
    const isPreloaderVisible = preloader && preloader.style.display !== 'none';
    const isOverlayBlocking = transitionOverlay && transitionOverlay.style.display !== 'none';

    if (isPreloaderVisible || isOverlayBlocking) {
      window.__FORCE_READY__ = true;
      console.log(PATCH_TAG, 'Forcing preloader completion (' + suppressedErrors + ' errors suppressed)');

      if (preloader && isPreloaderVisible) {
        preloader.style.transition = 'opacity 0.5s ease-out';
        preloader.style.opacity = '0';
      }
      if (transitionOverlay && isOverlayBlocking) {
        transitionOverlay.style.transition = 'opacity 0.5s ease-out';
        transitionOverlay.style.opacity = '0';
        transitionOverlay.style.pointerEvents = 'none';
      }

      setTimeout(function() {
        if (preloader) {
          preloader.style.display = 'none';
        }
        if (transitionOverlay) {
          transitionOverlay.style.display = 'none';
          transitionOverlay.style.pointerEvents = 'none';
        }

        // Make the page interactive
        var inputBlocker = document.getElementById('input-blocker');
        if (inputBlocker) {
          inputBlocker.style.display = 'none';
        }

        // Ensure UI is visible
        var ui = document.getElementById('ui');
        if (ui) {
          ui.style.opacity = '1';
          ui.style.pointerEvents = 'auto';
        }

        // Show the page container
        var pageContainer = document.getElementById('page-container');
        if (pageContainer) {
          pageContainer.style.opacity = '1';
          pageContainer.style.visibility = 'visible';
        }

        console.log(PATCH_TAG, 'Page forced ready.');
      }, 600);
    }
  }

  // Set the fallback timeout
  setTimeout(forceReady, FORCE_READY_TIMEOUT);

  // =========================================================
  // 3. SCROLL POSITION FIX
  //    Reset scroll to top after the page becomes visible
  // =========================================================
  function resetScroll() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  // Reset scroll on load and after a short delay
  window.addEventListener('load', function() {
    resetScroll();
    setTimeout(resetScroll, SCROLL_RESET_DELAY);
    setTimeout(resetScroll, FORCE_READY_TIMEOUT + 1000);
  });

  // Also reset if we detect an unexpected scroll position early
  setTimeout(function() {
    if (window.scrollY > 100) {
      console.log(PATCH_TAG, 'Resetting unexpected scroll position:', window.scrollY);
      resetScroll();
    }
  }, 2000);

  // =========================================================
  // 4. MENU NAVIGATION FALLBACK
  //    If the JS-based page routing doesn't initialize,
  //    ensure menu links work as standard <a href> navigation
  // =========================================================
  document.addEventListener('DOMContentLoaded', function() {
    // 4.1 Menu Button Toggle (Using Original CSS Classes)
    var menuBtn = document.getElementById('header-right-menu-btn');
    var headerMenu = document.getElementById('header-menu');
    var header = document.getElementById('header');

    if (menuBtn && headerMenu) {
      menuBtn.addEventListener('click', function(e) {
        // Stop bubbling so we don't trigger other listeners immediately
        e.stopImmediatePropagation();
        
        var isOpen = headerMenu.classList.contains('--opened');
        if (isOpen) {
          headerMenu.classList.remove('--opened');
          menuBtn.classList.remove('--opened');
          if (header) header.classList.remove('--menu-opened');
          // Fallback cleanup
          setTimeout(function() {
            if (!headerMenu.classList.contains('--opened')) {
              headerMenu.style.display = 'none';
            }
          }, 500);
        } else {
          headerMenu.style.display = 'flex';
          // Use original classes for styling
          headerMenu.classList.add('--opened');
          menuBtn.classList.add('--opened');
          if (header) header.classList.add('--menu-opened');
          
          // Fallback: Ensure visibility if JS initialization failed
          headerMenu.style.opacity = '1';
          headerMenu.style.pointerEvents = 'auto';
          headerMenu.style.visibility = 'visible';
          headerMenu.style.zIndex = '9999';
        }
      });
    }

    // 4.2 Robust Navigation Fallback
    // If clicking About/Projects doesn't change the URL in 300ms, force it.
    var menuLinks = document.querySelectorAll('.header-menu-link');
    menuLinks.forEach(function(link) {
      link.style.pointerEvents = 'auto'; // Ensure clickable
      
      link.addEventListener('click', function(e) {
        var href = link.getAttribute('href');
        var scrollTo = link.getAttribute('data-scroll-to');
        
        if (scrollTo === 'contact') {
          e.preventDefault();
          // Hide menu
          headerMenu.classList.remove('--opened');
          menuBtn.classList.remove('--opened');
          if (header) header.classList.remove('--menu-opened');
          
          var footer = document.getElementById('footer-section');
          if (footer) footer.scrollIntoView({ behavior: 'smooth' });
          return;
        }

        if (href && !href.startsWith('#')) {
          var initialUrl = window.location.href;
          setTimeout(function() {
            // If URL hasn't changed after 300ms, the SPA router likely failed.
            // Force a hard navigation.
            if (window.location.href === initialUrl) {
              console.log(PATCH_TAG, 'SPA routing failed, forcing navigation to:', href);
              window.location.href = href;
            }
          }, 300);
        }
      });
    });

    // Make "Let's talk" buttons work
    var talkBtns = document.querySelectorAll('#header-right-talk-btn, #header-menu-talk');
    talkBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        window.location.href = 'mailto:balaoldmaster@gmail.com';
      });
    });

    console.log(PATCH_TAG, 'Enhanced Menu & Navigation Patch active.');
  });

  console.log(PATCH_TAG, 'Initialized. Timeout:', FORCE_READY_TIMEOUT + 'ms');
})();
