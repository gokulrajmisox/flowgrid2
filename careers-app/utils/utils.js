import * as THREE from 'three';

export function detectSoftwareWebGL() {
  try {
    const probe = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!probe) return true;
    const ext = probe.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
    const rendererStr = String(probe.getParameter(param) || '');
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return true;
  }
}

export function pageToWorldCoords(pageX, pageY, camera) {
  const normalisedScreenCoordsX = (pageX / window.innerWidth) * 2 - 1;
  const normalisedScreenCoordsY = -(pageY / window.innerHeight) * 2 + 1;
  const nearRelativeToCam = camera.near + camera.position.z;
  const farRelativeToCam = -camera.far - camera.position.z;
  const t = THREE.MathUtils.inverseLerp(farRelativeToCam, nearRelativeToCam, -camera.position.z);
  const screenPos = new THREE.Vector3(normalisedScreenCoordsX, normalisedScreenCoordsY, -t);
  screenPos.unproject(camera);
  return screenPos;
}

export function pagePixelsToWorldUnit(pagePixels, camera) {
  const camViewHeight = camera.top - camera.bottom;
  const worldUnitsPerPixel = camViewHeight / window.innerHeight;
  return pagePixels * worldUnitsPerPixel;
}

export function updateCameraIntrisics(cameraRef, frustum) {
  const aspect = window.innerWidth / window.innerHeight;
  const horizontal = (frustum * aspect) / 2;
  const vertical = frustum / 2;
  cameraRef.left = -horizontal;
  cameraRef.right = horizontal;
  cameraRef.top = vertical;
  cameraRef.bottom = -vertical;
  cameraRef.updateMatrixWorld();
  cameraRef.updateProjectionMatrix();
}

export function createBevelledPlane(width, height, radius) {
  const w = Math.max(0.01, width);
  const h = Math.max(0.01, height);
  const r = Math.min(radius, w * 0.45, h * 0.45);
  const x = w / 2;
  const y = h / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-x + r, y);
  shape.lineTo(x - r, y);
  shape.quadraticCurveTo(x, y, x, y - r);
  shape.lineTo(x, -y + r);
  shape.quadraticCurveTo(x, -y, x - r, -y);
  shape.lineTo(-x + r, -y);
  shape.quadraticCurveTo(-x, -y, -x, -y + r);
  shape.lineTo(-x, y - r);
  shape.quadraticCurveTo(-x, y, -x + r, y);

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.computeBoundingBox();

  const bbox = geometry.boundingBox;
  const minX = bbox.min.x;
  const maxX = bbox.max.x;
  const minY = bbox.min.y;
  const maxY = bbox.max.y;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  geometry.attributes.uv = new THREE.BufferAttribute(
    new Float32Array(geometry.attributes.position.count * 2),
    2
  );
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const px = geometry.attributes.position.getX(i);
    const py = geometry.attributes.position.getY(i);
    const u = (px - minX) / rangeX;
    const v = (py - minY) / rangeY;
    geometry.attributes.uv.setXY(i, u, v);
  }
  return geometry;
}

export function getElementPageCoords(elementId, anchor = { x: 0.5, y: 0.5 }) {
  const element = document.getElementById(elementId);
  if (!element) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }
  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const x = rect.left + width * anchor.x;
  const y = rect.top + height * anchor.y;
  return { x, y, width, height };
}

export function elementToWorldRect(elementId, camera, anchor = { x: 0.5, y: 0.5 }) {
  const elementPageCoords = getElementPageCoords(elementId, anchor);
  const position = pageToWorldCoords(elementPageCoords.x, elementPageCoords.y, camera);
  const width = pagePixelsToWorldUnit(elementPageCoords.width, camera);
  const height = pagePixelsToWorldUnit(elementPageCoords.height, camera);
  return { position, width, height };
}

export function elementToLocalRect(elementId, parent, camera) {
  const worldRect = elementToWorldRect(elementId, camera, { x: 0, y: 0 });
  const { position, width, height } = worldRect;
  parent.worldToLocal(position);
  return { position, width, height };
}

export function createVideoTexture(src) {
  const video = document.createElement('video');
  video.src = src;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('playsinline', '');
  video.setAttribute('muted', '');
  video.play().catch(() => {});

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
