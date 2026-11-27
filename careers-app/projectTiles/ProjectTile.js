import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { debugGui } from '../debugGui.js';
import { animateAsync, randomSign, waitAsync } from '../utils/animationUtils.js';
import { loadShader } from '../utils/shaderLoader.js';
import { elementToWorldRect } from '../utils/utils.js';

const ASPECT = 16 / 9;
const DEFAULT_BG_COLOUR = '#eee';
const DEFAULT_CAM_POS = new THREE.Vector3(0, 0, 4);
const CAMERA_LOOKAT = new THREE.Vector3(0, 0, 0);
const CAMERA_MOVEMENT_COEF = 0.6;
const HORIZONTAL_MASK_CLOSED = 0.5;
const HORIZONTAL_MASK_OPEN = 0;

let sharedHdrPromise = null;
function loadSharedEnvironment() {
  if (!sharedHdrPromise) {
    sharedHdrPromise = new HDRLoader()
      .loadAsync('/assets/careers/hdri/studio_small_08_1k.hdr')
      .then((texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        return texture;
      });
  }
  return sharedHdrPromise;
}

export default class ProjectTile extends THREE.Group {
  elementId;
  homeScene;
  role;
  onOpenModal;
  portalCamera = new THREE.PerspectiveCamera(45, ASPECT);
  portalScene = new THREE.Scene();
  stretchAmount = { value: 0.0, targetValue: 0.0 };
  maskAmount = { value: HORIZONTAL_MASK_CLOSED, targetValue: HORIZONTAL_MASK_CLOSED };
  isIntersecting = false;
  needsPortalRender = true;
  isModalOpen = false;
  isTransitioning = false;

  get renderTexture() {
    return this.renderTarget.texture;
  }

  constructor(
    elementId,
    homeScene,
    { role = null, onOpenModal = null, onModalShown = null, onCloseModal = null, isSoftwareGl = false } = {}
  ) {
    super();
    this.elementId = elementId;
    this.homeScene = homeScene;
    this.role = role;
    this.onOpenModal = onOpenModal;
    this.onModalShown = onModalShown;
    this.onCloseModal = onCloseModal;
    this.isSoftwareGl = isSoftwareGl;

    const rtWidth = isSoftwareGl ? 512 : 2048;
    const rtHeight = Math.round(rtWidth / ASPECT);
    this.renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    this.initPortalScene();
    this.tileReadyPromise = this.initTileMesh();
    this.initIntersectionObserver();

    const thumbEl = document.getElementById(elementId);
    const cardEl = thumbEl?.closest('.project-tile') || thumbEl;
    this.thumbEl = thumbEl;
    this.cardEl = cardEl;

    if (thumbEl) {
      thumbEl.addEventListener('mousemove', this.onMouseMove);
      thumbEl.addEventListener('mouseleave', this.onMouseLeave);
    }
    if (cardEl) {
      cardEl.addEventListener('click', this.onClick);
      cardEl.addEventListener('keydown', this.onKeyDown);
    }

    this.initDebug();
  }

  initPortalScene = async () => {
    this.portalScene.background = new THREE.Color(DEFAULT_BG_COLOUR);
    this.targetCameraPosition = DEFAULT_CAM_POS.clone();
    this.portalCamera.position.copy(DEFAULT_CAM_POS);
    this.portalCamera.lookAt(CAMERA_LOOKAT);
    this.needsPortalRender = true;

    try {
      const texture = await loadSharedEnvironment();
      this.portalScene.environment = texture;
      this.portalScene.environmentIntensity = 0.8;
      this.needsPortalRender = true;
    } catch {
      // Non-fatal fallback if HDR environment fails to load
    }
  };

