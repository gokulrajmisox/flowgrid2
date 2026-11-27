import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { detectSoftwareWebGL } from './utils/utils.js';

const _vec3 = new THREE.Vector3();
const _vec3B = new THREE.Vector3();

function createRoundedRectShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width * 0.45, height * 0.45);
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function makePlateGeometry(width, height, depth = 0.06, radius = 0.14) {
  const shape = createRoundedRectShape(width, height, radius);
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
}

function createMicroSurfaceMaps() {
  const size = 256;

  // Brushed anodized aluminum + architectural hairline grid
  const brushedCanvas = document.createElement('canvas');
  brushedCanvas.width = size;
  brushedCanvas.height = size;
  const bCtx = brushedCanvas.getContext('2d');
  bCtx.fillStyle = '#888888';
  bCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const streak = 118 + Math.round(((Math.sin(y * 1.7) * 0.5 + 0.5) * 28) + ((y * 37) % 19));
    bCtx.fillStyle = `rgb(${streak},${streak},${streak})`;
    bCtx.fillRect(0, y, size, 1);
  }
  bCtx.strokeStyle = 'rgba(220,220,220,0.16)';
  bCtx.lineWidth = 1;
  for (let i = 0; i < size; i += 32) {
    bCtx.beginPath();
    bCtx.moveTo(i + 0.5, 0);
    bCtx.lineTo(i + 0.5, size);
    bCtx.moveTo(0, i + 0.5);
    bCtx.lineTo(size, i + 0.5);
    bCtx.stroke();
  }

  const brushedTex = new THREE.CanvasTexture(brushedCanvas);
  brushedTex.wrapS = THREE.RepeatWrapping;
  brushedTex.wrapT = THREE.RepeatWrapping;
  brushedTex.repeat.set(2, 2);

  // Subtle carbon-weave texture for accent nodes & dark chassis
  const carbonCanvas = document.createElement('canvas');
  carbonCanvas.width = 128;
  carbonCanvas.height = 128;
  const cCtx = carbonCanvas.getContext('2d');
  cCtx.fillStyle = '#5c5c5c';
  cCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      cCtx.fillStyle = (x + y) % 16 === 0 ? '#969696' : '#3a3a3a';
      cCtx.fillRect(x, y, 7, 4);
      cCtx.fillStyle = (x + y) % 16 === 0 ? '#424242' : '#858585';
      cCtx.fillRect(x, y + 4, 4, 4);
    }
  }
  const carbonTex = new THREE.CanvasTexture(carbonCanvas);
  carbonTex.wrapS = THREE.RepeatWrapping;
  carbonTex.wrapT = THREE.RepeatWrapping;
  carbonTex.repeat.set(3, 3);

  // Backdrop dot-matrix stage texture
  const stageCanvas = document.createElement('canvas');
  stageCanvas.width = 512;
  stageCanvas.height = 384;
  const sCtx = stageCanvas.getContext('2d');
  const grad = sCtx.createRadialGradient(256, 192, 20, 256, 192, 270);
  grad.addColorStop(0, 'rgba(75, 102, 255, 0.22)');
  grad.addColorStop(0.65, 'rgba(38, 42, 68, 0.08)');
  grad.addColorStop(1, 'rgba(18, 19, 28, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 512, 384);

  sCtx.strokeStyle = 'rgba(130, 152, 255, 0.14)';
  sCtx.lineWidth = 1;
  for (let x = 32; x < 512; x += 32) {
    sCtx.beginPath();
    sCtx.moveTo(x + 0.5, 24);
    sCtx.lineTo(x + 0.5, 360);
    sCtx.stroke();
  }
  for (let y = 32; y < 384; y += 32) {
    sCtx.beginPath();
    sCtx.moveTo(24, y + 0.5);
    sCtx.lineTo(488, y + 0.5);
    sCtx.stroke();
  }
  sCtx.fillStyle = 'rgba(182, 198, 255, 0.34)';
  for (let y = 32; y < 384; y += 32) {
    for (let x = 32; x < 512; x += 32) {
      sCtx.fillRect(x - 1, y - 1, 2, 2);
    }
  }
  const stageTex = new THREE.CanvasTexture(stageCanvas);
  stageTex.colorSpace = THREE.SRGBColorSpace;

  return { brushedTex, carbonTex, stageTex };
}

