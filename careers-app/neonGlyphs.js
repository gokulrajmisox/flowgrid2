import { detectSoftwareWebGL } from './utils/utils.js';
import {
  ATLAS_CELL,
  ATLAS_COLUMNS,
  BLOOM_LEVELS,
  CLICK_SECONDS,
  INTRO_SECONDS,
  MAX_CLICKS,
  MAX_COLORS,
  MAX_RENDER_DIM,
  MAX_STEPS,
  normalizeNeonGlyphOptions,
  planeBasis,
  projectToPlane,
} from './neonGlyphsMath.js';

const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const SCENE = `#version 300 es
precision highp float;
uniform sampler2D uAtlas;
uniform vec2 uRes;
uniform vec2 uAtlasGrid;
uniform float uCount;
uniform float uCell;
uniform mat3 uBasis;
uniform float uFocal;
uniform float uDepth;
uniform float uTime;
uniform float uGlyphTime;
uniform float uDensity;
uniform float uFlicker;
uniform float uBrightness;
uniform float uSeed;
uniform vec3 uColors[${MAX_COLORS}];
uniform float uColorCount;
uniform vec4 uHover;
uniform vec4 uClicks[${MAX_CLICKS}];
uniform float uIntro;
out vec4 outColor;

float h21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float h31(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

vec3 pick(float h) {
  return uColors[int(min(floor(h * uColorCount), uColorCount - 1.0))];
}

float glyph(float id, vec2 local, float lod) {
  vec2 q = (floor(clamp(local, 0.0, 0.999) * 14.0) + 0.5) / 14.0;
  float index = min(floor(id * uCount), uCount - 1.0);
  float column = mod(index, uAtlasGrid.x);
  float row = floor(index / uAtlasGrid.x);
  vec2 uv = vec2((column + q.x) / uAtlasGrid.x, (row + 1.0 - q.y) / uAtlasGrid.y);
  return textureLod(uAtlas, uv, lod).a;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  vec3 rd = normalize(vec3(p, -uFocal));
  vec3 U = uBasis[0];
  vec3 V = uBasis[1];
  vec3 N = uBasis[2];
  vec3 C = vec3(0.0, 0.0, -uFocal);
  float half_ = 0.5 * uDepth * uCell;
  float dn = dot(rd, N);
  float cn = dot(C, N);
  float tNear = 0.0;
  float tFar = 40.0 * uFocal;
  if (abs(dn) > 1e-5) {
    float ta = (cn - half_) / dn;
    float tb = (cn + half_) / dn;
    tNear = max(min(ta, tb), 0.0);
    tFar = max(ta, tb);
  } else if (abs(cn) > half_) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  if (tFar <= tNear) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float stepLen = 0.5 * uCell;
  float count = min(ceil((tFar - tNear) / stepLen), ${MAX_STEPS.toFixed(1)});
  vec3 right = normalize(cross(rd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, rd);
  float jitter = fract(52.9829189 * fract(dot(frag, vec2(0.06711056, 0.00583715))));
  float t = tNear + stepLen * jitter;
  vec3 P0 = rd * t - C;
  vec3 L = vec3(dot(P0, U), dot(P0, V), dot(P0, N)) / uCell;
  vec3 dL = vec3(dot(rd, U), dot(rd, V), dot(rd, N)) * 0.5;
  float depthScale = uFocal * uRes.y * uCell / max(-rd.z, 0.05);
  vec3 flow = vec3(0.9 * sin(uTime * 0.05), uTime * 0.22, 0.6 * sin(uTime * 0.037));
  vec3 accum = vec3(0.0);

  for (int i = 0; i < ${MAX_STEPS}; i++) {
    if (float(i) >= count) break;
    float tt = t + float(i) * stepLen;
    float layer = floor(L.z);
    vec3 Lp = L + vec3(h21(vec2(layer, 5.3) + uSeed), h21(vec2(layer, 8.1) + uSeed), 0.0) - flow;
    vec3 cell = floor(Lp);
    float appear = clamp((uIntro - abs(cell.x) * 0.012 - abs(cell.y) * 0.016 - h31(cell + uSeed + 19.0) * 0.7) / 0.35, 0.0, 1.0);
    if (appear > 0.0) {
      float cycle = uTime * (0.06 + 0.07 * h31(cell + uSeed + 2.7)) + h31(cell + uSeed + 4.9);
      float slot = floor(cycle);
      float phase = cycle - slot;
      vec3 id = cell + slot * 31.0;
      bool present = h31(id + uSeed + 13.7) < uDensity;
      float power = present ? (1.0 + 1.6 * h31(id + uSeed + 9.0)) * smoothstep(0.0, 0.2, phase) * (1.0 - smoothstep(0.7, 1.0, phase)) : 0.0;
      vec3 color = pick(h31(id + uSeed + 3.0));
      float rate = 4.0;
      if (uHover.w > 0.001) {
        vec2 hv = (cell.xy + 0.5 - uHover.xy) / uHover.z;
        float w = exp(-dot(hv, hv)) * uHover.w;
        if (present) {
          power *= 1.0 + 1.2 * w;
          rate += 10.0 * w;
        } else if (w > 0.02 && h31(cell + uSeed + 63.0) < w * 0.25) {
          present = true;
          power = 1.4 * w;
          rate = 12.0;
        }
      }
      for (int c = 0; c < ${MAX_CLICKS}; c++) {
        vec4 click = uClicks[c];
        if (click.w <= 0.0) continue;
        float reach = length(cell.xy + 0.5 - click.xy) - click.z * 16.0;
        float fade = 1.0 - click.z / ${CLICK_SECONDS.toFixed(1)};
        float ring = exp(-reach * reach / 5.0) * fade * fade;
        if (ring < 0.03) continue;
        if (present) {
          power *= 1.0 + 2.5 * ring;
          color = mix(color, vec3(1.0), 0.4 * ring);
          rate = max(rate, 16.0);
        } else if (h31(cell + uSeed + float(c) * 5.1 + 71.0) < ring * 0.5) {
          present = true;
          power = 2.0 * ring;
          color = mix(color, vec3(1.0), 0.3);
          rate = 16.0;
        }
      }
      if (present && power > 0.001) {
        vec3 bob = 0.1 * sin(uTime * (0.4 + 0.5 * vec3(h31(id + 1.1), h31(id + 2.2), h31(id + 3.3))) + 6.2831 * vec3(h31(id + 4.4), h31(id + 5.5), h31(id + 6.6)));
        vec3 offset = (Lp - cell - 0.5 - bob) / 0.8;
        vec3 world = U * offset.x + V * offset.y + N * offset.z;
        vec2 local = vec2(dot(world, right), dot(world, up)) + 0.5;
        if (local.x > 0.0 && local.x < 1.0 && local.y > 0.0 && local.y < 1.0) {
          float pixels = depthScale / tt * 0.8;
          float lod = clamp(log2(64.0 / max(pixels, 1.0)), 0.25, 1.45);
          float seedHash = h31(id + uSeed + 11.0);
          float charId = h31(id * 1.31 + floor(uGlyphTime * rate + seedHash * 9.0) * 17.17 + uSeed);
          float ink = glyph(charId, local, lod);
          float cover = smoothstep(0.24, 0.48, ink) * ink;
          if (cover > 0.0) {
            float beat = floor(uTime * 3.5 + seedHash * 3.0);
            if (h31(id * 0.73 + beat * 9.13 + uSeed) > 1.0 - uFlicker) {
              power *= 5.5;
              color = mix(color, vec3(1.0), 0.4);
            }
            color = mix(color, pick(fract(seedHash + 0.37 + uTime * 0.05 + Lp.y * 0.012)), 0.25);
            float fog = exp(-tt / uCell * 0.0086);
            accum += color * cover * power * appear * fog * smoothstep(1.5, 4.0, pixels);
          }
        }
      }
    }
    L += dL;
  }

  outColor = vec4(accum * 0.34 * uBrightness, 1.0);
}`;

