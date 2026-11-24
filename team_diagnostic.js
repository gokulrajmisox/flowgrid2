// Team Section Runtime Diagnostic — add to about.html before </body>
// Logs the state of team DOM elements every 2 seconds while the page is active
(function() {
  'use strict';
  var LOG_TAG = '[TEAM-DIAG]';
  var interval = null;
  var runCount = 0;

  function checkTeamSection() {
    runCount++;
    if (runCount > 30) { clearInterval(interval); return; } // stop after 60s

    var faces = document.getElementById('about-who-team-faces');
    var stage = document.getElementById('about-who-team-stage');
    var portrait = document.getElementById('about-who-team-portrait');
    var editorialName = document.getElementById('about-who-team-editorial-name');
    var editorialRole = document.getElementById('about-who-team-editorial-role');
    var roster = document.getElementById('about-who-team-roster');
    var canvas = document.getElementById('canvas');
    var ui = document.getElementById('ui');

    if (!faces || !portrait) {
      console.warn(LOG_TAG, 'Missing DOM elements! faces:', !!faces, 'portrait:', !!portrait);
      return;
    }

    var facesStyle = window.getComputedStyle(faces);
    var stageStyle = stage ? window.getComputedStyle(stage) : null;
    var portraitStyle = window.getComputedStyle(portrait);
    var canvasStyle = canvas ? window.getComputedStyle(canvas) : null;
    var uiStyle = ui ? window.getComputedStyle(ui) : null;

    var facesRect = faces.getBoundingClientRect();
    var portraitRect = portrait.getBoundingClientRect();

    console.log(LOG_TAG, 'Run #' + runCount, {
      faces: {
        visibility: facesStyle.visibility,
        opacity: facesStyle.opacity,
        display: facesStyle.display,
        zIndex: facesStyle.zIndex,
        position: facesStyle.position,
        rect: { w: Math.round(facesRect.width), h: Math.round(facesRect.height), x: Math.round(facesRect.x), y: Math.round(facesRect.y) },
        inlineStyle: faces.getAttribute('style')
      },
      stage: stage ? {
        classes: stage.className,
        dataMember: stage.getAttribute('data-member'),
        display: stageStyle.display,
        visibility: stageStyle.visibility,
        rect: (function() { var r = stage.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })()
      } : 'MISSING',
      portrait: {
        src: portrait.src,
        complete: portrait.complete,
        naturalWidth: portrait.naturalWidth,
        naturalHeight: portrait.naturalHeight,
        visibility: portraitStyle.visibility,
        opacity: portraitStyle.opacity,
        display: portraitStyle.display,
        rect: { w: Math.round(portraitRect.width), h: Math.round(portraitRect.height) }
      },
      editorialName: editorialName ? editorialName.textContent : 'MISSING',
      editorialRole: editorialRole ? editorialRole.textContent : 'MISSING',
      rosterCount: roster ? roster.querySelectorAll('.about-who-team-roster-item').length : 0,
      canvas: canvas ? { zIndex: canvasStyle.zIndex, display: canvasStyle.display } : 'MISSING',
      ui: ui ? { zIndex: uiStyle.zIndex, position: uiStyle.position } : 'MISSING'
    });
  }

  // Wait for page to be ready
  function start() {
    console.log(LOG_TAG, 'Starting team section diagnostics...');
    // Initial check
    setTimeout(checkTeamSection, 1000);
    // Then every 2 seconds
    interval = setInterval(checkTeamSection, 2000);
  }

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', function() { setTimeout(start, 2000); });
  }
})();
