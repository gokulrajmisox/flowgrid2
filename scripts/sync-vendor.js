const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const VENDOR_DIR = path.join(ROOT, 'assets', 'vendor');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function main() {
  const threeBuild = path.join(ROOT, 'node_modules', 'three', 'build');
  const threeJsm = path.join(ROOT, 'node_modules', 'three', 'examples', 'jsm');
  const gsapDist = path.join(ROOT, 'node_modules', 'gsap', 'dist');
  const rapierDist = path.join(ROOT, 'node_modules', '@dimforge', 'rapier3d-compat', 'dist');
  const countupDist = path.join(ROOT, 'node_modules', 'countup.js', 'dist');
  const lenisDist = path.join(ROOT, 'node_modules', 'lenis', 'dist');

  if (!fs.existsSync(threeBuild) || !fs.existsSync(gsapDist)) {
    console.warn('[sync-vendor] node_modules/three or gsap not found; skipping vendor sync.');
    return;
  }

  copyFile(path.join(threeBuild, 'three.module.js'), path.join(VENDOR_DIR, 'three', 'three.module.js'));
  copyFile(path.join(threeBuild, 'three.core.js'), path.join(VENDOR_DIR, 'three', 'three.core.js'));
  copyFile(
    path.join(threeJsm, 'environments', 'RoomEnvironment.js'),
    path.join(VENDOR_DIR, 'three', 'addons', 'environments', 'RoomEnvironment.js')
  );
  copyFile(
    path.join(threeJsm, 'loaders', 'HDRLoader.js'),
    path.join(VENDOR_DIR, 'three', 'addons', 'loaders', 'HDRLoader.js')
  );
  copyFile(
    path.join(threeJsm, 'loaders', 'RGBELoader.js'),
    path.join(VENDOR_DIR, 'three', 'addons', 'loaders', 'RGBELoader.js')
  );
  copyFile(
    path.join(threeJsm, 'curves', 'NURBSCurve.js'),
    path.join(VENDOR_DIR, 'three', 'addons', 'curves', 'NURBSCurve.js')
  );
  copyFile(
    path.join(threeJsm, 'curves', 'NURBSUtils.js'),
    path.join(VENDOR_DIR, 'three', 'addons', 'curves', 'NURBSUtils.js')
  );
  copyFile(
    path.join(threeJsm, 'utils', 'BufferGeometryUtils.js'),
    path.join(VENDOR_DIR, 'three', 'addons', 'utils', 'BufferGeometryUtils.js')
  );

  copyFile(path.join(gsapDist, 'gsap.min.js'), path.join(VENDOR_DIR, 'gsap', 'gsap.min.js'));
  copyFile(path.join(gsapDist, 'ScrollTrigger.min.js'), path.join(VENDOR_DIR, 'gsap', 'ScrollTrigger.min.js'));

  if (fs.existsSync(path.join(rapierDist, 'rapier.mjs'))) {
    copyFile(path.join(rapierDist, 'rapier.mjs'), path.join(VENDOR_DIR, 'rapier', 'rapier.mjs'));
  }
  if (fs.existsSync(path.join(countupDist, 'countUp.min.js'))) {
    copyFile(path.join(countupDist, 'countUp.min.js'), path.join(VENDOR_DIR, 'countup', 'countUp.min.js'));
  }
  if (fs.existsSync(path.join(lenisDist, 'lenis.mjs'))) {
    copyFile(path.join(lenisDist, 'lenis.mjs'), path.join(VENDOR_DIR, 'lenis', 'lenis.mjs'));
    if (fs.existsSync(path.join(lenisDist, 'lenis.css'))) {
      copyFile(path.join(lenisDist, 'lenis.css'), path.join(VENDOR_DIR, 'lenis', 'lenis.css'));
    }
  }

  console.log('[sync-vendor] Synced Three.js, Rapier3D, CountUp, Lenis, and GSAP browser assets to assets/vendor/');
}

main();