const DOWN = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy * 2.0 * uTexel;
  vec3 c = texture(uSource, uv + vec2(-0.5, -0.5) * uTexel).rgb;
  c += texture(uSource, uv + vec2(0.5, -0.5) * uTexel).rgb;
  c += texture(uSource, uv + vec2(-0.5, 0.5) * uTexel).rgb;
  c += texture(uSource, uv + vec2(0.5, 0.5) * uTexel).rgb;
  outColor = vec4(min(c * 0.25, vec3(2.0)), 1.0);
}`;

const BLUR = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
uniform vec2 uSize;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec3 c = texture(uSource, uv).rgb * 0.2270270;
  c += texture(uSource, uv + uStep * 1.3846154).rgb * 0.3162162;
  c += texture(uSource, uv - uStep * 1.3846154).rgb * 0.3162162;
  c += texture(uSource, uv + uStep * 3.2307692).rgb * 0.0702703;
  c += texture(uSource, uv - uStep * 3.2307692).rgb * 0.0702703;
  outColor = vec4(c, 1.0);
}`;

const UP = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uSize;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  outColor = vec4(texture(uBase, uv).rgb + texture(uSource, uv).rgb * 0.8, 1.0);
}`;

const ACCUM = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform float uGlow;
uniform float uBlend;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 bloom = texture(uBloom, uv).rgb;
  vec3 current = texture(uScene, uv).rgb + bloom * uGlow;
  vec3 previous = texture(uPrev, uv).rgb;
  outColor = vec4(mix(previous, current, uBlend), 1.0);
}`;

const COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec2 uRes;
uniform float uFade;
uniform float uAberration;
uniform float uLightMode;
uniform float uOpacity;
out vec4 outColor;

float feather(float x, float w) {
  if (w <= 0.0) return 1.0;
  float t = clamp(min(x, 1.0 - x) / w, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float mask(vec2 uv) {
  return feather(uv.x, uFade * 0.34) * feather(uv.y, uFade * 0.44);
}

vec3 lightAt(vec2 uv) {
  return texture(uScene, uv).rgb;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float m = mask(uv);
  vec2 dir = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float edge = 1.0 - m;
  vec2 shift = dir * uAberration * (0.004 + 0.05 * edge * edge) / vec2(uRes.x / uRes.y, 1.0);
  vec2 ur = uv + shift;
  vec2 ub = uv - shift;
  vec3 c = vec3(lightAt(ur).r * mask(ur), lightAt(uv).g * m, lightAt(ub).b * mask(ub));
  float peak = max(max(c.r, c.g), c.b);
  if (peak <= 0.0005) {
    outColor = vec4(0.0);
    return;
  }
  float mapped = peak < 0.75 ? peak : 0.75 + 0.25 * (1.0 - exp(-(peak - 0.75) / 0.25));
  vec3 col = c * (mapped / peak);
  col = mix(col, vec3(mapped), smoothstep(0.9, 2.6, peak) * 0.55);
  float alpha;
  if (uLightMode > 0.5) {
    vec3 hue = c / peak;
    float lum = dot(hue, vec3(0.2126, 0.7152, 0.0722));
    hue = clamp(mix(vec3(lum), hue, 1.7), 0.0, 1.0);
    lum = dot(hue, vec3(0.2126, 0.7152, 0.0722));
    vec3 ink = clamp(hue * (0.46 / max(lum, 0.2)), 0.0, 1.0);
    float lift = max(peak - 0.14, 0.0) / 0.86;
    alpha = (1.0 - exp(-3.2 * lift)) * 0.95;
    col = ink * alpha;
  } else {
    alpha = max(max(col.r, col.g), col.b);
  }
  outColor = vec4(col, alpha) * uOpacity;
}`;

const SCENE_UNIFORMS = [
  'uAtlas',
  'uRes',
  'uAtlasGrid',
  'uCount',
  'uCell',
  'uBasis',
  'uFocal',
  'uDepth',
  'uTime',
  'uGlyphTime',
  'uDensity',
  'uFlicker',
  'uBrightness',
  'uSeed',
  'uColors',
  'uColorCount',
  'uHover',
  'uClicks',
  'uIntro',
];

const PROGRAMS = {
  scene: { source: SCENE, uniforms: SCENE_UNIFORMS },
  down: { source: DOWN, uniforms: ['uSource', 'uTexel'] },
  blur: { source: BLUR, uniforms: ['uSource', 'uStep', 'uSize'] },
  up: { source: UP, uniforms: ['uSource', 'uBase', 'uSize'] },
  accum: { source: ACCUM, uniforms: ['uScene', 'uBloom', 'uPrev', 'uRes', 'uGlow', 'uBlend'] },
  composite: {
    source: COMPOSITE,
    uniforms: ['uScene', 'uRes', 'uFade', 'uAberration', 'uLightMode', 'uOpacity'],
  },
};

const NAMES = Object.keys(PROGRAMS);

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function startProgram(gl, source) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, source);
  const program = vertex && fragment ? gl.createProgram() : null;
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return { program, vertex, fragment };
}

function finishProgram(gl, job, names) {
  const { program, vertex, fragment } = job;
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked && !gl.isContextLost()) {
    const broken = [vertex, fragment].filter(
      (shader) => !gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    );
    if (broken.length) broken.forEach((shader) => console.error(gl.getShaderInfoLog(shader)));
    else console.error(gl.getProgramInfoLog(program));
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!linked) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms = {};
  for (const name of names) uniforms[name] = gl.getUniformLocation(program, name);
  return { program, uniforms };
}

function buildAtlas(gl, characters, fontFamily) {
  const list = [...new Set([...characters].filter((char) => char.trim()))];
  if (!list.length) list.push('#');
  const columns = Math.min(ATLAS_COLUMNS, list.length);
  const rows = Math.ceil(list.length / columns);
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_CELL * columns;
  canvas.height = ATLAS_CELL * rows;
  const context = canvas.getContext('2d');
  if (context) {
    context.font = `700 ${Math.round(ATLAS_CELL * 0.78)}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff';
    list.forEach((char, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      context.fillText(
        char,
        column * ATLAS_CELL + ATLAS_CELL / 2,
        row * ATLAS_CELL + ATLAS_CELL / 2 + 2
      );
    });
  }
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { texture, count: list.length, grid: [columns, rows] };
}