  setThumbnailImage = (imageUrl) => {
    const loader = new THREE.TextureLoader();
    loader.load(imageUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      // Oversized 16:9 plane ensures hover parallax (+/- 0.6) never exposes background edges
      const planeHeight = 4.9;
      const planeWidth = planeHeight * ASPECT;
      const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 1, 1);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, 0, 0);
      this.addToPortalScene(mesh);
      this.needsPortalRender = true;
    });
  };

  initTileMesh = async () => {
    const [vertexShader, fragmentShader] = await Promise.all([
      loadShader('projectTileVert.glsl'),
      loadShader('projectTileFrag.glsl'),
    ]);

    this.tileWorldRect = elementToWorldRect(this.elementId, this.homeScene.camera);
    this.tileMeshMat = new THREE.ShaderMaterial({
      uniforms: {
        maskAmount: this.maskAmount,
        aspect: { value: this.tileWorldRect.width / Math.max(0.001, this.tileWorldRect.height) },
        stretchAmount: this.stretchAmount,
        map: { value: this.renderTexture },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
    });

    this.tileMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(this.tileWorldRect.width, this.tileWorldRect.height, 64),
      this.tileMeshMat
    );
    this.tileMesh.position.copy(this.tileWorldRect.position);
    this.add(this.tileMesh);
  };

  initIntersectionObserver = () => {
    const target = document.getElementById(this.elementId);
    if (!target) return;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        this.isIntersecting = entry.isIntersecting;
        this.maskAmount.targetValue = entry.isIntersecting
          ? HORIZONTAL_MASK_OPEN
          : HORIZONTAL_MASK_CLOSED;
        if (entry.isIntersecting) {
          this.needsPortalRender = true;
        }
      });
    });
    this.observer.observe(target);
  };

  addToPortalScene = (object) => {
    this.portalScene.add(object);
    this.needsPortalRender = true;
  };

  onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xAbs = e.clientX - rect.left;
    const yAbs = e.clientY - rect.top;
    let x = xAbs / rect.width;
    let y = yAbs / rect.height;
    x = (x - 0.5) * 2 * CAMERA_MOVEMENT_COEF;
    y = (y - 0.5) * 2 * CAMERA_MOVEMENT_COEF;
    this.targetCameraPosition.x = DEFAULT_CAM_POS.x + x;
    this.targetCameraPosition.y = DEFAULT_CAM_POS.y - y;
    this.targetCameraPosition.z = DEFAULT_CAM_POS.z;
    this.needsPortalRender = true;
  };

  onMouseLeave = () => {
    this.targetCameraPosition.copy(DEFAULT_CAM_POS);
    this.needsPortalRender = true;
  };

  onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.onClick();
    }
  };

  onClick = async () => {
    if (!this.tileMesh || this.isTransitioning || this.isModalOpen || this.homeScene.isModalTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.homeScene.isModalTransitioning = true;

    const addCssClass = (isForward) => {
      const homeContent = document.getElementById('home-content');
      if (isForward) {
        document.body.classList.add('no-scroll');
        homeContent?.classList.add('fade-out');
      } else {
        document.body.classList.remove('no-scroll');
        homeContent?.classList.remove('fade-out');
      }
    };

    const zoomSequence = async (
      portalCamTargetZoom,
      pageCamTargetFrustum,
      pageCamTargetPosition,
      pageCamTargetRotationZ,
      isForward
    ) => {
      const portalCamStartZoom = this.portalCamera.zoom;
      const pageCamStartFrustum = this.homeScene.frustumSize;
      const pageCamStartPosition = this.homeScene.camera.position.clone();
      const pageCamStartRotationZ = this.homeScene.camera.rotation.z;

      await animateAsync(500, (percent) => {
        const portalCamZoom = THREE.MathUtils.lerp(portalCamStartZoom, portalCamTargetZoom, percent);
        const pageCamFrustum = THREE.MathUtils.lerp(pageCamStartFrustum, pageCamTargetFrustum, percent);
        const pageCamRotationZ = THREE.MathUtils.lerp(pageCamStartRotationZ, pageCamTargetRotationZ, percent);

        this.homeScene.setCameraFrustumSize(pageCamFrustum);
        this.homeScene.camera.position.lerpVectors(pageCamStartPosition, pageCamTargetPosition, percent);
        this.homeScene.camera.rotation.z = pageCamRotationZ;

        this.portalCamera.zoom = portalCamZoom;
        this.portalCamera.updateProjectionMatrix();
        this.portalScene.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.opacity = isForward ? 1 - percent : percent;
          }
        });
        this.needsPortalRender = true;
      });
    };

    const portalCamStartZoom = this.portalCamera.zoom;
    const pageCamStartFrustumSize = this.homeScene.frustumSize;
    const pageCamStartPosition = this.homeScene.camera.position.clone();
    const pageCamStartRotationZ = this.homeScene.camera.rotation.z;

    const modalEl = document.getElementById('project-tile-modal');
    const homeContentEl = document.getElementById('home-content');
    const buttons = Array.from(document.getElementsByClassName('project-tile-back-button'));

    const cleanupModalListeners = () => {
      buttons.forEach((button) => button.removeEventListener('click', onBack));
      window.removeEventListener('keydown', onEscape);
    };

    const onEscape = (e) => {
      if (e.key === 'Escape') {
        onBack(e, true);
      }
    };

    const onBack = async (e, restoreFocus = false) => {
      e?.preventDefault();
      if (this.isTransitioning || !this.isModalOpen) return;
      this.isTransitioning = true;
      cleanupModalListeners();

      this.onCloseModal?.();
      modalEl?.classList.remove('show');
      modalEl?.setAttribute('aria-hidden', 'true');
      await waitAsync(650);
      await zoomSequence(
        portalCamStartZoom,
        pageCamStartFrustumSize,
        pageCamStartPosition,
        pageCamStartRotationZ,
        false
      );
      addCssClass(false);
      if (homeContentEl) {
        homeContentEl.style.visibility = 'visible';
      }
      this.homeScene.onScroll();
      this.isModalOpen = false;
      this.isTransitioning = false;
      this.homeScene.isModalTransitioning = false;
      if (restoreFocus) {
        this.cardEl?.focus({ preventScroll: true });
      }
    };

    this.onOpenModal?.(this.role);

    addCssClass(true);
    await waitAsync(600);
    await zoomSequence(
      3,
      this.calculatePageCamTargetFrustum(),
      this.tileMesh.position.clone(),
      randomSign() * 0.1,
      true
    );

    if (homeContentEl) {
      homeContentEl.style.visibility = 'hidden';
    }
    if (modalEl) {
      modalEl.scrollTop = 0;
      modalEl.classList.add('show');
      modalEl.setAttribute('aria-hidden', 'false');
    }
    this.onModalShown?.(this.role);

    this.isModalOpen = true;
    this.isTransitioning = false;

    buttons.forEach((button) => button.addEventListener('click', onBack));
    window.addEventListener('keydown', onEscape);
  };

  calculatePageCamTargetFrustum = () => {
    const el = document.getElementById(this.elementId);
    const height = el ? el.getBoundingClientRect().height : window.innerHeight * 0.4;
    const ratio = height / Math.max(1, window.innerHeight);
    const fudge = 0.4;
    return Math.max(0.8, this.homeScene.frustumSize * ratio - fudge);
  };

  initDebug = () => {
    const folder = debugGui.addFolder('Project Tile');
    folder.add(this.maskAmount, 'value', -1, 1).name('Mask amount');
    folder.add(this.stretchAmount, 'value', -1, 1).name('Stretch amount');
  };

  resize = () => {
    if (!this.tileMesh || !this.tileMeshMat) return;
    this.tileWorldRect = elementToWorldRect(this.elementId, this.homeScene.camera);
    this.remove(this.tileMesh);
    this.tileMesh.geometry.dispose();
    this.tileMeshMat.uniforms.aspect.value =
      this.tileWorldRect.width / Math.max(0.001, this.tileWorldRect.height);
    this.tileMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(this.tileWorldRect.width, this.tileWorldRect.height, 64),
      this.tileMeshMat
    );
    this.tileMesh.position.copy(this.tileWorldRect.position);
    this.add(this.tileMesh);
    this.needsPortalRender = true;
  };

  update(dt, renderer) {
    const safeDt = Math.min(0.05, dt || 0.016);
    const camMoved = this.portalCamera.position.distanceToSquared(this.targetCameraPosition) > 0.00001;
    if (camMoved) {
      this.portalCamera.position.lerp(this.targetCameraPosition, safeDt * 10);
      this.needsPortalRender = true;
    }

    this.maskAmount.value = THREE.MathUtils.lerp(
      this.maskAmount.value,
      this.maskAmount.targetValue,
      safeDt * 8
    );
    this.updateStretchAmount(safeDt);

    const shouldRenderOffscreen =
      this.needsPortalRender || (this.isIntersecting && !this.isSoftwareGl) || this.isTransitioning;

    if (shouldRenderOffscreen) {
      renderer.setRenderTarget(this.renderTarget);
      renderer.render(this.portalScene, this.portalCamera);
      renderer.setRenderTarget(null);
      if (!camMoved && !this.isTransitioning) {
        this.needsPortalRender = false;
      }
    }
  }

  updateStretchAmount(dt) {
    const scrollY = window.__flowgridLenis ? window.__flowgridLenis.scroll : window.scrollY;
    if (this.lastScrollPosition !== undefined && this.lastScrollPosition !== scrollY) {
      const distance = scrollY - this.lastScrollPosition;
      const speed = distance / Math.max(0.001, dt);
      this.stretchAmount.targetValue = THREE.MathUtils.clamp(speed * 0.000018, -0.09, 0.09);
    } else {
      this.stretchAmount.targetValue = 0;
    }
    this.lastScrollPosition = scrollY;
    this.stretchAmount.value = THREE.MathUtils.lerp(
      this.stretchAmount.value,
      this.stretchAmount.targetValue,
      dt * 5
    );
  }

  cleanup() {
    this.observer?.disconnect();
    this.renderTarget?.dispose();
    this.tileMeshMat?.dispose();
    this.tileMesh?.geometry?.dispose();
    this.thumbEl?.removeEventListener('mousemove', this.onMouseMove);
    this.thumbEl?.removeEventListener('mouseleave', this.onMouseLeave);
    this.cardEl?.removeEventListener('click', this.onClick);
    this.cardEl?.removeEventListener('keydown', this.onKeyDown);
  }
}
