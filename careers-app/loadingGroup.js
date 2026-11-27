import { CountUp } from 'countup.js';
import * as THREE from 'three';
import { debugGui } from './debugGui.js';
import { loadShader } from './utils/shaderLoader.js';
import { pagePixelsToWorldUnit, pageToWorldCoords } from './utils/utils.js';

const LOADING_CONTENT_ID = 'loading-content';
const HOME_CONTENT_ID = 'home-content';

export default class LoadingGroup extends THREE.Group {
  letterRotation = { value: 0 };
  letterScale = { value: 1 };
  backgroundAlpha = { value: 1 };
  loadingProgress = { value: 0, target: 0 };
  postLoadSequenceProgress = { value: 0 };
  isSequenceFinished = false;
  loadingContentEl = document.getElementById(LOADING_CONTENT_ID);
  homeContentEl = document.getElementById(HOME_CONTENT_ID);

  constructor(camera, onDoneLoadSequence) {
    super();
    this.camera = camera;
    this.onDoneLoadSequence = onDoneLoadSequence;

    const autostart = new URLSearchParams(window.location.search).get('autostart') === '1';

    if (autostart) {
      this.finishImmediately();
      return;
    }

    document.body.classList.add('no-scroll');

    THREE.DefaultLoadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
      const percent = itemsTotal > 0 ? itemsLoaded / itemsTotal : 1;
      if (this.countUp) {
        this.countUp.update(Math.round(percent * 100));
      }
      this.loadingProgress.target = Math.max(this.loadingProgress.target, percent);
    };

    THREE.DefaultLoadingManager.onLoad = () => {
      if (this.countUp) this.countUp.update(100);
      this.loadingProgress.target = 1;
    };

    this.initOdometer();
    this.initMesh(camera);
    this.initDebug();

    // Ensure progress reaches 100% cleanly even if assets load from cache quickly
    window.setTimeout(() => {
      if (!this.isSequenceFinished && this.loadingProgress.target < 1) {
        if (this.countUp) this.countUp.update(100);
        this.loadingProgress.target = 1;
      }
    }, 900);
  }

  finishImmediately = () => {
    this.isSequenceFinished = true;
    this.loadingProgress.value = 1;
    this.loadingProgress.target = 1;
    this.postLoadSequenceProgress.value = 1;
    document.body.classList.remove('no-scroll');
    this.loadingContentEl?.remove();
    this.homeContentEl?.classList.remove('fade-out');
    window.setTimeout(() => this.onDoneLoadSequence?.(), 0);
  };

  initOdometer = () => {
    if (!this.loadingContentEl) return;
    this.countUp = new CountUp(this.loadingContentEl, 100, {
      duration: 1.0,
      formattingFn: (n) => n.toString().padStart(3, '0'),
    });
    this.countUp.start();
  };

  initMesh = async (camera) => {
    const [vertexShader, fragmentShader] = await Promise.all([
      loadShader('loadingMeshVert.glsl'),
      loadShader('loadingMeshFrag.glsl'),
    ]);
    if (this.isSequenceFinished) return;

    const pos = pageToWorldCoords(window.innerWidth * 0.5, window.innerHeight * 0.5, camera);
    const width = pagePixelsToWorldUnit(window.innerWidth, camera);
    const height = pagePixelsToWorldUnit(window.innerHeight, camera);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      uniforms: {
        aspect: { value: window.innerWidth / window.innerHeight },
        letterRotation: this.letterRotation,
        letterScale: this.letterScale,
        backgroundAlpha: this.backgroundAlpha,
        loadingProgress: this.loadingProgress,
        postLoadSequenceProgress: this.postLoadSequenceProgress,
      },
      transparent: true,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.material);
    this.mesh.renderOrder = 1000;
    this.mesh.position.copy(pos);
    this.add(this.mesh);
  };

  resize = () => {
    if (!this.mesh || !this.material) return;
    this.material.uniforms.aspect.value = window.innerWidth / window.innerHeight;
    const pos = pageToWorldCoords(window.innerWidth * 0.5, window.innerHeight * 0.5, this.camera);
    const width = pagePixelsToWorldUnit(window.innerWidth, this.camera);
    const height = pagePixelsToWorldUnit(window.innerHeight, this.camera);
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.PlaneGeometry(width, height);
    this.mesh.position.copy(pos);
  };

  initDebug() {
    const folder = debugGui.addFolder('Loading');
    folder.add(this.letterRotation, 'value', -Math.PI / 2, 0).name('Letter rotation');
    folder.add(this.letterScale, 'value', 1, 10).name('Letter scale');
    folder.add(this.backgroundAlpha, 'value', 0, 1).name('Background alpha');
    folder.add(this.loadingProgress, 'value', 0, 1).name('Loading progress');
    folder.add(this.postLoadSequenceProgress, 'value', 0, 1).name('Post load sequence');
  }

  update = (dt) => {
    if (this.isSequenceFinished) {
      return;
    }

    const safeDt = Math.min(0.1, dt || 0.016);
    this.loadingProgress.value = THREE.MathUtils.lerp(
      this.loadingProgress.value,
      this.loadingProgress.target,
      Math.min(1, safeDt * 10)
    );
    if (this.loadingProgress.target >= 1 && this.loadingProgress.value >= 0.98) {
      this.loadingProgress.value = 1;
    } else {
      this.loadingProgress.value = Math.min(this.loadingProgress.value + 0.002, 1);
    }

    if (this.loadingProgress.value >= 1) {
      this.postLoadSequenceProgress.value += safeDt * 0.9;
      this.postLoadSequenceProgress.value = Math.min(this.postLoadSequenceProgress.value, 1);

      if (this.postLoadSequenceProgress.value >= 1) {
        this.isSequenceFinished = true;
        document.body.classList.remove('no-scroll');
        this.loadingContentEl?.remove();
        this.homeContentEl?.classList.remove('fade-out');
        this.onDoneLoadSequence?.();
      }
    }
  };
}