/**
 * Shared single-WebGL2-context engine serving all NeonGlyphs opportunity mounts
 * without exhausting Chromium/Safari WebGL context limits.
 */
class NeonGlyphsEngine {
  isSoftwareGl = detectSoftwareWebGL();
  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  instances = new Set();
  scratchSets = new Map();
  atlasCache = new Map();
  jobs = {};
  programs = {};
  broken = false;
  lost = false;
  raf = 0;
  lastTick = 0;
  colorData = new Float32Array(MAX_COLORS * 3);
  clickData = new Float32Array(MAX_CLICKS * 4);

  constructor() {
    this.canvas = document.createElement('canvas');
    this.gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'default',
    });
    if (!this.gl) {
      this.broken = true;
      return;
    }

    this.parallel = this.gl.getExtension('KHR_parallel_shader_compile');
    this.floatTargets = Boolean(this.gl.getExtension('EXT_color_buffer_float'));

    for (const name of NAMES) {
      const job = startProgram(this.gl, PROGRAMS[name].source);
      if (!job) this.broken = true;
      else this.jobs[name] = job;
    }
    if (!this.parallel) this.finishAll();

    this.vao = this.gl.createVertexArray();
    this.probe = document.createElement('canvas');
    this.probe.width = 1;
    this.probe.height = 1;
    this.probeContext = this.probe.getContext('2d', { willReadFrequently: true });

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.wake();
    });
    document.addEventListener('visibilitychange', () => {
      this.lastTick = 0;
      this.wake();
    });
  }

  pending() {
    return NAMES.filter((name) => this.jobs[name]);
  }

  compiling() {
    return NAMES.some((name) => {
      const job = this.jobs[name];
      return Boolean(
        job &&
          this.parallel &&
          !this.gl.getProgramParameter(job.program, this.parallel.COMPLETION_STATUS_KHR)
      );
    });
  }

  finishAll() {
    for (const name of NAMES) {
      const job = this.jobs[name];
      if (!job) continue;
      delete this.jobs[name];
      const done = finishProgram(this.gl, job, PROGRAMS[name].uniforms);
      if (done) this.programs[name] = done;
      else this.broken = true;
    }
    return !this.broken;
  }

  ready() {
    if (this.broken || !this.gl || this.lost) return false;
    const waiting = this.pending();
    if (!waiting.length) return true;
    if (!this.parallel || this.compiling()) return false;
    return this.finishAll();
  }

  toRgb(value) {
    if (!this.probeContext || !value) return [1, 1, 1];
    const css = /^[0-9a-f]{3,8}$/i.test(value) ? `#${value}` : value;
    this.probeContext.clearRect(0, 0, 1, 1);
    this.probeContext.fillStyle = '#000000';
    this.probeContext.fillStyle = css;
    this.probeContext.fillRect(0, 0, 1, 1);
    const [r, g, b] = this.probeContext.getImageData(0, 0, 1, 1).data;
    return [r / 255, g / 255, b / 255];
  }

  getAtlas(fontFamily, characters) {
    const key = `${fontFamily}|${characters}`;
    if (this.atlasCache.has(key)) return this.atlasCache.get(key);
    const atlas = buildAtlas(this.gl, characters, fontFamily);
    this.atlasCache.set(key, atlas);
    document.fonts?.load?.(`500 64px ${fontFamily}`, characters).then(
      () => {
        if (!this.gl || this.gl.isContextLost()) return;
        const old = this.atlasCache.get(key);
        if (old) this.gl.deleteTexture(old.texture);
        this.atlasCache.set(key, buildAtlas(this.gl, characters, fontFamily));
        this.wake();
      },
      () => {}
    );
    return atlas;
  }

  makeTarget(width, height) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.floatTargets ? gl.RGBA16F : gl.RGBA8,
      width,
      height,
      0,
      gl.RGBA,
      this.floatTargets ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture, framebuffer, width, height };
  }

  freeTarget(target) {
    if (!target || !this.gl || this.gl.isContextLost()) return;
    this.gl.deleteTexture(target.texture);
    this.gl.deleteFramebuffer(target.framebuffer);
  }

  getScratchSet(sw, sh) {
    const key = `${sw}x${sh}`;
    if (this.scratchSets.has(key)) return this.scratchSets.get(key);

    // Keep scratch cache compact if cards resize across breakpoints
    if (this.scratchSets.size >= 4) {
      const oldestKey = this.scratchSets.keys().next().value;
      const oldest = this.scratchSets.get(oldestKey);
      this.freeTarget(oldest.scene);
      oldest.levels.forEach((lvl) => {
        this.freeTarget(lvl.a);
        this.freeTarget(lvl.b);
      });
      this.scratchSets.delete(oldestKey);
    }

    const levels = [];
    const activeLevels = this.isSoftwareGl ? 3 : BLOOM_LEVELS;
    let lw = sw;
    let lh = sh;
    for (let i = 0; i < activeLevels; i++) {
      lw = Math.max(1, Math.round(lw / 2));
      lh = Math.max(1, Math.round(lh / 2));
      levels.push({ a: this.makeTarget(lw, lh), b: this.makeTarget(lw, lh) });
    }
    const set = { scene: this.makeTarget(sw, sh), levels };
    this.scratchSets.set(key, set);
    return set;
  }

  draw(program, target, width, height) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(program.program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  bind(unit, texture) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }

  register(instance) {
    this.instances.add(instance);
    this.wake();
  }

  unregister(instance) {
    this.instances.delete(instance);
    if (instance.trailTargets) {
      instance.trailTargets.forEach((t) => this.freeTarget(t));
      instance.trailTargets = null;
    }
  }

  renderInstance(instance, dt) {
    const gl = this.gl;
    const { scene, down, blur, up, accum, composite } = this.programs;
    if (!scene || !down || !blur || !up || !accum || !composite || this.broken || this.lost) {
      return;
    }

    const s = instance.settings;
    const w = instance.displayCanvas.width;
    const h = instance.displayCanvas.height;
    if (w < 1 || h < 1) return;

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    const paletteKey = s.colors.join('|');
    if (paletteKey !== instance.paletteKey) {
      instance.paletteKey = paletteKey;
      instance.colorData.fill(0);
      s.colors.forEach((color, idx) => instance.colorData.set(this.toRgb(color), idx * 3));
      instance.colorCount = s.colors.length;
    }

    const atlas = this.getAtlas(s.fontFamily, s.characters);
    if (!atlas) return;

    const quality = this.isSoftwareGl ? 0.78 : Math.min(1, 1.5 / Math.max(instance.ratio, 1));
    const sw = Math.max(1, Math.round(w * quality));
    const sh = Math.max(1, Math.round(h * quality));
    const scratch = this.getScratchSet(sw, sh);

    if (!instance.trailTargets || instance.trailWidth !== w || instance.trailHeight !== h) {
      if (instance.trailTargets) instance.trailTargets.forEach((t) => this.freeTarget(t));
      instance.trailTargets = [this.makeTarget(w, h), this.makeTarget(w, h)];
      instance.trailWidth = w;
      instance.trailHeight = h;
      instance.flip = 0;
      instance.fresh = true;
    }

    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.vao);

    instance.syncAngles();
    const u = scene.uniforms;
    gl.useProgram(scene.program);
    this.bind(0, atlas.texture);
    gl.uniform1i(u.uAtlas, 0);
    gl.uniform2f(u.uRes, scratch.scene.width, scratch.scene.height);
    gl.uniform2f(u.uAtlasGrid, atlas.grid[0], atlas.grid[1]);
    gl.uniform1f(u.uCount, atlas.count);
    const cell = s.cellSize / instance.height;
    gl.uniform1f(u.uCell, cell);
    const [U, V, N] = planeBasis(instance.angles.tilt, instance.angles.turn, s.rotation);
    gl.uniformMatrix3fv(u.uBasis, false, [...U, ...V, ...N]);
    gl.uniform1f(u.uFocal, 1 / Math.tan(((s.perspective * Math.PI) / 180) / 2));
    gl.uniform1f(u.uDepth, s.depth);
    gl.uniform1f(u.uTime, instance.time);
    gl.uniform1f(u.uGlyphTime, instance.glyphTime);
    gl.uniform1f(u.uDensity, s.density);
    gl.uniform1f(u.uFlicker, s.flicker * 0.07);
    gl.uniform1f(u.uBrightness, s.brightness);
    gl.uniform1f(u.uSeed, (s.variation % 1000) * 13.37);
    gl.uniform3fv(u.uColors, instance.colorData);
    gl.uniform1f(u.uColorCount, instance.colorCount);
    gl.uniform4f(u.uHover, instance.hover.x, instance.hover.y, 5.5, instance.hover.presence);
    this.clickData.fill(0);
    instance.clicks.forEach((click, idx) => {
      this.clickData[idx * 4] = click.x;
      this.clickData[idx * 4 + 1] = click.y;
      this.clickData[idx * 4 + 2] = instance.clock - click.start;
      this.clickData[idx * 4 + 3] = 1;
    });
    gl.uniform4fv(u.uClicks, this.clickData);
    gl.uniform1f(u.uIntro, instance.intro);
    this.draw(scene, scratch.scene, scratch.scene.width, scratch.scene.height);

    let source = scratch.scene;
    scratch.levels.forEach((level) => {
      gl.useProgram(down.program);
      this.bind(0, source.texture);
      gl.uniform1i(down.uniforms.uSource, 0);
      gl.uniform2f(down.uniforms.uTexel, 1 / source.width, 1 / source.height);
      this.draw(down, level.a, level.a.width, level.a.height);

      gl.useProgram(blur.program);
      gl.uniform1i(blur.uniforms.uSource, 0);
      gl.uniform2f(blur.uniforms.uSize, level.a.width, level.a.height);
      this.bind(0, level.a.texture);
      gl.uniform2f(blur.uniforms.uStep, 1 / level.a.width, 0);
      this.draw(blur, level.b, level.a.width, level.a.height);

      this.bind(0, level.b.texture);
      gl.uniform2f(blur.uniforms.uStep, 0, 1 / level.a.height);
      this.draw(blur, level.a, level.a.width, level.a.height);
      source = level.a;
    });

    for (let i = scratch.levels.length - 2; i >= 0; i--) {
      const level = scratch.levels[i];
      gl.useProgram(up.program);
      this.bind(0, scratch.levels[i + 1].a.texture);
      this.bind(1, level.a.texture);
      gl.uniform1i(up.uniforms.uSource, 0);
      gl.uniform1i(up.uniforms.uBase, 1);
      gl.uniform2f(up.uniforms.uSize, level.b.width, level.b.height);
      this.draw(up, level.b, level.b.width, level.b.height);
      const swap = level.a;
      level.a = level.b;
      level.b = swap;
    }

    const read = instance.trailTargets[instance.flip];
    const write = instance.trailTargets[1 - instance.flip];
    const au = accum.uniforms;
    gl.useProgram(accum.program);
    this.bind(0, scratch.scene.texture);
    this.bind(1, scratch.levels[0].a.texture);
    this.bind(2, read.texture);
    gl.uniform1i(au.uScene, 0);
    gl.uniform1i(au.uBloom, 1);
    gl.uniform1i(au.uPrev, 2);
    gl.uniform2f(au.uRes, w, h);
    gl.uniform1f(au.uGlow, s.glow * (s.lightMode ? 0.25 : 1.8));
    const tau = s.trails * 0.15;
    gl.uniform1f(
      au.uBlend,
      instance.fresh || tau <= 0.001 ? 1 : 1 - Math.exp(-Math.max(dt, 1 / 240) / tau)
    );
    this.draw(accum, write, w, h);
    instance.flip = 1 - instance.flip;
    instance.fresh = false;

    const cu = composite.uniforms;
    gl.useProgram(composite.program);
    this.bind(0, write.texture);
    gl.uniform1i(cu.uScene, 0);
    gl.uniform2f(cu.uRes, w, h);
    gl.uniform1f(cu.uFade, s.fade);
    gl.uniform1f(cu.uAberration, s.aberration);
    gl.uniform1f(cu.uLightMode, s.lightMode ? 1 : 0);
    gl.uniform1f(cu.uOpacity, s.opacity);
    this.draw(composite, null, w, h);
    gl.bindVertexArray(null);

    const ctx = instance.displayCtx;
    if (ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(this.canvas, 0, 0, w, h, 0, 0, w, h);
      ctx.restore();
      instance.renderVersion += 1;
      instance.onRender?.(instance);
    }
  }

  wake() {
    if (!this.raf && !this.broken && !this.lost && !document.hidden && this.instances.size > 0) {
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  frame = (now) => {
    this.raf = 0;
    if (this.broken || this.lost || document.hidden || this.instances.size === 0) return;

    if (!this.ready()) {
      if (!this.broken && this.pending().length) {
        this.raf = requestAnimationFrame(this.frame);
      }
      return;
    }

    const minFrameMs = this.isSoftwareGl ? 110 : 0;
    if (this.lastTick && minFrameMs > 0 && now - this.lastTick < minFrameMs) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }

    const dt = this.lastTick ? Math.min(0.05, (now - this.lastTick) / 1000) : 0;
    this.lastTick = now;

    let anyAnimating = false;
    for (const instance of this.instances) {
      if (!instance.isActive()) continue;
      const keepAlive = instance.step(dt, this.reducedMotion);
      this.renderInstance(instance, dt);
      if (keepAlive) anyAnimating = true;
    }

    if (anyAnimating) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.lastTick = 0;
    }
  };
}

