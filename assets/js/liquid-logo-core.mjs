/**
 * Pure math, poster logo geometry, theme contrast detection, and GLSL shaders
 * based on collidingScopes/liquid-logo adapted for the Flowgrid poster mark.
 */

export const LIQUID_LOGO_PRESET = Object.freeze({
  speed: 0.42,
  iterations: 14,
  scale: 2.35,
  dotFactor: 0.04,
  dotMultiplier: 0.36,
  vOffset: 4.6,
  intensityFactor: 0.09,
  expFactor: 0.45,
  redFactor: 0.85,
  greenFactor: 1.05,
  blueFactor: 0.92,
  colorShift: 0.65,
  noiseIntensity: 0.58,
  logoInteractStrength: 0.48,
  logoOpacity: 1.0,
  logoScale: 0.94,
});

export const POSTER_COLORS = Object.freeze({
  lime: '#9EE600',
  limeGlow: '#D8FF6B',
  obsidian: '#15171A',
  chromeLight: '#F3F6FC',
  chromeMid: '#B8C2D4',
});

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function parseCssRgb(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return null;
  const rgbMatch = colorStr.match(
    /rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i
  );
  if (rgbMatch) {
    return {
      r: clamp(Number(rgbMatch[1]), 0, 255),
      g: clamp(Number(rgbMatch[2]), 0, 255),
      b: clamp(Number(rgbMatch[3]), 0, 255),
      a: rgbMatch[4] === undefined ? 1 : clamp(Number(rgbMatch[4]), 0, 1),
    };
  }
  const hexMatch = colorStr.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  return null;
}

