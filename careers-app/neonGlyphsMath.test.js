const test = require('node:test');
const assert = require('node:assert/strict');

test('neonGlyphsMath normalizes options, orthonormal planeBasis, and plane projection', async () => {
  const {
    DEFAULT_COLORS,
    normalizeNeonGlyphOptions,
    planeBasis,
    projectToPlane,
  } = await import('./neonGlyphsMath.js');

  const defaults = normalizeNeonGlyphOptions();
  assert.deepEqual(defaults.colors, DEFAULT_COLORS);
  assert.equal(defaults.cellSize, 16);
  assert.equal(defaults.depth, 12);
  assert.equal(defaults.tilt, 25);

  const clamped = normalizeNeonGlyphOptions({
    cellSize: 200,
    depth: 99,
    tilt: -120,
    density: 5,
    colors: ['#0016ec', '#a6f3fa'],
  });
  assert.equal(clamped.cellSize, 80);
  assert.equal(clamped.depth, 32);
  assert.equal(clamped.tilt, -80);
  assert.equal(clamped.density, 1);
  assert.deepEqual(clamped.colors, ['#0016ec', '#a6f3fa']);

  const [U, V, N] = planeBasis(25, 0, 0);
  const dotUV = U[0] * V[0] + U[1] * V[1] + U[2] * V[2];
  const dotUN = U[0] * N[0] + U[1] * N[1] + U[2] * N[2];
  const lenN = Math.hypot(N[0], N[1], N[2]);
  assert.ok(Math.abs(dotUV) < 1e-12);
  assert.ok(Math.abs(dotUN) < 1e-12);
  assert.ok(Math.abs(lenN - 1) < 1e-12);

  const center = projectToPlane({
    px: 400,
    py: 225,
    width: 800,
    height: 450,
    perspective: 60,
    tilt: 25,
    turn: 0,
    rotation: 0,
    cellSize: 16,
  });
  assert.ok(center);
  assert.ok(Math.abs(center.x) < 1e-9);
  assert.ok(Math.abs(center.y) < 1e-9);
});