let sharedEngine = null;
function getEngine() {
  if (!sharedEngine) sharedEngine = new NeonGlyphsEngine();
  return sharedEngine;
}

export class NeonGlyphsController {
  constructor(mountEl, options = {}) {
    this.mountEl = mountEl;
    this.engine = getEngine();
    this.settings = normalizeNeonGlyphOptions(options);
    this.colorData = new Float32Array(MAX_COLORS * 3);
    this.colorCount = 1;
    this.paletteKey = '';
    this.width = 1;
    this.height = 1;
    this.ratio = 1;
    this.renderVersion = 0;
    this.onRender = typeof options.onRender === 'function' ? options.onRender : null;
    this.time = (this.settings.variation % 10) * 1.3;
    this.glyphTime = 0;
    this.clock = 0;
    this.intro =
      this.settings.intro && !this.engine.reducedMotion && !this.settings.paused
        ? 0
        : INTRO_SECONDS;
    this.trailTargets = null;
    this.trailWidth = 0;
    this.trailHeight = 0;
    this.flip = 0;
    this.fresh = true;
    this.visible = true;
    this.externallyPaused = false;
    this.pointer = { x: 0, y: 0, inside: false };
    this.hover = { x: 0, y: 0, vx: 0, vy: 0, presence: 0, placed: false };
    this.lean = { x: 0, y: 0, vx: 0, vy: 0 };
    this.angles = { tilt: this.settings.tilt, turn: this.settings.turn };
    this.clicks = [];

    this.container = document.createElement('div');
    this.container.className = 'neon-glyphs-container';
    if (options.className) this.container.classList.add(...String(options.className).split(/\s+/));

    this.displayCanvas = document.createElement('canvas');
    this.displayCanvas.className = 'neon-glyphs-canvas';
    this.displayCanvas.setAttribute('aria-hidden', 'true');
    this.displayCtx = this.displayCanvas.getContext('2d');
    this.container.appendChild(this.displayCanvas);
    this.mountEl.appendChild(this.container);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.intersection = new IntersectionObserver((entries) => {
      this.visible = entries.some((entry) => entry.isIntersecting);
      if (this.visible) {
        this.engine.wake();
      }
    });
    this.intersection.observe(this.container);

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onPointerLeave);

