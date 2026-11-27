export const MAX_COLORS = 8;
export const MAX_CLICKS = 4;
export const MAX_STEPS = 56;
export const MAX_RENDER_DIM = 2400;
export const BLOOM_LEVELS = 6;
export const INTRO_SECONDS = 2.4;
export const CLICK_SECONDS = 1.6;
export const ATLAS_CELL = 64;
export const ATLAS_COLUMNS = 16;

export const DEFAULT_COLORS = ['#a6f3fa', '#ea6fe0', '#6fd6f7', '#d351b6', '#5aaef0'];
export const DEFAULT_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>?!';
export const DEFAULT_FONT =
  'IBMPlexMono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeNeonGlyphOptions(options = {}) {
  const colorsSource =
    Array.isArray(options.colors) && options.colors.length ? options.colors : DEFAULT_COLORS;
  return {
    colors: colorsSource.slice(0, MAX_COLORS).map(String),
    characters: String(options.characters || DEFAULT_CHARACTERS),
    fontFamily: options.fontFamily || DEFAULT_FONT,
    cellSize: clamp(num(options.cellSize, 16), 6, 80),
    depth: clamp(Math.round(num(options.depth, 12)), 1, 32),
    tilt: clamp(num(options.tilt, 25), -80, 80),
    turn: clamp(num(options.turn, 0), -80, 80),
    rotation: num(options.rotation, 0),
    perspective: clamp(num(options.perspective, 60), 10, 120),
    sway: clamp(num(options.sway, 0.5), 0, 2),
    speed: Math.max(0, num(options.speed, 0.15)),
    density: clamp(num(options.density, 0.1), 0, 1),
    trails: clamp(num(options.trails, 0.25), 0, 1),
    glow: clamp(num(options.glow, 0.75), 0, 3),
    flicker: clamp(num(options.flicker, 0.5), 0, 1),
    scramble: clamp(num(options.scramble, 0.5), 0, 4),
    brightness: Math.max(0, num(options.brightness, 1)),
    fade: clamp(num(options.fade, 0.75), 0, 1),
    aberration: clamp(num(options.aberration, 0.5), 0, 2),
    variation: num(options.variation, 0),
    opacity: clamp(num(options.opacity, 1), 0, 1),
    intro: options.intro !== false,
    mouseInteraction: options.mouseInteraction !== false,
    burstOnClick: options.burstOnClick !== false,
    lightMode: Boolean(options.lightMode),
    paused: Boolean(options.paused),
    ignoreInteractiveElements: Boolean(options.ignoreInteractiveElements),
    dpr: options.dpr,
  };
}

export function planeBasis(tilt, turn, rotation) {
  const a = (tilt * Math.PI) / 180;
  const b = (turn * Math.PI) / 180;
  const c = (rotation * Math.PI) / 180;
  const roll = (v) => [
    v[0] * Math.cos(c) - v[1] * Math.sin(c),
    v[0] * Math.sin(c) + v[1] * Math.cos(c),
    v[2],
  ];
  const pitch = (v) => [
    v[0],
    v[1] * Math.cos(a) + v[2] * Math.sin(a),
    -v[1] * Math.sin(a) + v[2] * Math.cos(a),
  ];
  const yaw = (v) => [
    v[0] * Math.cos(b) + v[2] * Math.sin(b),
    v[1],
    -v[0] * Math.sin(b) + v[2] * Math.cos(b),
  ];
  const apply = (v) => yaw(pitch(roll(v)));
  return [apply([1, 0, 0]), apply([0, 1, 0]), apply([0, 0, 1])];
}

export function projectToPlane({
  px,
  py,
  width,
  height,
  perspective,
  tilt,
  turn,
  rotation,
  cellSize,
}) {
  if (width <= 0 || height <= 0) return null;
  const focal = 1 / Math.tan(((perspective * Math.PI) / 180) / 2);
  const [U, V, N] = planeBasis(tilt, turn, rotation);
  const d = [(px - width / 2) / height, (height / 2 - py) / height, -focal];
  const dn = d[0] * N[0] + d[1] * N[1] + d[2] * N[2];
  if (dn > -1e-5) return null;
  const t = (-focal * N[2]) / dn;
  const P = [d[0] * t, d[1] * t, d[2] * t + focal];
  const cell = cellSize / height;
  if (cell <= 0) return null;
  return {
    x: (P[0] * U[0] + P[1] * U[1] + P[2] * U[2]) / cell,
    y: (P[0] * V[0] + P[1] * V[1] + P[2] * V[2]) / cell,
  };
}