function createRoleScreenTexture(type, variant = 'primary') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  // Subtle dark frosted substrate
  const bg = ctx.createLinearGradient(0, 0, 512, 320);
  bg.addColorStop(0, '#171928');
  bg.addColorStop(1, '#21253a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 320);

  // Subtle hairline grid
  ctx.strokeStyle = 'rgba(128, 148, 255, 0.09)';
  ctx.lineWidth = 1;
  for (let x = 32; x < 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 320);
    ctx.stroke();
  }
  for (let y = 32; y < 320; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  if (type === 'web' || (type === 'fullstack' && variant === 'primary')) {
    // Code + layout blueprint lines
    const lines = [
      { indent: 28, w: 190, c: '#7089ff' },
      { indent: 48, w: 260, c: '#a5b4fc' },
      { indent: 68, w: 210, c: '#38bdf8' },
      { indent: 68, w: 290, c: '#e2e8f0' },
      { indent: 48, w: 140, c: '#7089ff' },
      { indent: 28, w: 230, c: '#c084fc' },
      { indent: 48, w: 270, c: '#94a3b8' },
      { indent: 48, w: 175, c: '#38bdf8' },
    ];
    lines.forEach((line, idx) => {
      ctx.fillStyle = line.c;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.roundRect(line.indent, 48 + idx * 24, line.w, 8, 4);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // Right mini layout wireframe
    ctx.strokeStyle = 'rgba(125, 158, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(364, 48, 118, 224);
    ctx.fillStyle = 'rgba(82, 39, 255, 0.35)';
    ctx.fillRect(374, 60, 98, 36);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fillRect(374, 108, 44, 148);
    ctx.fillRect(426, 108, 46, 148);
  } else if (type === 'frontend') {
    if (variant === 'primary') {
      // Motion easing curve + UI tokens
      ctx.strokeStyle = 'rgba(148, 163, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 40, 440, 240);

      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(64, 240);
      ctx.bezierCurveTo(175, 240, 220, 74, 444, 74);
      ctx.stroke();

      // Keyframe handles
      [
        [64, 240, '#f472b6'],
        [175, 240, '#818cf8'],
        [220, 74, '#38bdf8'],
        [444, 74, '#ffffff'],
      ].forEach(([x, y, c]) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // UI swatch strips
      ['#3b82f6', '#8b5cf6', '#ec4899', '#e2e8f0'].forEach((c, idx) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.roundRect(40 + idx * 112, 64, 92, 180, 12);
        ctx.fill();
      });
    }
  } else if (type === 'backend') {
    // Telemetry route rows
    const routes = [
      ['POST /api/webhooks', '12ms', '#38bdf8'],
      ['GET /api/workflows', '18ms', '#818cf8'],
      ['SYNC /queue/jobs', '99.9%', '#a855f7'],
    ];
    routes.forEach(([path, stat, color], idx) => {
      const y = 52 + idx * 78;
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(32, y, 448, 58, 10);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillRect(48, y + 18, 10, 22);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 20px monospace';
      ctx.fillText(path, 74, y + 36);
      ctx.fillStyle = color;
      ctx.fillText(stat, 404, y + 36);
    });
  } else if (type === 'fullstack' && variant === 'secondary') {
    // Database schema diagram
    const boxes = [
      { x: 40, y: 54, label: 'CLIENT' },
      { x: 196, y: 54, label: 'API' },
      { x: 352, y: 54, label: 'STORE' },
    ];
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(156, 150);
    ctx.lineTo(352, 150);
    ctx.stroke();

    boxes.forEach((b) => {
      ctx.fillStyle = '#252a45';
      ctx.strokeStyle = 'rgba(165, 180, 252, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, 120, 200, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a5b4fc';
      ctx.font = '600 18px monospace';
      ctx.fillText(b.label, b.x + 22, b.y + 38);
      for (let r = 0; r < 4; r++) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
        ctx.fillRect(b.x + 18, b.y + 62 + r * 28, 84, 12);
      }
    });
  } else if (type === 'uiux') {
    if (variant === 'primary') {
      // Typography specimen & layout column guides
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 92px sans-serif';
      ctx.fillText('Aa', 42, 128);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
      ctx.fillRect(42, 158, 170, 8);
      ctx.fillStyle = 'rgba(165, 180, 252, 0.5)';
      ctx.fillRect(42, 182, 250, 8);
      ctx.fillRect(42, 206, 210, 8);

      // Token palette circles
      ['#5227ff', '#ec4899', '#38bdf8', '#e4e7f5'].forEach((c, idx) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(72 + idx * 54, 260, 18, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Prototype frame wireframe
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.65)';
      ctx.lineWidth = 2;
      for (let col = 0; col < 3; col++) {
        ctx.strokeRect(40 + col * 150, 40, 130, 240);
      }
    }
  } else if (type === 'aiml') {
    // Attention / weight heat-grid + training curve
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 10; c++) {
        const weight = Math.abs(Math.sin(r * 1.3 + c * 0.9));
        ctx.fillStyle = `rgba(${Math.round(90 + weight * 110)}, ${Math.round(
          110 + weight * 90
        )}, 255, ${0.18 + weight * 0.65})`;
        ctx.beginPath();
        ctx.roundRect(36 + c * 44, 34 + r * 36, 36, 28, 5);
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(40, 272);
    ctx.quadraticCurveTo(180, 260, 470, 224);
    ctx.stroke();
  } else if (type === 'marketing') {
    // Growth trajectory bars & metric curve
    const bars = [0.28, 0.42, 0.54, 0.68, 0.84, 0.96];
    bars.forEach((h, idx) => {
      const barH = h * 200;
      const grd = ctx.createLinearGradient(0, 270 - barH, 0, 270);
      grd.addColorStop(0, '#f43f5e');
      grd.addColorStop(1, '#5227ff');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.roundRect(56 + idx * 68, 270 - barH, 42, barH, 6);
      ctx.fill();
    });
  } else {
    // Content creation: viewfinder safe frame & waveform
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.72)';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 34, 432, 200);
    ctx.beginPath();
    ctx.arc(256, 134, 42, 0, Math.PI * 2);
    ctx.stroke();
    // Audio waveform along bottom strip
    for (let i = 0; i < 36; i++) {
      const h = 10 + Math.abs(Math.sin(i * 0.65)) * 38;
      ctx.fillStyle = i % 3 === 0 ? '#f59e0b' : '#a78bfa';
      ctx.fillRect(44 + i * 12, 266 - h * 0.5, 6, h);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export default class RoleHeroVisual {
  container = null;
  renderer = null;
  scene = null;
  camera = null;
  rootGroup = null;
  activeGroup = null;
  pulseTargets = [];
  layerRefs = [];
  dynamicTextures = [];
  dynamicMaterials = [];
  isRunning = false;
  isDisposed = false;
  isSoftwareGl = detectSoftwareWebGL();
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  frameId = 0;
  lastTime = performance.now();
  elapsed = 0;
  pointerTarget = { x: 0, y: 0 };
  pointerCurrent = { x: 0, y: 0 };
  renderBusy = false;
  renderDirty = false;
  currentType = 'web';

  constructor(container) {
    this.container = container;
    this.initRenderer();
    window.addEventListener('resize', this.resize, { passive: true });
    this.container?.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.container?.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
  }

  initRenderer() {
    if (!this.container) return;

    const width = Math.max(280, this.container.clientWidth || 560);
    const height = Math.max(240, this.container.clientHeight || 420);

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      this.showFallback();
      return;
    }

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = false;

    const canvas = this.renderer.domElement;
    canvas.className = 'role-hero-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
      this.showFallback();
    });

    this.container.appendChild(canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
    this.camera.position.set(0, 0.15, 6.8);
    this.camera.lookAt(0, 0, 0);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envScene = new RoomEnvironment();
    this.envTexture = pmremGenerator.fromScene(envScene, 0.04).texture;
    this.scene.environment = this.envTexture;
    envScene.dispose();
    pmremGenerator.dispose();

    // 3-point studio lighting: warm key + cool fill + cobalt rim
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.85);
    keyLight.position.set(4, 5, 6);
    this.scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x8aa2ff, 0x1a1c28, 0.95);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x4b6bff, 1.5);
    rimLight.position.set(-5, -2, -4);
    this.scene.add(rimLight);

    this.surfaceMaps = createMicroSurfaceMaps();

    // Calibrated stage grid backdrop behind interactive architecture
    const stageBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 5.4),
      new THREE.MeshBasicMaterial({
        map: this.surfaceMaps.stageTex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
    );
    stageBackdrop.position.set(0, 0, -1.85);
    this.scene.add(stageBackdrop);
    this.stageBackdrop = stageBackdrop;

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    const { brushedTex, carbonTex } = this.surfaceMaps;

    this.materials = {
      slateDark: new THREE.MeshStandardMaterial({
        color: 0x262938,
        roughness: 0.42,
        metalness: 0.34,
        bumpMap: carbonTex,
        bumpScale: 0.015,
        roughnessMap: carbonTex,
      }),
      slateMid: new THREE.MeshStandardMaterial({
        color: 0x35394f,
        roughness: 0.3,
        metalness: 0.48,
        bumpMap: brushedTex,
        bumpScale: 0.012,
        roughnessMap: brushedTex,
      }),
      glassPanel: new THREE.MeshStandardMaterial({
        color: 0x8ea4ff,
        roughness: 0.14,
        metalness: 0.2,
        transparent: true,
        opacity: 0.32,
        bumpMap: brushedTex,
        bumpScale: 0.004,
      }),
      cobaltAccent: new THREE.MeshStandardMaterial({
        color: 0x1b34ff,
        roughness: 0.25,
        metalness: 0.58,
        bumpMap: brushedTex,
        bumpScale: 0.01,
        roughnessMap: brushedTex,
      }),
      periwinkle: new THREE.MeshStandardMaterial({
        color: 0x6f8ef0,
        roughness: 0.32,
        metalness: 0.38,
        bumpMap: brushedTex,
        bumpScale: 0.012,
      }),
      pinkAccent: new THREE.MeshStandardMaterial({
        color: 0xd9467a,
        roughness: 0.3,
        metalness: 0.25,
        bumpMap: carbonTex,
        bumpScale: 0.008,
      }),
      ivoryPlate: new THREE.MeshStandardMaterial({
        color: 0xe4e7f5,
        roughness: 0.5,
        metalness: 0.12,
        bumpMap: brushedTex,
        bumpScale: 0.008,
      }),
      wireLine: new THREE.LineBasicMaterial({
        color: 0x7089e8,
        transparent: true,
        opacity: 0.46,
      }),
    };
  }

  createScreenMaterial(type, variant = 'primary', opacity = 0.94) {
    const tex = createRoleScreenTexture(type, variant);
    this.dynamicTextures.push(tex);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.38,
      roughness: 0.22,
      metalness: 0.12,
      transparent: opacity < 1,
      opacity,
    });
    this.dynamicMaterials.push(mat);
    return mat;
  }

  disposeDynamicResources() {
    this.dynamicTextures.forEach((tex) => tex.dispose());
    this.dynamicTextures = [];
    this.dynamicMaterials.forEach((mat) => mat.dispose());
    this.dynamicMaterials = [];
  }

  showFallback() {
    const fallback = document.getElementById('modal-hero-fallback');
    fallback?.classList.add('is-visible');
  }

  setRoleType(visualType) {
    this.currentType = visualType || 'web';
    if (!this.rootGroup || !this.materials) return;

    if (this.activeGroup) {
      this.activeGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
      this.rootGroup.remove(this.activeGroup);
    }
    this.disposeDynamicResources();

    this.pulseTargets = [];
    this.layerRefs = [];
    this.activeGroup = this.buildArchitectureForRole(this.currentType);
    this.rootGroup.add(this.activeGroup);

    if (this.reducedMotion || this.isRunning) {
      this.renderOnce();
    }
  }

  buildArchitectureForRole(type) {
    const group = new THREE.Group();

    if (type === 'web' || type === 'fullstack') {
      const backFrame = new THREE.Mesh(
        makePlateGeometry(3.5, 2.35, 0.05, 0.12),
        this.materials.slateDark
      );
      backFrame.position.set(0.18, -0.08, -0.45);
      group.add(backFrame);
      this.layerRefs.push({ obj: backFrame, depth: 0.5 });

      const mainFrame = new THREE.Mesh(
        makePlateGeometry(3.2, 2.1, 0.06, 0.12),
        this.materials.slateMid
      );
      mainFrame.position.set(-0.08, 0.08, 0.0);
      group.add(mainFrame);
      this.layerRefs.push({ obj: mainFrame, depth: 1.0 });

      // Textured code / schema screen inlay inside the main browser frame
      const primaryScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(2.85, 1.48),
        this.createScreenMaterial(type, 'primary', 0.92)
      );
      primaryScreen.position.set(-0.08, -0.03, 0.09);
      group.add(primaryScreen);
      this.layerRefs.push({ obj: primaryScreen, depth: 1.05 });

      const topBar = new THREE.Mesh(
        makePlateGeometry(3.0, 0.2, 0.04, 0.05),
        this.materials.cobaltAccent
      );
      topBar.position.set(-0.08, 0.92, 0.14);
      group.add(topBar);
      this.layerRefs.push({ obj: topBar, depth: 1.25 });

      const gridGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.82, 1.42, 0.02));
      const gridWire = new THREE.LineSegments(gridGeo, this.materials.wireLine);
      gridWire.position.set(-0.08, -0.05, 0.14);
      group.add(gridWire);

      for (let i = 0; i < 4; i++) {
        const col = new THREE.Mesh(
          makePlateGeometry(0.58, 1.15 - (i % 2) * 0.2, 0.04, 0.06),
          i === 1 ? this.materials.glassPanel : this.materials.slateDark
        );
        col.position.set(-1.05 + i * 0.65, -0.08, 0.24 + i * 0.06);
        group.add(col);
        this.layerRefs.push({ obj: col, depth: 1.4 + i * 0.15 });
      }

      if (type === 'fullstack') {
        const schemaCard = new THREE.Mesh(
          new THREE.PlaneGeometry(1.48, 0.92),
          this.createScreenMaterial('fullstack', 'secondary', 0.96)
        );
        schemaCard.position.set(1.02, -0.66, 0.56);
        group.add(schemaCard);
        this.layerRefs.push({ obj: schemaCard, depth: 1.55 });

        const dbCylinder = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.34, 0.62, 24),
          this.materials.periwinkle
        );
        dbCylinder.position.set(1.45, -0.82, 0.72);
        group.add(dbCylinder);
        this.pulseTargets.push(dbCylinder);
      }
      return group;
    }

    if (type === 'frontend') {
      for (let i = 0; i < 4; i++) {
        const w = 2.6 - i * 0.28;
        const h = 1.65 - i * 0.18;
        const mat =
          i === 0
            ? this.materials.slateDark
            : i === 2
            ? this.materials.glassPanel
            : this.materials.slateMid;
        const px = (i - 1.5) * 0.24;
        const py = (1.5 - i) * 0.14;
        const pz = (i - 1.5) * 0.32;
        const card = new THREE.Mesh(makePlateGeometry(w, h, 0.05, 0.12), mat);
        card.position.set(px, py, pz);
        group.add(card);
        this.layerRefs.push({ obj: card, depth: 0.7 + i * 0.35 });

        if (i === 1 || i === 3) {
          const face = new THREE.Mesh(
            new THREE.PlaneGeometry(w * 0.86, h * 0.8),
            this.createScreenMaterial('frontend', i === 1 ? 'primary' : 'secondary', 0.92)
          );
          face.position.set(px, py, pz + 0.085);
          group.add(face);
          this.layerRefs.push({ obj: face, depth: 0.7 + i * 0.35 });
        }
      }
      const accentTile = new THREE.Mesh(
        makePlateGeometry(0.92, 0.52, 0.05, 0.08),
        this.materials.cobaltAccent
      );
      accentTile.position.set(-0.55, 0.35, 0.75);
      group.add(accentTile);
      this.pulseTargets.push(accentTile);

      const microDot = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.24, 0.24),
        this.materials.pinkAccent
      );
      microDot.position.set(0.85, -0.45, 0.84);
      group.add(microDot);
      this.pulseTargets.push(microDot);
      return group;
    }

    if (type === 'backend') {
      // Telemetry plane behind connected server nodes
      const telemetryPlate = new THREE.Mesh(
        makePlateGeometry(3.35, 2.05, 0.04, 0.1),
        this.materials.slateDark
      );
      telemetryPlate.position.set(0, 0, -0.52);
      group.add(telemetryPlate);
      this.layerRefs.push({ obj: telemetryPlate, depth: 0.45 });

      const telemetryScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(3.05, 1.8),
        this.createScreenMaterial('backend', 'primary', 0.88)
      );
      telemetryScreen.position.set(0, 0, -0.43);
      group.add(telemetryScreen);
      this.layerRefs.push({ obj: telemetryScreen, depth: 0.48 });

      const coords = [
        [-1.3, 0.75, -0.15],
        [-1.3, -0.75, 0.2],
        [0, 0.9, 0.35],
        [0, 0, -0.1],
        [0, -0.9, 0.35],
        [1.35, 0.45, 0.15],
        [1.35, -0.55, -0.15],
      ];
      const edges = [
        [0, 2],
        [0, 3],
        [1, 3],
        [1, 4],
        [2, 5],
        [3, 5],
        [3, 6],
        [4, 6],
      ];
      const nodeGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.32, 6);
      coords.forEach(([x, y, z], idx) => {
        const mat =
          idx === 3
            ? this.materials.cobaltAccent
            : idx >= 5
            ? this.materials.periwinkle
            : this.materials.slateMid;
        const node = new THREE.Mesh(nodeGeo, mat);
        node.position.set(x, y, z);
        node.rotation.x = Math.PI * 0.12;
        group.add(node);
        this.layerRefs.push({ obj: node, depth: 1.0 + (idx % 3) * 0.25 });
      });

      const linePts = [];
      edges.forEach(([a, b]) => {
        linePts.push(new THREE.Vector3(...coords[a]), new THREE.Vector3(...coords[b]));
      });
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      group.add(new THREE.LineSegments(lineGeo, this.materials.wireLine));

      for (let i = 0; i < 2; i++) {
        const packet = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.14, 0.14),
          i === 0 ? this.materials.ivoryPlate : this.materials.pinkAccent
        );
        packet.userData.edge = edges[i * 3];
        packet.userData.coords = coords;
        packet.userData.phase = i * 0.5;
        group.add(packet);
        this.pulseTargets.push(packet);
      }
      return group;
    }

    if (type === 'aiml') {
      // Neural matrix telemetry backdrop behind layered lattice
      const matrixBack = new THREE.Mesh(
        makePlateGeometry(3.45, 2.2, 0.04, 0.12),
        this.materials.slateDark
      );
      matrixBack.position.set(0, 0, -0.62);
      group.add(matrixBack);
      this.layerRefs.push({ obj: matrixBack, depth: 0.45 });

      const matrixScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(3.15, 1.92),
        this.createScreenMaterial('aiml', 'primary', 0.85)
      );
      matrixScreen.position.set(0, 0, -0.53);
      group.add(matrixScreen);
      this.layerRefs.push({ obj: matrixScreen, depth: 0.48 });

      const layers = [
        { x: -1.45, count: 3, mat: this.materials.slateMid },
        { x: -0.45, count: 4, mat: this.materials.periwinkle },
        { x: 0.55, count: 4, mat: this.materials.cobaltAccent },
        { x: 1.5, count: 2, mat: this.materials.ivoryPlate },
      ];
      const layerPositions = [];
      const nodeGeo = new THREE.OctahedronGeometry(0.16, 1);
      layers.forEach((layer, lIdx) => {
        const pts = [];
        for (let i = 0; i < layer.count; i++) {
          const y = (i - (layer.count - 1) / 2) * 0.72;
          const z = Math.sin((lIdx + i) * 1.1) * 0.34;
          const mesh = new THREE.Mesh(nodeGeo, layer.mat);
          mesh.position.set(layer.x, y, z);
          group.add(mesh);
          this.pulseTargets.push(mesh);
          pts.push(mesh.position.clone());
        }
        layerPositions.push(pts);
      });

      const linePts = [];
      for (let l = 0; l < layerPositions.length - 1; l++) {
        for (const a of layerPositions[l]) {
          for (const b of layerPositions[l + 1]) {
            linePts.push(a, b);
          }
        }
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      group.add(new THREE.LineSegments(lineGeo, this.materials.wireLine));
      return group;
    }

    if (type === 'uiux') {
      const frame1 = new THREE.Mesh(
        makePlateGeometry(1.85, 2.35, 0.05, 0.12),
        this.materials.slateDark
      );
      frame1.position.set(-0.62, 0.05, -0.2);
      group.add(frame1);
      this.layerRefs.push({ obj: frame1, depth: 0.8 });

      const specimenScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.62, 1.98),
        this.createScreenMaterial('uiux', 'primary', 0.94)
      );
      specimenScreen.position.set(-0.62, 0.05, -0.115);
      group.add(specimenScreen);
      this.layerRefs.push({ obj: specimenScreen, depth: 0.84 });

      const frame2 = new THREE.Mesh(
        makePlateGeometry(1.65, 2.1, 0.05, 0.12),
        this.materials.glassPanel
      );
      frame2.position.set(0.68, -0.1, 0.28);
      group.add(frame2);
      this.layerRefs.push({ obj: frame2, depth: 1.3 });

      const protoScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.42, 1.75),
        this.createScreenMaterial('uiux', 'secondary', 0.78)
      );
      protoScreen.position.set(0.68, -0.1, 0.365);
      group.add(protoScreen);
      this.layerRefs.push({ obj: protoScreen, depth: 1.34 });

      const accentBlock = new THREE.Mesh(
        makePlateGeometry(0.95, 0.65, 0.06, 0.1),
        this.materials.cobaltAccent
      );
      accentBlock.position.set(0.68, 0.35, 0.48);
      group.add(accentBlock);
      this.pulseTargets.push(accentBlock);

      const guideWire = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(3.4, 2.55, 0.02)),
        this.materials.wireLine
      );
      guideWire.position.set(0, 0, -0.45);
      group.add(guideWire);
      return group;
    }

    // marketing / content: Precision spline trajectory + textured editorial plates
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.55, -0.85, -0.2),
      new THREE.Vector3(-0.65, -0.25, 0.25),
      new THREE.Vector3(0.35, 0.15, -0.1),
      new THREE.Vector3(1.5, 0.95, 0.35),
    ]);
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.045, 10, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, this.materials.cobaltAccent);
    group.add(tubeMesh);

    for (let i = 0; i < 3; i++) {
      const px = -0.95 + i * 0.98;
      const py = -0.35 + i * 0.36;
      const pz = -0.15 + i * 0.25;
      const card = new THREE.Mesh(
        makePlateGeometry(1.38, 0.9, 0.05, 0.09),
        i === 1 ? this.materials.glassPanel : this.materials.slateMid
      );
      card.position.set(px, py, pz);
      group.add(card);
      this.layerRefs.push({ obj: card, depth: 0.9 + i * 0.3 });

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.74),
        this.createScreenMaterial(type, i === 1 ? 'primary' : 'secondary', 0.92)
      );
      screen.position.set(px, py, pz + 0.085);
      group.add(screen);
      this.layerRefs.push({ obj: screen, depth: 0.92 + i * 0.3 });
    }
    const anchorPrism = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.26, 0.26),
      this.materials.ivoryPlate
    );
    anchorPrism.position.set(1.5, 0.95, 0.35);
    group.add(anchorPrism);
    this.pulseTargets.push(anchorPrism);
    return group;
  }

  onPointerMove = (e) => {
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.pointerTarget.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    this.pointerTarget.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    if (this.reducedMotion && this.isRunning) {
      this.requestRender();
    }
  };

  onPointerLeave = () => {
    this.pointerTarget.x = 0;
    this.pointerTarget.y = 0;
    if (this.reducedMotion && this.isRunning) {
      this.requestRender();
    }
  };

  start() {
    if (!this.renderer || this.isDisposed || this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.resize();
    if (this.reducedMotion) {
      this.renderOnce();
    } else {
      this.loop();
    }
  }

  stop() {
    this.isRunning = false;
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
  }

  resize = () => {
    if (!this.renderer || !this.camera || !this.container) return;
    const width = Math.max(280, this.container.clientWidth || 560);
    const height = Math.max(240, this.container.clientHeight || 420);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.isRunning && this.reducedMotion) {
      this.renderOnce();
    }
  };

  stepScene(dt) {
    this.elapsed += dt;
    const dampFactor = 1 - Math.exp(-6 * dt);
    this.pointerCurrent.x += (this.pointerTarget.x - this.pointerCurrent.x) * dampFactor;
    this.pointerCurrent.y += (this.pointerTarget.y - this.pointerCurrent.y) * dampFactor;

    if (this.rootGroup) {
      const targetRotY = this.pointerCurrent.x * 0.24 + Math.sin(this.elapsed * 0.45) * 0.08;
      const targetRotX = -this.pointerCurrent.y * 0.16 + Math.cos(this.elapsed * 0.35) * 0.05;
      this.rootGroup.rotation.y += (targetRotY - this.rootGroup.rotation.y) * dampFactor;
      this.rootGroup.rotation.x += (targetRotX - this.rootGroup.rotation.x) * dampFactor;
    }

    for (const ref of this.layerRefs) {
      ref.obj.position.x +=
        this.pointerCurrent.x * 0.06 * ref.depth - (ref.obj.userData.offsetX || 0);
      ref.obj.userData.offsetX = this.pointerCurrent.x * 0.06 * ref.depth;
    }

    this.pulseTargets.forEach((target, idx) => {
      if (target.userData?.edge && target.userData?.coords) {
        const [aIdx, bIdx] = target.userData.edge;
        const t = (this.elapsed * 0.55 + target.userData.phase) % 1;
        _vec3.set(...target.userData.coords[aIdx]);
        _vec3B.set(...target.userData.coords[bIdx]);
        target.position.lerpVectors(_vec3, _vec3B, t);
      } else {
        const s = 1 + Math.sin(this.elapsed * 1.4 + idx * 0.8) * 0.06;
        target.scale.setScalar(s);
      }
    });
  }

  renderOnce() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  requestRender() {
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = window.requestAnimationFrame(() => {
      this.renderDirty = false;
      this.stepScene(0.016);
      this.renderOnce();
      const done = () => {
        this.renderBusy = false;
        if (this.renderDirty) this.requestRender();
      };
      if (this.isSoftwareGl) {
        this.afterDraw(done);
      } else {
        done();
      }
    });
  }

  afterDraw(cb) {
    const gl = this.renderer?.getContext();
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!this.isRunning) {
        gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  loop = () => {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min(0.08, Math.max(0.004, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (!document.hidden) {
      this.stepScene(dt);
      this.renderOnce();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.loop);
    } else {
      this.frameId = window.requestAnimationFrame(this.loop);
    }
  };

  destroy() {
    this.isDisposed = true;
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.container?.removeEventListener('pointermove', this.onPointerMove);
    this.container?.removeEventListener('pointerleave', this.onPointerLeave);
    this.disposeDynamicResources();
    if (this.surfaceMaps) {
      Object.values(this.surfaceMaps).forEach((tex) => tex?.dispose());
      this.surfaceMaps = null;
    }
    this.stageBackdrop?.geometry?.dispose();
    this.stageBackdrop?.material?.dispose();
    if (this.materials) {
      Object.values(this.materials).forEach((mat) => mat?.dispose());
    }
    this.envTexture?.dispose();
    this.renderer?.dispose();
  }
}