    this.resize();
    this.engine.register(this);
  }

  isActive() {
    return (
      this.visible &&
      !this.settings.paused &&
      !this.externallyPaused &&
      this.mountEl.isConnected &&
      this.container.clientWidth > 0 &&
      this.container.clientHeight > 0
    );
  }

  setExternalPaused(paused) {
    this.externallyPaused = Boolean(paused);
    if (!this.externallyPaused) {
      this.engine.wake();
    }
  }

  updateOptions(nextOptions = {}) {
    this.settings = normalizeNeonGlyphOptions({ ...this.settings, ...nextOptions });
    this.fresh = true;
    if (this.settings.intro && !this.engine.reducedMotion) {
      this.intro = 0;
    }
    this.resize();
    this.engine.wake();
  }

  syncAngles() {
    const s = this.settings;
    const t = this.clock;
    this.angles.tilt = s.tilt + s.sway * 4 * Math.sin(t * 0.17 + 1.1) + this.lean.y;
    this.angles.turn = s.turn + s.sway * 9 * Math.sin(t * 0.11) + this.lean.x;
  }

  project(px, py) {
    const s = this.settings;
    return projectToPlane({
      px,
      py,
      width: this.width,
      height: this.height,
      perspective: s.perspective,
      tilt: this.angles.tilt,
      turn: this.angles.turn,
      rotation: s.rotation,
      cellSize: s.cellSize,
    });
  }

  step(dt, reduce) {
    const s = this.settings;
    const moving = !s.paused && !reduce;
    if (moving) {
      this.clock += dt;
      this.intro += dt;
      this.time += dt * s.speed;
      this.glyphTime += dt * s.scramble;
      this.clicks = this.clicks.filter((click) => this.clock - click.start < CLICK_SECONDS);
    } else if (this.intro < INTRO_SECONDS) {
      this.intro = INTRO_SECONDS;
    }

    const { pointer, hover, lean } = this;
    const leaning = s.mouseInteraction && pointer.inside && !reduce;
    const leanX = leaning ? ((pointer.x / this.width) * 2 - 1) * 5 : 0;
    const leanY = leaning ? ((pointer.y / this.height) * 2 - 1) * 3 : 0;
    if (dt > 0) {
      lean.vx += (40 * (leanX - lean.x) - 12 * lean.vx) * dt;
      lean.vy += (40 * (leanY - lean.y) - 12 * lean.vy) * dt;
      lean.x += lean.vx * dt;
      lean.y += lean.vy * dt;
    }

    this.syncAngles();
    const target = leaning ? this.project(pointer.x, pointer.y) : null;
    if (target) {
      if (!hover.placed) {
        hover.x = target.x;
        hover.y = target.y;
        hover.vx = 0;
        hover.vy = 0;
        hover.placed = true;
      }
      if (dt > 0) {
        hover.vx += (90 * (target.x - hover.x) - 18 * hover.vx) * dt;
        hover.vy += (90 * (target.y - hover.y) - 18 * hover.vy) * dt;
        hover.x += hover.vx * dt;
        hover.y += hover.vy * dt;
      }
    }
    const goal = target ? 1 : 0;
    hover.presence +=
      (goal - hover.presence) * (1 - Math.exp(-dt / (goal > hover.presence ? 0.25 : 0.6)));
    if (!target && hover.presence < 0.001) hover.placed = false;

    const animating =
      moving && (s.speed > 0 || s.scramble > 0 || s.sway > 0 || this.clicks.length > 0);
    const settling =
      Math.abs(goal - hover.presence) > 0.002 ||
      this.intro < INTRO_SECONDS ||
      Math.hypot(lean.vx, lean.vy) > 0.01 ||
      Math.hypot(leanX - lean.x, leanY - lean.y) > 0.01;
    return animating || settling;
  }

  resize() {
    const s = this.settings;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const maxDpr = this.engine.isSoftwareGl ? 0.78 : 1.5;
    const base = Math.min(s.dpr || window.devicePixelRatio || 1, maxDpr);
    const longest = Math.max(width, height) * base;
    const maxDim = this.engine.isSoftwareGl ? 640 : MAX_RENDER_DIM;
    const ratio = longest > maxDim ? (base * maxDim) / longest : base;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (this.displayCanvas.width !== pixelWidth || this.displayCanvas.height !== pixelHeight) {
      this.displayCanvas.width = pixelWidth;
      this.displayCanvas.height = pixelHeight;
    }
    this.width = width;
    this.height = height;
    this.ratio = pixelHeight / height;
    this.fresh = true;
    if (this.isActive() && this.engine.ready()) {
      this.engine.renderInstance(this, 0);
    }
    this.engine.wake();
  }

  locate(event) {
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
  }

  onPointerMove = (event) => {
    if (!this.isActive()) return;
    const spot = this.locate(event);
    this.pointer.x = spot.x;
    this.pointer.y = spot.y;
    this.pointer.inside = spot.inside;
    if (spot.inside || this.hover.presence > 0.001) {
      this.engine.wake();
    }
  };

  onPointerDown = (event) => {
    const s = this.settings;
    if (
      !this.isActive() ||
      !s.mouseInteraction ||
      !s.burstOnClick ||
      event.button !== 0 ||
      this.engine.reducedMotion ||
      s.paused
    ) {
      return;
    }
    if (
      s.ignoreInteractiveElements &&
      event.target instanceof Element &&
      event.target.closest('a, button, input, textarea, select, label, [role="button"]')
    ) {
      return;
    }
    const spot = this.locate(event);
    if (!spot.inside) return;
    const point = this.project(spot.x, spot.y);
    if (!point) return;
    this.clicks.push({ x: point.x, y: point.y, start: this.clock });
    while (this.clicks.length > MAX_CLICKS) this.clicks.shift();
    this.engine.wake();
  };

  onPointerLeave = () => {
    this.pointer.inside = false;
    this.engine.wake();
  };

  destroy() {
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    document.documentElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.engine.unregister(this);
    this.container.remove();
  }
}
