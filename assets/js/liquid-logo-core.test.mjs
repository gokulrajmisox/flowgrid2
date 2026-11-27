import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIQUID_LOGO_PRESET,
  LIQUID_LOGO_VERTEX_SHADER,
  buildLiquidLogoFragmentShader,
  computeLiquidLogoRenderConfig,
  computePosterLockupLayout,
  detectDarkSurface,
  parseCssRgb,
  relativeLuminance,
} from './liquid-logo-core.mjs';

test('parseCssRgb parses rgb(), rgba(), and hex colors accurately', () => {
  assert.deepEqual(parseCssRgb('rgb(255, 255, 255)'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseCssRgb('rgba(28, 29, 33, 0.5)'), { r: 28, g: 29, b: 33, a: 0.5 });
  assert.deepEqual(parseCssRgb('#9EE600'), { r: 158, g: 230, b: 0, a: 1 });
  assert.equal(parseCssRgb('transparent'), null);
});

test('detectDarkSurface identifies light vs dark Astro and Careers headers', () => {
  assert.equal(
    detectDarkSurface({
      htmlClassList: ['is-white-bg'],
      computedTextColor: 'rgb(28, 29, 33)',
    }),
    false
  );

  assert.equal(
    detectDarkSurface({
      htmlClassList: ['is-black-bg'],
      computedTextColor: 'rgb(255, 255, 255)',
    }),
    true
  );

  assert.equal(
    detectDarkSurface({
      htmlClassList: ['is-black-bg'],
      computedTextColor: 'rgb(0, 0, 0)',
    }),
    true
  );

  assert.equal(
    detectDarkSurface({
      htmlClassList: [],
      headerClassList: ['--menu-opened'],
      viewportWidth: 390,
      computedTextColor: 'rgb(28, 29, 33)',
    }),
    true
  );

  assert.ok(relativeLuminance({ r: 255, g: 255, b: 255 }) > 0.95);
  assert.ok(relativeLuminance({ r: 10, g: 11, b: 18 }) < 0.02);
});

test('computePosterLockupLayout produces 2x2 diagonal poster cells beside FLOWGRID wordmark', () => {
  const layout = computePosterLockupLayout(760, 160);
  assert.equal(layout.cells.length, 4);
  assert.deepEqual(
    layout.cells.map((c) => c.kind),
    ['obsidian', 'lime', 'lime', 'obsidian']
  );
  assert.ok(layout.text.x > layout.padX + layout.markSize);
  assert.equal(layout.text.label, 'FLOWGRID');
  assert.ok(layout.text.letterSpacing >= 2);
  assert.ok(layout.text.maxWidth > 100);
});

test('shader builder & adaptive render config obey SwiftShader and reduced-motion caps', () => {
  const frag = buildLiquidLogoFragmentShader();
  assert.ok(LIQUID_LOGO_VERTEX_SHADER.includes('aVertexPosition'));
  assert.ok(frag.includes('detectEdges'));
  assert.ok(frag.includes('liquidMetalEffect'));
  assert.ok(frag.includes('glassBevelRim'));
  assert.ok(frag.includes('u_darkSurface'));

  const sw = computeLiquidLogoRenderConfig({ isSoftwareGl: true, dpr: 2 });
  assert.equal(sw.maxDpr, 1);
  assert.ok(sw.targetFps <= 20);
  assert.ok(sw.iterations < LIQUID_LOGO_PRESET.iterations);

  const rm = computeLiquidLogoRenderConfig({ reducedMotion: true, dpr: 2 });
  assert.equal(rm.animated, false);
});
