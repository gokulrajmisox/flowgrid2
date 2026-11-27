import * as THREE from 'three';
import { NURBSCurve } from 'three/addons/curves/NURBSCurve.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { debugGui } from './debugGui.js';

export class AnimatedTube extends THREE.Group {
  uniforms = {
    curveTexture: { value: null },
    stretchRatio: { value: 0 },
  };

  drawStartPercent = 0;
  radius = 0.11;
  mesh = null;
  camera = null;
  startPosPageY = 0;
  endPosPageY = 0;
  targetDrawPercent = 0;

  constructor(camera, isSoftwareGl = false) {
    super();
    this.camera = camera;
    this.isSoftwareGl = isSoftwareGl;

    this.position.y = -3;
    this.position.z = -1;

    const folder = debugGui.addFolder('AnimatedTube');
    folder.add(this, 'drawStartPercent', 0, 1).onChange((value) => {
      this.uniforms.stretchRatio.value = value;
    });
    folder.add(this, 'radius', 0, 1).onChange((value) => {
      this.setRadius(value);
    });

    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.initTube();
  }

  initTube = async () => {
    const loader = new THREE.FileLoader();
    const raw = await loader.loadAsync('/assets/careers/nurbs-curve.json');
    const nurbsJson = JSON.parse(raw);
    this.mesh = this.createTubeMesh(nurbsJson);
    this.add(this.mesh);
    this.onScroll();
    this.resize();
  };

  onScroll = () => {
    const scrollY = window.__flowgridLenis ? window.__flowgridLenis.scroll : window.scrollY;
    this.startPosPageY = window.innerHeight * 0.6;
    this.endPosPageY = this.startPosPageY + window.innerHeight;
    const v = THREE.MathUtils.clamp(
      THREE.MathUtils.inverseLerp(this.startPosPageY, this.endPosPageY, scrollY),
      0,
      1
    );
    this.targetDrawPercent = v;
  };

  resize = () => {
    this.startPosPageY = window.innerHeight * 0.6;
    this.endPosPageY = this.startPosPageY + window.innerHeight;
    if (!this.mesh) return;
    this.mesh.position.x = this.camera.left - 0.16;
    const widthScale = (this.camera.right - this.camera.left) / 20;
    this.mesh.scale.set(widthScale, 1, 1);
  };

  setRadius(value) {
    this.radius = value;
  }

  createTubeMesh(nurbsJson) {
    const curve = this.createNurbsCurve(nurbsJson);

    const data = [];
    const wtt = (vArr) => {
      vArr.forEach((v) => {
        data.push(v.x, v.y, v.z, 0);
      });
    };

    const texSize = 1024;
    const pData = curve.getSpacedPoints(texSize - 1);
    const ffData = curve.computeFrenetFrames(texSize - 1);
    wtt(pData);
    wtt(ffData.tangents);

    const dataTexture = new THREE.DataTexture(
      new Float32Array(data),
      texSize,
      2,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    dataTexture.needsUpdate = true;
    this.uniforms.curveTexture.value = dataTexture;

    const cylinderSegments = this.isSoftwareGl ? 180 : 800;
    const radialSegments = this.isSoftwareGl ? 24 : 64;

    const tubeGeometry = mergeGeometries([
      new THREE.SphereGeometry(
        this.radius,
        radialSegments,
        radialSegments * 0.5,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.5
      ).translate(0, 0.5, 0),
      new THREE.CylinderGeometry(this.radius, this.radius, 1, radialSegments, cylinderSegments, true),
      new THREE.SphereGeometry(
        this.radius,
        radialSegments,
        radialSegments * 0.5,
        0,
        Math.PI * 2,
        Math.PI * 0.5,
        Math.PI * 0.5
      ).translate(0, -0.5, 0),
    ])
      .rotateZ(-Math.PI * 0.5)
      .rotateY(Math.PI * 0.5);

    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: '#6289de',
      roughness: 0.35,
      metalness: 0.1,
      onBeforeCompile: (shader) => {
        shader.uniforms.curveTexture = this.uniforms.curveTexture;
        shader.uniforms.stretchRatio = this.uniforms.stretchRatio;
        shader.vertexShader = `
          uniform sampler2D curveTexture;
          uniform float stretchRatio;
          ${shader.vertexShader}`
          .replace(
            '#include <beginnormal_vertex>',
            `#include <beginnormal_vertex>
            vec3 pos = position;
            vec3 cpos = vec3(0.);
            vec3 ctan = vec3(0.);
            float a = clamp(pos.z + 0.5, 0., 1.) * stretchRatio;
            if (pos.z < -0.5) {
              cpos = vec3(texture(curveTexture, vec2(0., 0.25)));
              ctan = vec3(texture(curveTexture, vec2(0., 0.75)));
              pos.z += 0.5;
            } else if (pos.z >= -0.5) {
              cpos = vec3(texture(curveTexture, vec2(a, 0.25)));
              ctan = vec3(texture(curveTexture, vec2(a, 0.75)));
              pos.z = (pos.z > 0.5) ? (pos.z - 0.5) : 0.;
            }`
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            transformed = pos;
            transformed += cpos;`
          );
      },
    });

    const mesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    mesh.frustumCulled = false;
    return mesh;
  }

  createNurbsCurve(nurbsJson, nurbsDegree = 3) {
    const nurbsPoints = nurbsJson[0].points.map((p) => new THREE.Vector4(p.x, p.y, p.z, p.weight));
    const nurbsKnots = [];
    for (let i = 0; i <= nurbsDegree; i++) {
      nurbsKnots.push(0);
    }
    for (let i = 0, j = nurbsPoints.length; i < j; i++) {
      const knot = (i + 1) / (j - nurbsDegree);
      nurbsKnots.push(THREE.MathUtils.clamp(knot, 0, 1));
    }
    return new NURBSCurve(nurbsDegree, nurbsKnots, nurbsPoints);
  }

  update = (dt) => {
    const safeDt = Math.min(0.05, dt || 0.016);
    this.uniforms.stretchRatio.value = THREE.MathUtils.lerp(
      this.uniforms.stretchRatio.value,
      this.targetDrawPercent,
      safeDt * 10
    );
  };
}
