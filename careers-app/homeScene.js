import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { AnimatedTube } from './animatedTube.js';
import { debugGui } from './debugGui.js';
import LoadingGroup from './loadingGroup.js';
import PhysicsSandbox from './physicsSandbox.js';
import ProjectTiles from './projectTiles.js';
import { detectSoftwareWebGL, updateCameraIntrisics } from './utils/utils.js';
import VideoPanelShader from './videoPanelShader.js';

class HomeScene {
  frustumSize = 10;
  lastTick = performance.now();
  isSoftwareGl = detectSoftwareWebGL();
  isModalTransitioning = false;
  gl = null;
  pendingFence = null;
  lastFrameTime = 0;

  constructor() {
    this.initThree();
    if (!this.renderer) return;

    window.setTimeout(() => {
      this.initScene();
    }, 1);

    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onWindowResized, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this.onWindowResized());
    }
    const homeContent = document.getElementById('home-content');
    if (homeContent && typeof ResizeObserver !== 'undefined') {
      let pendingRaf = 0;
      this.layoutObserver = new ResizeObserver(() => {
        if (this.isModalTransitioning || pendingRaf) return;
        pendingRaf = requestAnimationFrame(() => {
          pendingRaf = 0;
          if (!this.isModalTransitioning) {
            this.onWindowResized();
          }
        });
      });
      this.layoutObserver.observe(homeContent);
    }
  }

  initThree = () => {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    try {
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !this.isSoftwareGl,
        canvas,
        stencil: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setClearColor(0x000000, 0);
    } catch {
      this.handleWebGLFailure();
      return;
    }

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.handleWebGLFailure();
    });

    this.gl = this.renderer.getContext();
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }

    this.camera = new THREE.OrthographicCamera();
    this.camera.near = 0;
    this.camera.far = 1000;
    this.camera.position.z = 10;
    updateCameraIntrisics(this.camera, this.frustumSize);
    this.onScroll();

    this.scene = new THREE.Scene();

    // Subtle key light for PhysicsSandbox and AnimatedTube even before HDR finishes loading
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
    dirLight.position.set(4, 8, 10);
    this.scene.add(dirLight);
    const ambientLight = new THREE.AmbientLight(0xdce2ff, 0.55);
    this.scene.add(ambientLight);

    new HDRLoader().load(
      '/assets/careers/hdri/quarry_01_1k.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = texture;
      },
      undefined,
      () => {
        // Fallback directional/ambient lighting already attached
      }
    );

    window.__flowgridFrameCallbacks = window.__flowgridFrameCallbacks || [];
    window.__flowgridFrameCallbacks.push(this.tickFrame);
  };

  handleWebGLFailure = () => {
    document.body.classList.remove('no-scroll');
    document.getElementById('loading-content')?.remove();
    document.getElementById('home-content')?.classList.remove('fade-out');
  };

  initScene = () => {
    this.loadingGroup = new LoadingGroup(this.camera, () => {
      if (this.loadingGroup) {
        this.scene.remove(this.loadingGroup);
        this.loadingGroup = undefined;
      }
      this.onWindowResized();
    });
    this.scene.add(this.loadingGroup);

    this.physicsSandbox = new PhysicsSandbox(this.camera, this.isSoftwareGl);
    this.scene.add(this.physicsSandbox);

    this.animatedTube = new AnimatedTube(this.camera, this.isSoftwareGl);
    this.scene.add(this.animatedTube);

    this.videoPanel = new VideoPanelShader(this.camera);
    this.scene.add(this.videoPanel);

    this.projectTiles = new ProjectTiles(this, this.isSoftwareGl);
    this.scene.add(this.projectTiles);

    this.initDebug();
  };

  getScrollY = () => (window.__flowgridLenis ? window.__flowgridLenis.scroll : window.scrollY);

  onScroll = () => {
    if (this.isModalTransitioning || !this.camera) return;
    const scrollY = this.getScrollY();
    this.camera.position.y = (-scrollY / Math.max(1, window.innerHeight)) * this.frustumSize;
    this.camera.updateMatrixWorld();
  };

  setCameraFrustumSize = (frustumSize) => {
    this.frustumSize = frustumSize;
    updateCameraIntrisics(this.camera, this.frustumSize);
  };

  onWindowResized = () => {
    if (!this.renderer || !this.camera || this.isModalTransitioning) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.onScroll();
    updateCameraIntrisics(this.camera, this.frustumSize);
    this.loadingGroup?.resize();
    this.physicsSandbox?.resize();
    this.animatedTube?.resize();
    this.videoPanel?.resize();
    this.projectTiles?.resize();
  };

  animate = () => {
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0.001, (now - this.lastTick) / 1000));
    this.lastTick = now;
    if (!this.isModalTransitioning) {
      this.onScroll();
      this.animatedTube?.onScroll();
      this.videoPanel?.onScroll();
    }
    this.loadingGroup?.update(dt);
    this.physicsSandbox?.update(dt);
    this.animatedTube?.update(dt);
    this.videoPanel?.update(dt);
    this.projectTiles?.update(dt, this.renderer);
    this.renderer.render(this.scene, this.camera);
  };

  tickFrame = (now = performance.now()) => {
    if (document.hidden || !this.renderer) return;
    const scrollY = this.getScrollY();
    const scrollChanged = Math.abs(scrollY - (this.lastRenderedScrollY ?? -1)) > 0.25;
    if (this.isSoftwareGl && !scrollChanged && !this.isModalTransitioning && now - this.lastFrameTime < 33) {
      return;
    }
    this.lastFrameTime = now;
    this.lastRenderedScrollY = scrollY;
    this.animate();
  };

  initDebug = () => {
    const folder = debugGui.addFolder('Scene');
    folder.add(this, 'frustumSize', 0, 100).onChange(this.setCameraFrustumSize);
  };
}

new HomeScene();
