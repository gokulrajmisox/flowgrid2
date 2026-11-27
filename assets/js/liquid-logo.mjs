import {
  LIQUID_LOGO_PRESET,
  LIQUID_LOGO_VERTEX_SHADER,
  POSTER_COLORS,
  buildLiquidLogoFragmentShader,
  clamp,
  computeLiquidLogoRenderConfig,
  computePosterLockupLayout,
  detectDarkSurface,
} from './liquid-logo-core.mjs';

const TEXTURE_WIDTH = 760;
const TEXTURE_HEIGHT = 160;
const MOUNT_ATTR = 'data-liquid-logo-mounted';

function drawRoundedRectPath(ctx, x, y, size, radius) {
  const r = Math.min(radius, size / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + size - r, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + r);
  ctx.lineTo(x + size, y + size - r);
  ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
  ctx.lineTo(x + r, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTrackedWordmark(ctx, label, startX, centerY, baseFontSize, baseSpacing, maxWidth) {
  const chars = Array.from(label);
  const measureTotal = (fontSize, spacing) => {
    ctx.font = `700 ${fontSize}px Aeonik, "Aeonik-Bold", "Helvetica Neue", Arial, sans-serif`;
    let total = 0;
    const widths = [];
    for (let i = 0; i < chars.length; i += 1) {
      const w = ctx.measureText(chars[i]).width;
      widths.push(w);
      total += w;
      if (i < chars.length - 1) total += spacing;
    }
    return { total, widths };
  };

  let fontSize = baseFontSize;
  let spacing = baseSpacing;
  let metrics = measureTotal(fontSize, spacing);

  // Scale uniformly (never horizontally squish) if tracked string exceeds maxWidth
  if (metrics.total > maxWidth && metrics.total > 0) {
    const ratio = (maxWidth / metrics.total) * 0.985;
    fontSize = Math.max(18, Math.floor(fontSize * ratio));
    spacing = Math.max(1, Math.round(spacing * ratio));
    metrics = measureTotal(fontSize, spacing);
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let cursorX = startX;
  for (let i = 0; i < chars.length; i += 1) {
    ctx.fillText(chars[i], cursorX, centerY + 1);
    cursorX += metrics.widths[i] + spacing;
  }
}

function drawGlossyTileSemantic(ctx, cell) {
  const { x, y, size, radius, kind } = cell;
  const gCh = kind === 'lime' ? 255 : 15;
  const bCh = 20;

  ctx.save();
  drawRoundedRectPath(ctx, x, y, size, radius);
  ctx.clip();

  // Base tile fill (low red channel = deep glass body)
  ctx.fillStyle = `rgb(${kind === 'lime' ? 26 : 16}, ${gCh}, ${bCh})`;
  ctx.fillRect(x, y, size, size);

  // Upper-left 45-deg diagonal glossy glass reflection triangle
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.closePath();
  const diagGrad = ctx.createLinearGradient(x, y, x + size * 0.72, y + size * 0.72);
  diagGrad.addColorStop(0, `rgb(112, ${gCh}, ${bCh})`);
  diagGrad.addColorStop(1, `rgb(78, ${gCh}, ${bCh})`);
  ctx.fillStyle = diagGrad;
  ctx.fill();

  // Sharp 45-degree specular glass facet cut line matching Glossy Flowgrid Tech Logo.png
  ctx.beginPath();
  ctx.moveTo(x + size * 0.04, y + size * 0.96);
  ctx.lineTo(x + size * 0.96, y + size * 0.04);
  ctx.strokeStyle = `rgba(138, ${gCh}, ${bCh}, 0.85)`;
  ctx.lineWidth = Math.max(1.5, size * 0.036);
  ctx.stroke();

  // Outer-to-inner 3D rounded glass bevel rim (high red channel -> bright chrome / neon rim)
  drawRoundedRectPath(ctx, x + size * 0.045, y + size * 0.045, size * 0.91, Math.max(2, radius * 0.86));
  ctx.strokeStyle = `rgba(218, ${gCh}, ${bCh}, 0.92)`;
  ctx.lineWidth = Math.max(2, size * 0.105);
  ctx.stroke();

  // Crisp inner-edge specular bevel wire + warm/bright bottom-left rim glint
  drawRoundedRectPath(ctx, x + size * 0.06, y + size * 0.06, size * 0.88, Math.max(2, radius * 0.82));
  ctx.strokeStyle = `rgba(255, ${gCh}, ${bCh}, 0.95)`;
  ctx.lineWidth = Math.max(1.2, size * 0.042);
  ctx.stroke();

  ctx.restore();
}

function drawGlossyTile2D(ctx, cell, isDarkBg) {
  const { x, y, size, radius, kind } = cell;
  ctx.save();
  drawRoundedRectPath(ctx, x, y, size, radius);
  ctx.clip();

  if (kind === 'lime') {
    const baseGrad = ctx.createLinearGradient(x, y, x + size, y + size);
    baseGrad.addColorStop(0, '#D4FF4A');
    baseGrad.addColorStop(0.5, '#9EE600');
    baseGrad.addColorStop(1, '#5FA800');
    ctx.fillStyle = baseGrad;
  } else {
    const baseGrad = ctx.createLinearGradient(x, y, x + size, y + size);
    baseGrad.addColorStop(0, isDarkBg ? '#2B3038' : '#1F2329');
    baseGrad.addColorStop(0.55, '#0D0F12');
    baseGrad.addColorStop(1, '#040506');
    ctx.fillStyle = baseGrad;
  }
  ctx.fillRect(x, y, size, size);

  // 45-degree glossy glass facet
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.closePath();
  ctx.fillStyle = kind === 'lime' ? 'rgba(232, 255, 140, 0.34)' : 'rgba(255, 255, 255, 0.14)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + size * 0.04, y + size * 0.96);
  ctx.lineTo(x + size * 0.96, y + size * 0.04);
  ctx.strokeStyle = kind === 'lime' ? 'rgba(255, 255, 200, 0.6)' : 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = Math.max(1.2, size * 0.032);
  ctx.stroke();

  drawRoundedRectPath(ctx, x + size * 0.05, y + size * 0.05, size * 0.9, Math.max(2, radius * 0.85));
  ctx.strokeStyle = kind === 'lime' ? 'rgba(244, 255, 168, 0.9)' : 'rgba(220, 228, 240, 0.8)';
  ctx.lineWidth = Math.max(1.5, size * 0.065);
  ctx.stroke();

  ctx.restore();
}

function drawFlowgridMaskCanvas(targetCanvas, semanticMode = true, isDarkBg = false) {
  const layout = computePosterLockupLayout(targetCanvas.width, targetCanvas.height);
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, layout.width, layout.height);

  // Draw the 3D glossy beveled 2x2 Flowgrid emblem (top-left & bottom-right obsidian, top-right & bottom-left lime)
  for (const cell of layout.cells) {
    if (semanticMode) {
      drawGlossyTileSemantic(ctx, cell);
    } else {
      drawGlossyTile2D(ctx, cell, isDarkBg);
    }
  }

  // Draw crisp, wide-tracked, un-squished uppercase "FLOWGRID" typography matching image.png
  ctx.save();
  ctx.fillStyle = semanticMode ? '#F2F2FF' : isDarkBg ? '#FFFFFF' : '#090A0D';
  drawTrackedWordmark(
    ctx,
    layout.text.label,
    layout.text.x,
    layout.text.y,
    layout.text.fontSize,
    layout.text.letterSpacing,
    layout.text.maxWidth
  );
  ctx.restore();
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[LiquidLogo] Shader compile warning:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[LiquidLogo] Shader link warning:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function detectSoftwareRenderer(gl) {
  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
      if (/swiftshader|llvmpipe|softpipe|software/i.test(renderer)) {
        return true;
      }
    }
  } catch (_) {
    // Ignore extension access failures
  }
  return false;
}

function computeHeaderDarkState(logoEl) {
  const headerEl = document.getElementById('header');
  const htmlStyle = window.getComputedStyle(document.documentElement);
  const bodyStyle = document.body ? window.getComputedStyle(document.body) : null;
  const logoStyle = window.getComputedStyle(logoEl);

  const bgCandidate =
    bodyStyle && bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && bodyStyle.backgroundColor !== 'transparent'
      ? bodyStyle.backgroundColor
      : htmlStyle.backgroundColor;

  return detectDarkSurface({
    htmlClassList: document.documentElement.classList,
    headerClassList: headerEl ? headerEl.classList : [],
    computedTextColor: logoStyle.color,
    computedBgColor: bgCandidate,
    viewportWidth: window.innerWidth || 1440,
  });
}

function mountLiquidLogoOnAnchor(logoEl) {
  if (!logoEl || logoEl.getAttribute(MOUNT_ATTR) === 'true') return;
  logoEl.setAttribute(MOUNT_ATTR, 'true');
  logoEl.classList.add('fg-has-liquid-logo');

  const legacySvg = logoEl.querySelector('svg');
  if (legacySvg) {
    legacySvg.classList.add('fg-liquid-logo-legacy-svg');
    legacySvg.setAttribute('aria-hidden', 'true');
  }

  let srLabel = logoEl.querySelector('.fg-liquid-logo-sr');
  if (!srLabel) {
    srLabel = document.createElement('span');
    srLabel.className = 'fg-liquid-logo-sr';
    srLabel.textContent = 'FLOWGRID';
    logoEl.appendChild(srLabel);
  }

  let canvas = logoEl.querySelector('.fg-liquid-logo-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'fg-liquid-logo-canvas';
    canvas.setAttribute('data-testid', 'liquid-logo-canvas');
    canvas.setAttribute('aria-hidden', 'true');
    logoEl.appendChild(canvas);
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = TEXTURE_WIDTH;
  offscreen.height = TEXTURE_HEIGHT;

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: 'default',
  });

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;
  let targetDark = computeHeaderDarkState(logoEl) ? 1 : 0;
  let currentDark = targetDark;
  let targetHover = 0;
  let currentHover = 0;
  let pointerX = 0.5;
  let pointerY = 0.5;
  let rafId = null;
  let lastDrawTime = 0;
  let destroyed = false;

  const syncDatasetState = () => {
    logoEl.dataset.darkSurface = targetDark > 0.5 ? 'true' : 'false';
  };
  syncDatasetState();

  // Graceful 2D fallback if WebGL is unavailable
  if (!gl) {
    logoEl.dataset.renderer = '2d';
    const render2D = () => {
      const rect = logoEl.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(180, Math.round((rect.width || 168) * dpr));
      const h = Math.max(42, Math.round((rect.height || 38) * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      drawFlowgridMaskCanvas(canvas, false, targetDark > 0.5);
    };
    render2D();
    const obs2d = new MutationObserver(() => {
      targetDark = computeHeaderDarkState(logoEl) ? 1 : 0;
      syncDatasetState();
      render2D();
    });
    obs2d.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    if (document.getElementById('header')) {
      obs2d.observe(document.getElementById('header'), { attributes: true, attributeFilter: ['class', 'style'] });
    }
    window.addEventListener('resize', render2D);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(render2D);
    }
    return;
  }

  const program = createProgram(gl, LIQUID_LOGO_VERTEX_SHADER, buildLiquidLogoFragmentShader());
  if (!program) {
    logoEl.dataset.renderer = '2d';
    drawFlowgridMaskCanvas(canvas, false, targetDark > 0.5);
    return;
  }

  logoEl.dataset.renderer = 'webgl';
  const isSoftwareGl = detectSoftwareRenderer(gl);

  const uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    time: gl.getUniformLocation(program, 'u_time'),
    speed: gl.getUniformLocation(program, 'u_speed'),
    iterations: gl.getUniformLocation(program, 'u_iterations'),
    scale: gl.getUniformLocation(program, 'u_scale'),
    dotFactor: gl.getUniformLocation(program, 'u_dotFactor'),
    vOffset: gl.getUniformLocation(program, 'u_vOffset'),
    intensityFactor: gl.getUniformLocation(program, 'u_intensityFactor'),
    expFactor: gl.getUniformLocation(program, 'u_expFactor'),
    colorFactors: gl.getUniformLocation(program, 'u_colorFactors'),
    colorShift: gl.getUniformLocation(program, 'u_colorShift'),
    dotMultiplier: gl.getUniformLocation(program, 'u_dotMultiplier'),
    noiseIntensity: gl.getUniformLocation(program, 'u_noiseIntensity'),
    logoTexture: gl.getUniformLocation(program, 'u_logoTexture'),
    logoOpacity: gl.getUniformLocation(program, 'u_logoOpacity'),
    logoScale: gl.getUniformLocation(program, 'u_logoScale'),
    logoAspectRatio: gl.getUniformLocation(program, 'u_logoAspectRatio'),
    logoInteractStrength: gl.getUniformLocation(program, 'u_logoInteractStrength'),
    darkSurface: gl.getUniformLocation(program, 'u_darkSurface'),
    hover: gl.getUniformLocation(program, 'u_hover'),
    pointer: gl.getUniformLocation(program, 'u_pointer'),
  };

  const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const texture = gl.createTexture();
  const uploadMaskTexture = () => {
    drawFlowgridMaskCanvas(offscreen, true, false);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreen);
  };

  uploadMaskTexture();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (destroyed) return;
      uploadMaskTexture();
      drawFrame(performance.now());
    });
  }

  let renderConfig = computeLiquidLogoRenderConfig({
    isSoftwareGl,
    reducedMotion,
    dpr: window.devicePixelRatio || 1,
  });

  const resizeCanvas = () => {
    const rect = logoEl.getBoundingClientRect();
    const dpr = Math.min(renderConfig.maxDpr, window.devicePixelRatio || 1);
    const w = Math.max(180, Math.round((rect.width || 168) * dpr));
    const h = Math.max(42, Math.round((rect.height || 38) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  resizeCanvas();

  const startMs = performance.now();

  const drawFrame = (now) => {
    if (destroyed) return;
    if (gl.isContextLost()) return;

    resizeCanvas();

    currentDark += (targetDark - currentDark) * (reducedMotion ? 1 : 0.38);
    currentHover += (targetHover - currentHover) * 0.16;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posLoc);

    const elapsedSec = reducedMotion ? 1.35 : (now - startMs) / 1000;

    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, elapsedSec);
    gl.uniform1f(uniforms.speed, LIQUID_LOGO_PRESET.speed);
    gl.uniform1f(uniforms.iterations, renderConfig.iterations);
    gl.uniform1f(uniforms.scale, LIQUID_LOGO_PRESET.scale);
    gl.uniform1f(uniforms.dotFactor, LIQUID_LOGO_PRESET.dotFactor);
    gl.uniform1f(uniforms.vOffset, LIQUID_LOGO_PRESET.vOffset);
    gl.uniform1f(uniforms.intensityFactor, LIQUID_LOGO_PRESET.intensityFactor);
    gl.uniform1f(uniforms.expFactor, LIQUID_LOGO_PRESET.expFactor);
    gl.uniform3f(
      uniforms.colorFactors,
      LIQUID_LOGO_PRESET.redFactor,
      LIQUID_LOGO_PRESET.greenFactor,
      LIQUID_LOGO_PRESET.blueFactor
    );
    gl.uniform1f(uniforms.colorShift, LIQUID_LOGO_PRESET.colorShift);
    gl.uniform1f(uniforms.dotMultiplier, LIQUID_LOGO_PRESET.dotMultiplier);
    gl.uniform1f(uniforms.noiseIntensity, LIQUID_LOGO_PRESET.noiseIntensity);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.logoTexture, 0);
    gl.uniform1f(uniforms.logoOpacity, LIQUID_LOGO_PRESET.logoOpacity);
    gl.uniform1f(uniforms.logoScale, LIQUID_LOGO_PRESET.logoScale);
    gl.uniform1f(uniforms.logoAspectRatio, TEXTURE_WIDTH / TEXTURE_HEIGHT);
    gl.uniform1f(uniforms.logoInteractStrength, LIQUID_LOGO_PRESET.logoInteractStrength);
    gl.uniform1f(uniforms.darkSurface, currentDark);
    gl.uniform1f(uniforms.hover, currentHover);
    gl.uniform2f(uniforms.pointer, pointerX, pointerY);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  let frameTick = 0;

  const loop = (now) => {
    if (destroyed) return;
    if (!renderConfig.animated) {
      drawFrame(now);
      rafId = null;
      return;
    }

    const minInterval = renderConfig.targetFps > 0 ? 1000 / renderConfig.targetFps : 0;
    if (!document.hidden && now - lastDrawTime >= minInterval) {
      lastDrawTime = now;
      frameTick += 1;
      if (frameTick % 12 === 0) {
        const nextDark = computeHeaderDarkState(logoEl) ? 1 : 0;
        if (nextDark !== targetDark) {
          targetDark = nextDark;
          syncDatasetState();
        }
      }
      drawFrame(now);
    }
    rafId = window.requestAnimationFrame(loop);
  };

  const startLoop = () => {
    if (rafId !== null) return;
    if (!renderConfig.animated) {
      drawFrame(performance.now());
      return;
    }
    rafId = window.requestAnimationFrame(loop);
  };

  let transitionTimer = null;
  const refreshTheme = () => {
    const nextDark = computeHeaderDarkState(logoEl) ? 1 : 0;
    if (nextDark !== targetDark) {
      targetDark = nextDark;
      syncDatasetState();
      if (!renderConfig.animated) {
        drawFrame(performance.now());
      }
    }
    if (transitionTimer) window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => {
      if (destroyed) return;
      const settledDark = computeHeaderDarkState(logoEl) ? 1 : 0;
      if (settledDark !== targetDark) {
        targetDark = settledDark;
        syncDatasetState();
        if (!renderConfig.animated) {
          drawFrame(performance.now());
        }
      }
    }, 520);
  };

  const observer = new MutationObserver(refreshTheme);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  });
  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
  }
  const headerEl = document.getElementById('header');
  if (headerEl) {
    observer.observe(headerEl, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
  }
  observer.observe(logoEl, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  });

  logoEl.addEventListener('pointerenter', () => {
    targetHover = 1;
  });
  logoEl.addEventListener('pointerleave', () => {
    targetHover = 0;
  });
  logoEl.addEventListener('pointermove', (e) => {
    const rect = logoEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      pointerX = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      pointerY = clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1);
    }
  });

  window.addEventListener('resize', () => {
    refreshTheme();
    resizeCanvas();
    if (!renderConfig.animated) {
      drawFrame(performance.now());
    }
  });

  window.addEventListener('popstate', refreshTheme);

  const onMotionChange = (e) => {
    reducedMotion = e.matches;
    renderConfig = computeLiquidLogoRenderConfig({
      isSoftwareGl,
      reducedMotion,
      dpr: window.devicePixelRatio || 1,
    });
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    startLoop();
  };
  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', onMotionChange);
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  });
  canvas.addEventListener('webglcontextrestored', () => {
    uploadMaskTexture();
    startLoop();
  });

  window.addEventListener(
    'pagehide',
    () => {
      destroyed = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      observer.disconnect();
    },
    { once: true }
  );

  startLoop();
}

export function initFlowgridLiquidLogo() {
  const logoEl = document.getElementById('header-logo');
  if (logoEl) {
    mountLiquidLogoOnAnchor(logoEl);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFlowgridLiquidLogo, { once: true });
} else {
  initFlowgridLiquidLogo();
}
