import * as THREE from 'three';
import { Vector4 } from 'three';
import { debugGui } from './debugGui.js';
import { loadShader } from './utils/shaderLoader.js';
import {
  createVideoTexture,
  elementToLocalRect,
  elementToWorldRect,
  getElementPageCoords,
  pagePixelsToWorldUnit,
} from './utils/utils.js';

const PANEL_START_ID = 'video-panel-start';
const PANEL_END_ID = 'video-panel-end';
const PANEL_END_PARENT_ID = 'video-panel-end-parent';
const SIZE = 1;
const SUBDIVISIONS = 32;

export default class VideoPanelShader extends THREE.Group {
  animateProgress = { value: 0 };
  borderRadius = { value: 0.085 };
  tintColour = { value: new THREE.Color(0.6, 0.6, 1.0) };

  constructor(camera) {
    super();
    this.camera = camera;
    this.scrollPositionAnimStart = 0;
    this.scrollPositionAnimEnd = 1;
    this.scrollPositionAnimFollowEnd = 2;

    this.initPanel();
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.initDebug();
  }

  initPanel = async () => {
    const [vertexShader, fragmentShader] = await Promise.all([
      loadShader('videoPanelVert.glsl'),
      loadShader('videoPanelFrag.glsl'),
    ]);

    const startWorldRect = elementToWorldRect(PANEL_START_ID, this.camera);
    this.position.copy(startWorldRect.position);
    this.updateMatrixWorld();

    const videoSrc =
      window.innerWidth <= 812
        ? '/assets/textures/reel/mobile.mp4'
        : '/assets/textures/reel/desktop.mp4';
    const videoTexture = createVideoTexture(videoSrc);
    const startRectLocal = elementToLocalRect(PANEL_START_ID, this, this.camera);
    const endRectLocal = elementToLocalRect(PANEL_END_ID, this, this.camera);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        startRect: { value: VideoPanelShader.rectToVec4(startRectLocal) },
        endRect: { value: VideoPanelShader.rectToVec4(endRectLocal) },
        animateProgress: this.animateProgress,
        borderRadius: this.borderRadius,
        tintColour: this.tintColour,
        map: { value: videoTexture },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
    });

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(SIZE, SIZE, SUBDIVISIONS, SUBDIVISIONS),
      this.material
    );
    this.mesh.frustumCulled = false;
    this.add(this.mesh);

    this.calculateElementValues();
    this.onScroll();
  };

  calculateElementValues() {
    const scrollY = window.__flowgridLenis ? window.__flowgridLenis.scroll : window.scrollY;
    this.scrollPositionAnimStart =
      getElementPageCoords(PANEL_START_ID).y + scrollY - window.innerHeight * 0.5;
    this.scrollPositionAnimEnd =
      getElementPageCoords(PANEL_END_ID).y + scrollY - window.innerHeight * 0.5;
    this.scrollPositionAnimFollowEnd =
      getElementPageCoords(PANEL_END_PARENT_ID).y + scrollY - window.innerHeight * 0.5;
  }

  onScroll = () => {
    if (!this.mesh) return;
    const scrollY = window.__flowgridLenis ? window.__flowgridLenis.scroll : window.scrollY;
    const denom = this.scrollPositionAnimEnd - this.scrollPositionAnimStart;
    this.animateProgress.value =
      Math.abs(denom) > 1
        ? THREE.MathUtils.inverseLerp(
            this.scrollPositionAnimStart,
            this.scrollPositionAnimEnd,
            scrollY
          )
        : 0;
    this.animateProgress.value = THREE.MathUtils.clamp(this.animateProgress.value, 0, 1);

    const distanceWorld = pagePixelsToWorldUnit(
      this.scrollPositionAnimFollowEnd - this.scrollPositionAnimEnd,
      this.camera
    );
    let positionFollowAmount = THREE.MathUtils.inverseLerp(
      this.scrollPositionAnimEnd,
      this.scrollPositionAnimFollowEnd,
      scrollY
    );
    positionFollowAmount = THREE.MathUtils.clamp(positionFollowAmount, 0, 1);
    this.mesh.position.y = -positionFollowAmount * distanceWorld;
  };

  initDebug = () => {
    const folder = debugGui.addFolder('Video Panel Shader');
    folder.add(this.animateProgress, 'value', 0, 1).name('Mask progress');
    folder.add(this.borderRadius, 'value', 0, 1).name('Border radius');
    folder.addColor(this.tintColour, 'value').name('Tint colour');
  };

  static rectToVec4(rect) {
    return new Vector4(rect.position.x, rect.position.y, rect.height, rect.width);
  }

  resize = () => {
    if (!this.material) return;
    const startWorldRect = elementToWorldRect(PANEL_START_ID, this.camera);
    this.position.copy(startWorldRect.position);
    this.updateMatrixWorld();
    this.calculateElementValues();
    const startRectLocal = elementToLocalRect(PANEL_START_ID, this, this.camera);
    const endRectLocal = elementToLocalRect(PANEL_END_ID, this, this.camera);
    this.material.uniforms.startRect.value = VideoPanelShader.rectToVec4(startRectLocal);
    this.material.uniforms.endRect.value = VideoPanelShader.rectToVec4(endRectLocal);
    this.onScroll();
  };

  update = () => {};
}