export function relativeLuminance(rgb) {
  if (!rgb) return 0;
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

/**
 * Determines whether the header logo currently sits on a dark background surface.
 * Uses class flags toggled by Astro's virtual scroll/route manager, mobile menu state,
 * and computed text/background luminance.
 */
export function detectDarkSurface({
  htmlClassList = [],
  headerClassList = [],
  computedTextColor = '',
  computedBgColor = '',
  viewportWidth = 1440,
} = {}) {
  const htmlClasses = Array.isArray(htmlClassList) ? htmlClassList : Array.from(htmlClassList);
  const headerClasses = Array.isArray(headerClassList)
    ? headerClassList
    : Array.from(headerClassList);

  if (headerClasses.includes('--menu-opened') && viewportWidth <= 812) {
    return true;
  }

  if (htmlClasses.includes('is-black-bg') || htmlClasses.includes('is-blue-bg')) {
    return true;
  }

  const textRgb = parseCssRgb(computedTextColor);
  if (textRgb && textRgb.a > 0.2) {
    return relativeLuminance(textRgb) > 0.52;
  }

  if (htmlClasses.includes('is-white-bg')) {
    return false;
  }

  const bgRgb = parseCssRgb(computedBgColor);
  if (bgRgb && bgRgb.a > 0.35) {
    return relativeLuminance(bgRgb) < 0.38;
  }

  return false;
}

/**
 * Computes geometry for the Flowgrid poster logo lockup inside a source texture canvas:
 * Left: 2x2 rounded-square grid emblem (top-left obsidian, top-right lime, bottom-left lime, bottom-right obsidian)
 * Right: bold uppercase "FLOWGRID" wordmark.
 */
export function computePosterLockupLayout(width, height) {
  const w = Math.max(160, Math.round(width));
  const h = Math.max(40, Math.round(height));
  const padX = Math.round(h * 0.12);
  const padY = Math.round(h * 0.12);
  const markSize = h - padY * 2;
  const gap = Math.max(2, Math.round(markSize * 0.13));
  const cellSize = (markSize - gap) / 2;
  const radius = Math.max(2, cellSize * 0.24);

  const cells = [
    { x: padX, y: padY, size: cellSize, radius, kind: 'obsidian' },
    { x: padX + cellSize + gap, y: padY, size: cellSize, radius, kind: 'lime' },
    { x: padX, y: padY + cellSize + gap, size: cellSize, radius, kind: 'lime' },
    {
      x: padX + cellSize + gap,
      y: padY + cellSize + gap,
      size: cellSize,
      radius,
      kind: 'obsidian',
    },
  ];

  const textStartX = padX + markSize + Math.round(h * 0.24);
  const maxTextWidth = Math.max(40, w - textStartX - padX);
  const fontSize = Math.round(h * 0.44);
  const letterSpacing = Math.max(2, Math.round(fontSize * 0.11));
  const centerY = Math.round(h * 0.52);

  return {
    width: w,
    height: h,
    padX,
    padY,
    markSize,
    gap,
    cellSize,
    radius,
    cells,
    text: {
      label: 'FLOWGRID',
      x: textStartX,
      y: centerY,
      maxWidth: maxTextWidth,
      fontSize,
      letterSpacing,
    },
  };
}

export function computeLiquidLogoRenderConfig({
  isSoftwareGl = false,
  reducedMotion = false,
  dpr = 1,
} = {}) {
  const safeDpr = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  if (reducedMotion) {
    return {
      animated: false,
      maxDpr: Math.min(2, safeDpr),
      targetFps: 0,
      iterations: 10,
    };
  }
  if (isSoftwareGl) {
    return {
      animated: true,
      maxDpr: 1,
      targetFps: 18,
      iterations: 9,
    };
  }
  return {
    animated: true,
    maxDpr: Math.min(2, safeDpr),
    targetFps: 60,
    iterations: LIQUID_LOGO_PRESET.iterations,
  };
}

export const LIQUID_LOGO_VERTEX_SHADER = `
attribute vec2 aVertexPosition;
void main() {
  gl_Position = vec4(aVertexPosition, 0.0, 1.0);
}
`;

/**
 * Fragment shader faithfully ported from collidingScopes/liquid-logo (fragment-shader.glsl):
 * - 3D simplex noise (snoise)
 * - Texture-space edge detection (detectEdges)
 * - Iterative cosine/sine liquid flow deflected by logo edges + tanh tone curve
 * - liquidMetalEffect specular rim + subtle grain
 * - Semantic zone shading for Flowgrid's poster emblem (2x2 obsidian + acid-lime) and wordmark
 *   with smooth dark/light header contrast adaptation (u_darkSurface).
 */
export function buildLiquidLogoFragmentShader() {
  return `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

// collidingScopes/liquid-logo parameters
uniform float u_speed;
uniform float u_iterations;
uniform float u_scale;
uniform float u_dotFactor;
uniform float u_vOffset;
uniform float u_intensityFactor;
uniform float u_expFactor;
uniform vec3 u_colorFactors;
uniform float u_colorShift;
uniform float u_dotMultiplier;
uniform float u_noiseIntensity;

// Logo & surface parameters
uniform sampler2D u_logoTexture;
uniform float u_logoOpacity;
uniform float u_logoScale;
uniform float u_logoAspectRatio;
uniform float u_logoInteractStrength;
uniform float u_darkSurface;
uniform float u_hover;
uniform vec2 u_pointer;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float detectEdges(vec2 uv, float threshold) {
  float dx = 1.25 / u_resolution.x;
  float dy = 1.25 / u_resolution.y;

  vec4 center = texture2D(u_logoTexture, uv);
  vec4 left   = texture2D(u_logoTexture, uv - vec2(dx, 0.0));
  vec4 right  = texture2D(u_logoTexture, uv + vec2(dx, 0.0));
  vec4 top    = texture2D(u_logoTexture, uv - vec2(0.0, dy));
  vec4 bottom = texture2D(u_logoTexture, uv + vec2(0.0, dy));

  float diff = length(center - left) + length(center - right) +
               length(center - top) + length(center - bottom);

  return smoothstep(0.0, threshold, diff);
}

vec4 liquidMetalEffect(vec4 color, float edge, float time) {
  float highlight = pow(0.5 + 0.5 * sin(time * 0.4 + edge * 6.0), 8.0) * edge;
  vec4 metallic = vec4(
    color.r + highlight * 0.36,
    color.g + highlight * 0.38,
    color.b + highlight * 0.42,
    color.a
  );
  return clamp(metallic, 0.0, 1.0);
}

void main() {
  vec2 r = u_resolution;
  vec2 FC = gl_FragCoord.xy;
  float time = u_time * (u_speed + u_hover * 0.25);

  vec2 uv = FC / r;
  vec2 logoUV = (uv - 0.5) / u_logoScale + 0.5;
  logoUV.y = 1.0 - logoUV.y;

  if (logoUV.x < 0.0 || logoUV.x > 1.0 || logoUV.y < 0.0 || logoUV.y > 1.0) {
    discard;
  }

  vec4 logoColor = texture2D(u_logoTexture, logoUV);
  float logoAlpha = logoColor.a;
  if (logoAlpha <= 0.04) {
    discard;
  }

  float edge = detectEdges(logoUV, 0.24) * u_logoInteractStrength;

  // Aspect-corrected normalized coordinates for coherent liquid waves across wide header lockup
  vec2 p = (FC * 2.0 - r) / r.y;
  float pointerDist = length(uv - u_pointer);
  float pointerWave = exp(-pointerDist * 6.0) * u_hover * 0.45;

  vec2 l = vec2(0.0);
  float dotP = dot(p, p);
  l.x += abs(u_dotFactor - dotP) * u_dotMultiplier;

  float edgeInfluence = edge * 14.0;
  vec2 v = p * (1.0 - l.x) / u_scale;
  v += vec2(sin(edge * 10.0), cos(edge * 8.0)) * edgeInfluence;

  float flowNoise = snoise(vec3(p * 1.85, time * 0.22)) * (u_noiseIntensity + pointerWave);
  v += vec2(flowNoise, flowNoise * 0.72);

  vec4 o = vec4(0.0);
  for (float i = 0.0; i < 16.0; i++) {
    if (i >= u_iterations) break;
    float idx = i + 1.0;
    vec2 offset = cos(v.yx * idx + vec2(0.0, idx) + time) / idx + u_vOffset;
    if (edge > 0.08) {
      offset *= 1.0 + edge * 3.2;
    }
    v += offset;
    o += (sin(vec4(v.x, v.y, v.y, v.x)) + 1.0) * abs(v.x - v.y) * u_intensityFactor;
  }

  if (u_colorShift > 0.0) {
    o = o.wxyz * u_colorShift + o * (1.0 - u_colorShift);
  }

  vec4 expPy = exp(p.y * vec4(u_colorFactors.x, u_colorFactors.y, u_colorFactors.z, 0.0));
  float expLx = exp(-u_expFactor * l.x);
  vec4 safeO = max(o, vec4(0.05));
  vec4 ratio = clamp(expPy * expLx / safeO, 0.0, 5.0);
  vec4 exp2x = exp(2.0 * ratio);
  o = (exp2x - 1.0) / (exp2x + 1.0);

  // Subtle film micro-grain
  float grain = random(FC / 1.5 + time * 0.0004) * 0.06 - 0.03;
  o = clamp(o + vec4(grain), 0.0, 1.0);
  o = liquidMetalEffect(o, edge, time);

  // Metallic wave luma extracted from liquid shader field
  float liquidLuma = clamp(dot(o.rgb, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
  float specularBand = smoothstep(0.42, 0.88, liquidLuma);
  float diagonalSweep = 0.5 + 0.5 * sin(uv.x * 13.0 - uv.y * 5.5 - time * 2.4 + flowNoise * 3.6);
  float chromeRibbon = smoothstep(0.62, 0.94, diagonalSweep);
  float chromeShimmer = mix(liquidLuma, diagonalSweep, 0.5);
  float rim = pow(clamp(edge * 1.55, 0.0, 1.0), 2.2);

  // Zone classification from encoded source canvas:
  // Wordmark -> high blue channel
  // Lime tile -> high green channel & low blue
  // Obsidian tile -> low green & low blue
  // Red channel carries the glossy 3D glass bevel & 45-deg specular reflection depth on tiles
  float isWordmark = smoothstep(0.55, 0.88, logoColor.b);
  float isLime = smoothstep(0.45, 0.82, logoColor.g) * (1.0 - isWordmark);
  float isObsidian = clamp(1.0 - isLime - isWordmark, 0.0, 1.0);
  float glossFactor = clamp(logoColor.r, 0.0, 1.0);
  float glassBevelRim = smoothstep(0.42, 0.92, glossFactor);
  float glassDiagSheen = smoothstep(0.14, 0.45, glossFactor);

  // 1) Glossy 3D Beveled Lime Glass Tiles (#9EE600 with 45-deg specular & chrome-lime rim)
  vec3 limeShadow = vec3(0.36, 0.64, 0.0);
  vec3 limeMid = vec3(0.62, 0.91, 0.0);
  vec3 limeGlow = vec3(0.84, 1.00, 0.26);
  vec3 limeSpec = vec3(0.96, 1.00, 0.72);
  vec3 limeShade = mix(limeShadow, limeMid, clamp(chromeShimmer * 0.55 + glassDiagSheen * 0.52 + 0.15, 0.0, 1.0));
  limeShade = mix(limeShade, limeGlow, glassDiagSheen * 0.36 + specularBand * 0.26 + chromeRibbon * 0.22);
  limeShade = mix(limeShade, limeSpec, clamp(glassBevelRim * 0.68 + rim * 0.32, 0.0, 1.0));

  // 2) Glossy 3D Beveled Obsidian Glass Tiles (deep black mirror + silver rim bevel + 45-deg glass sheen)
  vec3 obsDeep = mix(vec3(0.03, 0.035, 0.045), vec3(0.06, 0.07, 0.09), u_darkSurface);
  vec3 obsFace = mix(obsDeep, vec3(0.24, 0.27, 0.32), glassDiagSheen * 0.58 + chromeShimmer * 0.22);
  vec3 obsBevel = mix(vec3(0.62, 0.66, 0.74), vec3(0.92, 0.96, 1.00), glassBevelRim * 0.75 + chromeRibbon * 0.25);
  vec3 obsShade = mix(obsFace, obsBevel, clamp(glassBevelRim * 0.72 + rim * 0.28, 0.0, 1.0));

  // 3) Crisp Wide-Tracked Geometric FLOWGRID Wordmark (matches image.png on light/dark headers)
  vec3 wordLightBase = vec3(0.018, 0.020, 0.028);
  vec3 wordLightMid  = vec3(0.08, 0.095, 0.13);
  vec3 wordLightRim  = vec3(0.45, 0.52, 0.62);
  float wordHover = clamp(u_hover * 0.85 + 0.15, 0.0, 1.0);
  vec3 wordLight = mix(wordLightBase, wordLightMid, chromeShimmer * 0.22 * wordHover);
  wordLight = mix(wordLight, wordLightRim, clamp((chromeRibbon * 0.22 + specularBand * 0.14) * u_hover + rim * 0.16, 0.0, 1.0));

  vec3 wordDarkBase = vec3(0.91, 0.94, 0.98);
  vec3 wordDarkHigh = vec3(1.00, 1.00, 1.00);
  vec3 wordDark = mix(wordDarkBase, wordDarkHigh, clamp(chromeShimmer * 0.55 + chromeRibbon * 0.45, 0.0, 1.0));
  wordDark += rim * (0.12 + 0.18 * u_hover) * vec3(0.22, 0.30, 0.20);

  vec3 wordShade = mix(wordLight, wordDark, u_darkSurface);

  vec3 finalRgb = obsShade * isObsidian + limeShade * isLime + wordShade * isWordmark;
  finalRgb = clamp(finalRgb, 0.0, 1.0);

  gl_FragColor = vec4(finalRgb, clamp(logoAlpha * u_logoOpacity, 0.0, 1.0));
}
`;
}
