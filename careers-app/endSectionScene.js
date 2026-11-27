import * as THREE from 'three';
import {
  computeCardVisorFrame,
  computeDiamondInstances,
  computeEndSceneBudget,
  computeStickerInstances,
  DIAMOND_FACET_PLANES,
  parseBufPayload,
} from './endSectionUtils.js';
import { detectSoftwareWebGL } from './utils/utils.js';

const BONE_COUNT = 53;
const IDLE_FRAME_START = 140;
const IDLE_FRAME_END = 287;
const ASTRONAUT_BASE_Z = 23.0;
const ASTRONAUT_OFFSET_Y_DESKTOP = -0.4;
const ASTRONAUT_OFFSET_Y_MOBILE = -0.15;

const ASTRONAUT_VERTEX_SHADER = /* glsl */ `
#define BONE_COUNT 53
#define PI 3.14159265359

uniform float u_time;
uniform sampler2D u_animationPositionTexture;
uniform sampler2D u_animationOrientTexture;
uniform vec2 u_animationTextureSize;

attribute vec2 boneIndices;
attribute vec2 boneWeights;
attribute vec4 tangent;
attribute float ao;
attribute vec3 instancePos;
attribute vec4 instanceOrient;
attribute vec3 instanceAnimationFrameFromToBlend;

varying vec3 v_worldPosition;
varying vec4 v_worldTangent;
varying vec3 v_worldNormal;
varying vec2 v_uv;
varying float v_ao;

vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
  return normalize((vec4(dir, 0.0) * matrix).xyz);
}

vec3 qrotate(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

void computeTransform(inout vec3 pos, inout vec3 nor, inout vec3 tang, vec4 uvBone12) {
  vec3 bonePos1 = texture2D(u_animationPositionTexture, uvBone12.xy).xyz;
  vec3 bonePos2 = texture2D(u_animationPositionTexture, uvBone12.zw).xyz;
  vec4 boneOrient1 = texture2D(u_animationOrientTexture, uvBone12.xy);
  vec4 boneOrient2 = texture2D(u_animationOrientTexture, uvBone12.zw);

  pos = (qrotate(boneOrient1, pos) + bonePos1) * boneWeights.x +
        (qrotate(boneOrient2, pos) + bonePos2) * boneWeights.y;
  nor = normalize(qrotate(boneOrient1, nor) * boneWeights.x + qrotate(boneOrient2, nor) * boneWeights.y);
  tang = normalize(qrotate(boneOrient1, tang) * boneWeights.x + qrotate(boneOrient2, tang) * boneWeights.y);
}

void computeFrameTransform(inout vec3 pos, inout vec3 nor, inout vec3 tang, vec3 animBlend) {
  vec4 dataOffset = boneIndices.xyxy + animBlend.xxyy * float(BONE_COUNT) + 0.5;
  vec4 fromUvsBone12 = vec4(
    floor(mod(dataOffset.xy, u_animationTextureSize.x)) + 0.5,
    floor(dataOffset.xy / u_animationTextureSize.x) + 0.5
  ).xzyw / u_animationTextureSize.xyxy;
  vec4 toUvsBone12 = vec4(
    floor(mod(dataOffset.zw, u_animationTextureSize.x)) + 0.5,
    floor(dataOffset.zw / u_animationTextureSize.x) + 0.5
  ).xzyw / u_animationTextureSize.xyxy;

  vec3 fromPos = pos;
  vec3 fromNor = nor;
  vec3 fromTang = tang;
  computeTransform(fromPos, fromNor, fromTang, fromUvsBone12);

  vec3 toPos = pos;
  vec3 toNor = nor;
  vec3 toTang = tang;
  computeTransform(toPos, toNor, toTang, toUvsBone12);

  pos = mix(fromPos, toPos, animBlend.z);
  nor = normalize(mix(fromNor, toNor, animBlend.z));
  tang = normalize(mix(fromTang, toTang, animBlend.z));
}

void main() {
  v_ao = ao;
  vec3 pos = position;
  vec3 nor = normal;
  vec3 tang = tangent.xyz;
  computeFrameTransform(pos, nor, tang, instanceAnimationFrameFromToBlend);

  pos = qrotate(instanceOrient, pos) + instancePos.xyz;
  nor = normalize(qrotate(instanceOrient, nor));
  tang = normalize(qrotate(instanceOrient, tang));

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  v_worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  v_worldTangent = vec4(inverseTransformDirection(normalMatrix * tang, viewMatrix), tangent.w);
  v_worldNormal = inverseTransformDirection(normalMatrix * nor, viewMatrix);
  v_uv = uv;
  gl_Position = projectionMatrix * mvPos;
}
`;

const ASTRONAUT_WHITE_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_armTexture;
uniform sampler2D u_baseTexture;
uniform sampler2D u_norTexture;
uniform sampler2D u_matcapTexture;
uniform sampler2D u_envTexture;
uniform float u_time;
uniform float u_showRatio;
uniform float u_faceLedLight;
uniform vec3 u_bgColor;
uniform vec3 u_cardPosition;
uniform vec3 u_sunPosition;
uniform vec3 u_ambientColor;
uniform vec3 u_faceLedColor;

varying vec3 v_worldPosition;
varying vec4 v_worldTangent;
varying vec3 v_worldNormal;
varying vec2 v_uv;
varying float v_ao;

#ifndef saturate
#define saturate(a) clamp(a, 0.0, 1.0)
#endif

float linearStep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

mat4 rotation3d(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat4(
    oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
    oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0,
    oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

float getMetalShininess(vec3 viewDir, vec3 lightPosition, vec3 worldNormal, float roughness, float metalness) {
  vec3 lightDir = normalize(lightPosition - v_worldPosition);
  vec3 H = normalize(viewDir + lightDir);
  float dotNL = max(0.0, dot(worldNormal, lightDir));
  float dotNH = max(0.0, dot(worldNormal, H));
  float alpha = max(0.01, roughness * roughness);
  float alphaSqr = alpha * alpha;
  float pi = 3.14159;
  float denom = dotNH * dotNH * (alphaSqr - 1.0) + 1.0;
  float D = alphaSqr / (pi * denom * denom);
  float specular = metalness * D * 5.0;
  return specular * dotNL;
}

void main() {
  vec3 worldNormal = normalize(v_worldNormal);
  vec3 worldTangent = normalize(v_worldTangent.xyz);
  vec3 worldBinormal = normalize(cross(worldNormal, worldTangent)) * -v_worldTangent.w;
  worldTangent = normalize(cross(worldBinormal, worldNormal));
  vec3 tangentSpaceNormal = normalize(texture2D(u_norTexture, v_uv).xyz - 0.5);
  worldNormal = normalize(
    tangentSpaceNormal.x * worldTangent +
    tangentSpaceNormal.y * worldBinormal +
    tangentSpaceNormal.z * worldNormal
  );

  vec3 arm = texture2D(u_armTexture, v_uv).rgb;
  float baseAlbedo = texture2D(u_baseTexture, v_uv).r;
  float ao = v_ao * arm.r;
  float roughness = arm.g;
  float metalness = arm.b;
  float albedo = baseAlbedo;

  vec3 N = worldNormal;
  vec3 V = normalize(cameraPosition - v_worldPosition);
  mat4 frameInRotation = rotation3d(vec3(1.0, 0.0, 0.0), 1.0);
  vec3 viewDir = (vec4(normalize(v_worldPosition), 1.0) * frameInRotation).xyz;
  vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
  vec3 y = cross(viewDir, x);
  vec2 matUv = vec2(dot(x, worldNormal), dot(y, worldNormal)) * 0.495 + 0.5;

  float zAxisShading = linearStep(-0.2, 1.3, worldNormal.z) * (0.65 + ao * 0.35);
  vec3 sunPosition = u_sunPosition;
  vec3 L = normalize(sunPosition - v_worldPosition);
  float sunNdLRaw = dot(N, L);
  float sunNdL = saturate(sunNdLRaw);

  float matcapShading = 0.5 + 0.5 * (1.0 - texture2D(u_matcapTexture, matUv).r);
  float metalMask = 1.0 - metalness;
  vec3 color = vec3(matcapShading * albedo);
  color += 0.8 * zAxisShading;
  color *= u_ambientColor * (0.85 + sunNdL * 0.5);
  color *= metalMask;
  color += metalMask * (0.5 * (0.4 + 0.2 * ao + 0.5 * sunNdL) + 0.1 * sunNdL * sunNdL);
  color *= 0.7 + 0.3 * ao;
  color += linearStep(0.0, 1.0, -sunNdLRaw) * u_ambientColor * 0.1;
  color *= 0.7 + arm.r * 0.3;

  vec3 ledLightPos = u_cardPosition;
  vec3 ledLightDir = ledLightPos - v_worldPosition;
  float ledLightDist = max(0.05, length(ledLightDir));
  ledLightDir /= ledLightDist;
  float attenuationLed = 1.0 / (16.0 * ledLightDist);
  color += attenuationLed * u_faceLedLight * u_faceLedColor * getMetalShininess(V, u_cardPosition, N, (1.0 - metalness), metalness);
  attenuationLed = 1.0 / (16.0 * ledLightDist * ledLightDist);
  color += 0.5 * u_faceLedLight * u_faceLedColor * albedo * attenuationLed * (0.5 + 0.5 * saturate(dot(ledLightDir, N)));

#ifndef IS_HELMET_GLASS
  color += max(worldNormal.z * 2.0 * sunNdL, metalness) *
           texture2D(u_envTexture, 1.2 * (matUv - 0.5) + vec2(0.5, 0.5)).rgb * 0.75 * v_ao;
#endif

  color *= mix(0.85, 1.0, v_ao);
  gl_FragColor = vec4(mix(u_bgColor, color, vec3(u_showRatio)), 1.0);
}
`;

const VISOR_CARD_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_cardLedTexture;
uniform sampler2D u_cardTexture;
uniform vec3 u_cardColor;
uniform vec2 u_cardUvOffset;
uniform vec2 u_cardTextureSize;
uniform float u_cardOpacity;

varying vec2 v_uv;

void main() {
  vec2 cellUv = v_uv / u_cardTextureSize;
  vec4 texel = texture2D(u_cardTexture, cellUv + u_cardUvOffset);
  vec3 ledTexture = pow(texture2D(u_cardLedTexture, fract(v_uv * vec2(20.0, 15.0))).rgb, vec3(2.2));
  float ledMask = dot(ledTexture, u_cardColor * texel.r);
  gl_FragColor.rgb = pow(ledTexture, vec3(1.0 / 2.2)) * ledMask * 2.8 * u_cardOpacity;
  gl_FragColor.a = texel.r * 0.55 * u_cardOpacity;
}
`;

const DIAMOND_VERTEX_SHADER = /* glsl */ `
attribute vec3 a_instancePosition;
attribute vec3 a_instanceRotationAxis;
attribute vec4 a_instanceRand;
attribute float thickness;

uniform float u_time;
uniform float u_aspect;
uniform float u_activeRatio;

varying vec3 v_viewNormal;
varying float v_thickness;
varying vec3 v_cameraPositionLS;
varying vec3 v_positionLS;
varying vec3 v_normalLS;
varying vec4 v_orient;
varying float v_fadeOut;

float linearStep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

vec3 qrotate(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

vec4 quaternion(vec3 axis, float halfAngle) {
  return vec4(axis * sin(halfAngle), cos(halfAngle));
}

void main() {
  float time = 0.5 * u_time + 4.0 * a_instanceRand.x;
  float scale = 0.72;
  vec3 pos = position;
  vec4 orient = quaternion(a_instanceRotationAxis, (0.5 + a_instanceRand.y) * time);
  pos = qrotate(orient, pos);
  pos *= scale;
  vec3 nor = qrotate(orient, normal);

  vec3 instancePosition = a_instancePosition;
  instancePosition.y += 0.5 * u_time * (1.0 + a_instanceRand.x);
  float yLimit = 20.0 / max(0.45, u_aspect);
  instancePosition.y = mod(instancePosition.y, yLimit) - 0.5 * yLimit;
  v_fadeOut = abs(instancePosition.y) / (yLimit * 0.5);

  pos *= linearStep(a_instanceRand.w * 0.5, a_instanceRand.w * 0.5 + 0.5, u_activeRatio);
  pos += instancePosition;
  vec4 orientInv = vec4(-orient.xyz, orient.w);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  v_cameraPositionLS = qrotate(orientInv, (cameraPosition - instancePosition) / scale);
  v_positionLS = position * scale;
  v_normalLS = normal;
  v_orient = orient;
  v_viewNormal = normalMatrix * nor;
  v_thickness = thickness;
}
`;

const DIAMOND_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 u_color;
uniform vec3 u_bgColor;
uniform vec4 u_planes[25];
uniform mat3 normalMatrix;

varying vec3 v_viewNormal;
varying float v_thickness;
varying vec3 v_cameraPositionLS;
varying vec3 v_positionLS;
varying vec3 v_normalLS;
varying vec4 v_orient;
varying float v_fadeOut;

float linearStep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float plaIntersect(in vec3 ro, in vec3 rd, in vec4 p) {
  return -(dot(ro, p.xyz) + p.w) / dot(rd, p.xyz);
}

vec4 getColorShade(vec3 dir, vec3 vn) {
  float d = dot(dir, vn);
  float shade = (1.0 - max(0.0, vn.z)) * v_thickness * 5.0;
  shade *= (pow(linearStep(2.0, -1.0, d), 4.0) * 0.15 + pow(linearStep(1.0, -2.0, d), 5.0) * 7.0);
  vec3 rgb = mix(
    vec3(0.8),
    clamp(abs(mod((d + vn.z) * 12.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0),
    1.0 - shade
  );
  return vec4((u_color + rgb * 1.2) * shade, 0.035 + (1.0 - v_thickness) * shade * shade) * (1.0 - abs(vn.z));
}

vec3 qrotate(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

void main() {
  vec3 localDir = normalize(v_positionLS);
  vec3 viewNormal = normalize(v_viewNormal);
  float ior = 2.418;
  vec3 norLS = normalize(v_normalLS);
  vec3 refrLS = refract(normalize(v_positionLS - v_cameraPositionLS), norLS, 1.0 / ior);

  float dist = 100.0;
  vec3 planeDir = vec3(0.0);
  for (int i = 0; i < 25; i++) {
    vec4 plane = u_planes[i];
    plane.xyz *= -1.0;
    plane.w *= 0.7501;
    float hitDist = plaIntersect(v_positionLS + refrLS * 0.001, refrLS, plane);
    if (hitDist > 0.0 && hitDist < dist) {
      dist = hitDist;
      planeDir = u_planes[i].xyz;
    }
  }

  vec3 refrPosLS = v_positionLS + refrLS * dist;
  refrLS = refract(refrLS, planeDir, ior);
  vec3 refrLocalDir = qrotate(v_orient, normalize(refrPosLS));
  vec3 viewPlaneNor = normalMatrix * qrotate(v_orient, planeDir);

  vec4 frontColorShade = getColorShade(localDir, viewNormal);
  vec4 backColorShade = getColorShade(refrLocalDir, viewPlaneNor);

  vec3 col = frontColorShade.rgb * 1.6 + backColorShade.rgb * 0.85;
  float alphaFade = linearStep(0.0, 0.12, 1.0 - v_fadeOut);
  gl_FragColor = vec4(mix(u_bgColor, col, alphaFade), 1.0);
}
`;

const STICKER_VERTEX_SHADER = /* glsl */ `
attribute float instanceId;
attribute vec4 instanceUvInfo;
attribute vec4 instanceRands;

uniform float u_time;
uniform float u_activeRatio;
uniform float u_aspect;
uniform vec2 u_textureSize;
uniform float u_count;

varying float v_fadeOut;
varying vec2 v_uv;

vec4 hash42(vec2 p) {
  vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
  p4 += dot(p4, p4.wzxy + 33.33);
  return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

vec2 rotate(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  mat2 m = mat2(c, s, -s, c);
  return m * v;
}

float linearStep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {
  vec3 pos = position;
  pos.xy *= instanceUvInfo.zw * u_textureSize * 0.01;
  float t = u_time * mix(0.045, 0.085, instanceRands.x) + instanceRands.y;
  float cycle = floor(t);
  float ratio = fract(t);
  vec4 cycleRands = hash42(vec2(cycle, instanceId * u_count));

  pos.xy = rotate(
    pos.xy,
    instanceRands.z * 6.283185 + sign(cycleRands.z - 0.5) * u_time * mix(0.35, 0.85, cycleRands.y)
  ) * linearStep(instanceRands.w * 0.5, instanceRands.w * 0.5 + 0.5, u_activeRatio) * 0.34;

  float yLimit = 7.0 / max(0.55, u_aspect);
  float sideSign = cycleRands.w < 0.5 ? -1.0 : 1.0;
  float minLane = mix(0.48, 1.85, smoothstep(0.5, 1.4, u_aspect));
  float maxLane = mix(1.12, 4.7, smoothstep(0.5, 1.4, u_aspect));
  vec3 instancePos = vec3(
    sideSign * mix(minLane, maxLane, cycleRands.x),
    yLimit * mix(-1.0, 1.0, ratio),
    20.0 + instanceId
  );
  pos += instancePos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  v_uv = instanceUvInfo.xy + instanceUvInfo.zw * vec2(uv.x, 1.0 - uv.y);
  v_uv.y = 1.0 - v_uv.y;
  v_fadeOut = 2.0 * abs(ratio - 0.5);
}
`;

const STICKER_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_texture;

varying vec2 v_uv;
varying float v_fadeOut;

float linearStep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {
  vec4 tex = texture2D(u_texture, v_uv);
  float fade = linearStep(0.0, 0.14, 1.0 - v_fadeOut);
  if (tex.a * fade < 0.02) discard;
  gl_FragColor = vec4(tex.rgb, tex.a * fade);
}
`;

function createLedSubpixelTexture() {
  const c = document.createElement('canvas');
  c.width = 11;
  c.height = 11;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 11, 11);
  ctx.fillStyle = '#f00';
  ctx.fillRect(1, 1, 3, 9);
  ctx.fillStyle = '#0f0';
  ctx.fillRect(4, 1, 3, 9);
  ctx.fillStyle = '#00f';
  ctx.fillRect(7, 1, 3, 9);
  const tex = new THREE.Texture(c);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function toThreeBufferGeometry(parsed) {
  const geo = new THREE.BufferGeometry();
  if (parsed.indices) {
    geo.setIndex(new THREE.BufferAttribute(parsed.indices, 1));
  }
  for (const [name, attr] of Object.entries(parsed.attributes)) {
    geo.setAttribute(name, new THREE.BufferAttribute(attr.array, attr.componentSize));
  }
  return geo;
}

function createAnimationDataTexture(data, width, height) {
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

class CareersEndSectionScene {
  constructor() {
    this.section = document.getElementById('end-section');
    this.canvas = document.getElementById('careers-end-canvas');
    if (!this.section || !this.canvas) return;

    this.isSoftwareGl = detectSoftwareWebGL();
    this.budget = computeEndSceneBudget(this.isSoftwareGl);
    this.prefersReducedMotion = Boolean(
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    this.isVisible = false;
    this.hasRenderedStatic = false;
    this.assetsReady = false;
    this.elapsedTime = 1.6;
    this.lastTick = performance.now();
    this.lastFrameTime = 0;
    this.pointer = new THREE.Vector2(0, 0);
    this.pointerTarget = new THREE.Vector2(0, 0);

    this.initRenderer();
    if (!this.renderer) return;

    this.initCameraAndScene();
    this.bindEvents();
    this.loadAssets();

    window.__flowgridFrameCallbacks = window.__flowgridFrameCallbacks || [];
    window.__flowgridFrameCallbacks.push(this.tickFrame);
  }

  initRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: false,
        antialias: this.budget.antialias,
        powerPreference: 'high-performance',
      });
      this.renderer.setClearColor(0x000000, 1);
    } catch {
      this.renderer = null;
      return;
    }

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.renderer = null;
    });

    this.resize();
  }

  initCameraAndScene() {
    const aspect = this.getAspect();
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 26.2);
    this.camera.lookAt(0, 0, 0);

    this.scene = new THREE.Scene();

    this.uTime = { value: this.elapsedTime };
    this.uAspect = { value: aspect };
    this.uShowRatio = { value: 1 };
    this.uBgColor = { value: new THREE.Color(0x000000) };

    this.instancePos = new THREE.InstancedBufferAttribute(new Float32Array([0, ASTRONAUT_OFFSET_Y_DESKTOP, ASTRONAUT_BASE_Z]), 3);
    this.instanceOrient = new THREE.InstancedBufferAttribute(new Float32Array([0, 0, 0, 1]), 4);
    this.instanceAnimBlend = new THREE.InstancedBufferAttribute(
      new Float32Array([IDLE_FRAME_START, IDLE_FRAME_START + 1, 0]),
      3
    );

    this.astroUniforms = {
      u_time: this.uTime,
      u_animationPositionTexture: { value: null },
      u_animationOrientTexture: { value: null },
      u_animationTextureSize: { value: new THREE.Vector2(1, 1) },
      u_bgColor: this.uBgColor,
      u_showRatio: this.uShowRatio,
      u_matcapTexture: { value: null },
      u_envTexture: { value: null },
      u_faceLedLight: { value: 0.9 },
      u_faceLedColor: { value: new THREE.Color('#aaaafb') },
      u_cardPosition: { value: new THREE.Vector3(0, 1.28, ASTRONAUT_BASE_Z + 0.15) },
      u_sunPosition: { value: new THREE.Vector3(-20, 0, 22) },
      u_ambientColor: { value: new THREE.Color('#566d80') },
    };

    this.cardUniforms = {
      u_time: this.uTime,
      u_animationPositionTexture: this.astroUniforms.u_animationPositionTexture,
      u_animationOrientTexture: this.astroUniforms.u_animationOrientTexture,
      u_animationTextureSize: this.astroUniforms.u_animationTextureSize,
      u_cardLedTexture: { value: createLedSubpixelTexture() },
      u_cardTexture: { value: null },
      u_cardColor: { value: new THREE.Color('#ddddff') },
      u_cardUvOffset: { value: new THREE.Vector2(0, 1) },
      u_cardTextureSize: { value: new THREE.Vector2(5, 23) },
      u_cardOpacity: { value: 1.45 },
    };
  }

  getAspect() {
    const rect = this.section.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = Math.min(rect.height || window.innerHeight, window.innerHeight);
    return Math.max(0.4, w / Math.max(1, h));
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener(
      'pointermove',
      (e) => {
        if (!this.isVisible || this.prefersReducedMotion) return;
        this.pointerTarget.x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
        this.pointerTarget.y = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
      },
      { passive: true }
    );

    if (typeof IntersectionObserver !== 'undefined') {
      const obs = new IntersectionObserver(
        (entries) => {
          this.isVisible = entries.some((entry) => entry.isIntersecting);
          if (this.isVisible) {
            this.hasRenderedStatic = false;
          }
        },
        { rootMargin: '250px 0px' }
      );
      obs.observe(this.section);
    } else {
      this.isVisible = true;
    }
  }

  resize() {
    if (!this.renderer || !this.canvas) return;
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.budget.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    if (this.camera) {
      const aspect = Math.max(0.4, width / Math.max(1, height));
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      if (this.uAspect) this.uAspect.value = aspect;
    }
    this.hasRenderedStatic = false;
  }

  async loadBufGeometry(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    const buffer = await res.arrayBuffer();
    return parseBufPayload(buffer);
  }

  async loadAssets() {
    const texLoader = new THREE.TextureLoader();
    const loadTex = (url, nearest = false) =>
      new Promise((resolve, reject) => {
        texLoader.load(
          url,
          (tex) => {
            if (nearest) {
              tex.minFilter = THREE.NearestFilter;
              tex.magFilter = THREE.NearestFilter;
            } else {
              tex.minFilter = THREE.LinearMipmapLinearFilter;
              tex.magFilter = THREE.LinearFilter;
            }
            resolve(tex);
          },
          undefined,
          reject
        );
      });

    try {
      const isCompact = window.innerWidth <= 812;
      const [
        animPayload,
        helmetPayload,
        helmetGlassPayload,
        gloveShoesPayload,
        wearpackPayload,
        diamondPayload,
        matcapTex,
        envTex,
        faceTex,
        stickersTex,
        helmetArm,
        helmetBase,
        helmetNor,
        gloveArm,
        gloveBase,
        gloveNor,
        wearpackArm,
        wearpackBase,
        wearpackNor,
      ] = await Promise.all([
        this.loadBufGeometry('/assets/models/tunnels/astronaut_animations.buf'),
        this.loadBufGeometry('/assets/models/tunnels/astronaut_helmet.buf'),
        this.loadBufGeometry('/assets/models/tunnels/astronaut_helmet_glass.buf'),
        this.loadBufGeometry('/assets/models/tunnels/astronaut_glove_shoes.buf'),
        this.loadBufGeometry('/assets/models/tunnels/astronaut_wearpack.buf'),
        this.loadBufGeometry('/assets/models/tunnels/diamond.buf'),
        loadTex('/assets/textures/tunnels/white_matcap.jpg'),
        loadTex('/assets/textures/tunnels/earth.webp'),
        loadTex('/assets/textures/tunnels/astronaut/face.png', true),
        loadTex(isCompact ? '/assets/textures/tunnels/stickers_low.png' : '/assets/textures/tunnels/stickers.png'),
        loadTex('/assets/textures/tunnels/astronaut/astronaut_helmet_arm.webp'),
        loadTex('/assets/textures/tunnels/astronaut/astronaut_helmet_base.webp'),
        loadTex('/assets/textures/tunnels/astronaut/astronaut_helmet_nor.webp'),
        loadTex('/assets/textures/tunnels/astronaut/astronaut_glove_shoes_arm.webp'),
        loadTex('/assets/textures/tunnels/astronaut/astronaut_glove_shoes_base.webp'),
        loadTex('/assets/textures/tunnels/astronaut/astronaut_glove_shoes_nor.webp'),
        loadTex('/assets/textures/tunnels/astronaut/astronaut_wearpack_arm.webp'),
        loadTex('/assets/textures/tunnels/astronaut/astronaut_wearpack_base.webp'),
        loadTex('/assets/textures/tunnels/astronaut/astronaut_wearpack_nor.webp'),
      ]);

      this.buildAnimationTextures(animPayload);
      this.astroUniforms.u_matcapTexture.value = matcapTex;
      this.astroUniforms.u_envTexture.value = envTex;
      this.cardUniforms.u_cardTexture.value = faceTex;

      this.buildDiamondsMesh(diamondPayload);
      this.buildStickersMesh(stickersTex);

      this.buildAstronautPart('wearpack', wearpackPayload, {
        arm: wearpackArm,
        base: wearpackBase,
        nor: wearpackNor,
      });
      this.buildAstronautPart('glove_shoes', gloveShoesPayload, {
        arm: gloveArm,
        base: gloveBase,
        nor: gloveNor,
      });
      this.buildAstronautPart('helmet', helmetPayload, {
        arm: helmetArm,
        base: helmetBase,
        nor: helmetNor,
      });
      this.buildAstronautPart('helmet_glass', helmetGlassPayload, {
        arm: helmetArm,
        base: helmetBase,
        nor: helmetNor,
      });
      this.buildVisorCardMesh();

      this.assetsReady = true;
      this.hasRenderedStatic = false;
      this.updateScene(0);
      this.renderer?.render(this.scene, this.camera);
    } catch {
      // Static dark background + CSS crosshairs & typography remain cleanly visible
    }
  }

  buildAnimationTextures(animPayload) {
    const pos = animPayload.attributes.position.array;
    const orient = animPayload.attributes.orient.array;
    const nodeCount = pos.length / 3;
    const width = Math.ceil(Math.sqrt(nodeCount));
    const height = Math.ceil(nodeCount / width);
    const total = width * height;

    const posData = new Float32Array(total * 4);
    const orientData = new Float32Array(total * 4);

    for (let i = 0, p3 = 0, p4 = 0; i < nodeCount; i++, p3 += 3, p4 += 4) {
      posData[p4] = pos[p3];
      posData[p4 + 1] = pos[p3 + 1];
      posData[p4 + 2] = pos[p3 + 2];
      posData[p4 + 3] = 1;

      orientData[p4] = orient[p4];
      orientData[p4 + 1] = orient[p4 + 1];
      orientData[p4 + 2] = orient[p4 + 2];
      orientData[p4 + 3] = orient[p4 + 3];
    }

    this.astroUniforms.u_animationPositionTexture.value = createAnimationDataTexture(posData, width, height);
    this.astroUniforms.u_animationOrientTexture.value = createAnimationDataTexture(orientData, width, height);
    this.astroUniforms.u_animationTextureSize.value.set(width, height);
  }

  buildAstronautPart(partName, payload, textures) {
    const baseGeo = toThreeBufferGeometry(payload);
    const geo = new THREE.InstancedBufferGeometry();
    for (const [k, attr] of Object.entries(baseGeo.attributes)) {
      geo.setAttribute(k, attr);
    }
    if (baseGeo.index) geo.setIndex(baseGeo.index);

    geo.setAttribute('instancePos', this.instancePos);
    geo.setAttribute('instanceOrient', this.instanceOrient);
    geo.setAttribute('instanceAnimationFrameFromToBlend', this.instanceAnimBlend);
    geo.instanceCount = 1;

    const uniforms = Object.assign({}, this.astroUniforms, {
      u_armTexture: { value: textures.arm },
      u_baseTexture: { value: textures.base },
      u_norTexture: { value: textures.nor },
    });

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: ASTRONAUT_VERTEX_SHADER,
      fragmentShader: ASTRONAUT_WHITE_FRAGMENT_SHADER,
      side: THREE.DoubleSide,
    });
    if (partName === 'helmet_glass') {
      material.defines.IS_HELMET_GLASS = 1;
    }

    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    this.scene.add(mesh);
  }

  buildVisorCardMesh() {
    const plane = new THREE.PlaneGeometry(0.2, 0.15).translate(0, 1.68, 0.1);
    plane.setAttribute('boneIndices', new THREE.BufferAttribute(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]), 2));
    plane.setAttribute('boneWeights', new THREE.BufferAttribute(new Float32Array([1, 0, 1, 0, 1, 0, 1, 0]), 2));
    plane.setAttribute(
      'tangent',
      new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]), 4)
    );

    const geo = new THREE.InstancedBufferGeometry();
    for (const [k, attr] of Object.entries(plane.attributes)) {
      geo.setAttribute(k, attr);
    }
    if (plane.index) geo.setIndex(plane.index);
    geo.setAttribute('instancePos', this.instancePos);
    geo.setAttribute('instanceOrient', this.instanceOrient);
    geo.setAttribute('instanceAnimationFrameFromToBlend', this.instanceAnimBlend);
    geo.instanceCount = 1;

    const material = new THREE.ShaderMaterial({
      uniforms: this.cardUniforms,
      vertexShader: ASTRONAUT_VERTEX_SHADER,
      fragmentShader: VISOR_CARD_FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 10;
    this.scene.add(mesh);
  }

  buildDiamondsMesh(diamondPayload) {
    const baseGeo = toThreeBufferGeometry(diamondPayload);
    const geo = new THREE.InstancedBufferGeometry();
    for (const [k, attr] of Object.entries(baseGeo.attributes)) {
      geo.setAttribute(k, attr);
    }
    if (baseGeo.index) geo.setIndex(baseGeo.index);

    const data = computeDiamondInstances(this.budget.diamondCount, 'diamonds-3');
    geo.setAttribute('a_instancePosition', new THREE.InstancedBufferAttribute(data.positions, 3));
    geo.setAttribute('a_instanceRotationAxis', new THREE.InstancedBufferAttribute(data.rotationAxes, 3));
    geo.setAttribute('a_instanceRand', new THREE.InstancedBufferAttribute(data.rands, 4));
    geo.instanceCount = data.count;

    const planes = [];
    for (let i = 0; i < 25; i++) {
      planes.push(
        new THREE.Vector4(
          DIAMOND_FACET_PLANES[i * 4],
          DIAMOND_FACET_PLANES[i * 4 + 1],
          DIAMOND_FACET_PLANES[i * 4 + 2],
          DIAMOND_FACET_PLANES[i * 4 + 3]
        )
      );
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: DIAMOND_VERTEX_SHADER,
      fragmentShader: DIAMOND_FRAGMENT_SHADER,
      uniforms: {
        u_time: this.uTime,
        u_activeRatio: { value: 1 },
        u_color: { value: new THREE.Color('#689aff') },
        u_planes: { value: planes },
        u_bgColor: this.uBgColor,
        u_aspect: this.uAspect,
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    this.scene.add(mesh);
  }

  buildStickersMesh(stickerTexture) {
    const plane = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    for (const [k, attr] of Object.entries(plane.attributes)) {
      geo.setAttribute(k, attr);
    }
    if (plane.index) geo.setIndex(plane.index);

    const data = computeStickerInstances(this.budget.stickerCount, 'stickers-end');
    geo.setAttribute('instanceId', new THREE.InstancedBufferAttribute(data.ids, 1));
    geo.setAttribute('instanceUvInfo', new THREE.InstancedBufferAttribute(data.uvInfos, 4));
    geo.setAttribute('instanceRands', new THREE.InstancedBufferAttribute(data.rands, 4));
    geo.instanceCount = data.count;

    const material = new THREE.ShaderMaterial({
      vertexShader: STICKER_VERTEX_SHADER,
      fragmentShader: STICKER_FRAGMENT_SHADER,
      uniforms: {
        u_time: this.uTime,
        u_activeRatio: { value: 1 },
        u_texture: { value: stickerTexture },
        u_textureSize: { value: new THREE.Vector2(1465, 1024) },
        u_aspect: this.uAspect,
        u_count: { value: data.count },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    this.scene.add(mesh);
  }

  updateScene(dt) {
    this.elapsedTime += dt;
    this.uTime.value = this.elapsedTime;

    const isMobile = window.innerWidth <= 812;
    const baseY = isMobile ? ASTRONAUT_OFFSET_Y_MOBILE : ASTRONAUT_OFFSET_Y_DESKTOP;
    const floatY = Math.sin(this.elapsedTime * 0.9) * 0.04;
    const swayRotZ = Math.sin(this.elapsedTime * 0.55) * 0.035;
    const swayRotY = Math.cos(this.elapsedTime * 0.42) * 0.06;

    this.instancePos.array[0] = Math.sin(this.elapsedTime * 0.45) * 0.04;
    this.instancePos.array[1] = baseY + floatY;
    this.instancePos.array[2] = ASTRONAUT_BASE_Z;
    this.instancePos.needsUpdate = true;

    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04, swayRotY, swayRotZ));
    this.instanceOrient.array[0] = q.x;
    this.instanceOrient.array[1] = q.y;
    this.instanceOrient.array[2] = q.z;
    this.instanceOrient.array[3] = q.w;
    this.instanceOrient.needsUpdate = true;

    const loopLen = IDLE_FRAME_END - IDLE_FRAME_START + 1;
    const loopPos = (this.elapsedTime * 30) % loopLen;
    const fFrom = IDLE_FRAME_START + Math.floor(loopPos);
    const fTo = IDLE_FRAME_START + ((Math.floor(loopPos) + 1) % loopLen);
    this.instanceAnimBlend.array[0] = fFrom;
    this.instanceAnimBlend.array[1] = fTo;
    this.instanceAnimBlend.array[2] = loopPos % 1;
    this.instanceAnimBlend.needsUpdate = true;

    const visor = computeCardVisorFrame(this.elapsedTime);
    this.cardUniforms.u_cardUvOffset.value.set(visor.uOffsetX, visor.uOffsetY);
    this.astroUniforms.u_faceLedLight.value = 0.75 + visor.ledLight * 0.45;
    this.astroUniforms.u_cardPosition.value.set(0, baseY + floatY + 0.76, ASTRONAUT_BASE_Z + 0.14);

    if (this.camera) {
      this.pointer.lerp(this.pointerTarget, Math.min(1, dt * 4.5));
      this.camera.position.x = this.pointer.x * 0.28;
      this.camera.position.y = this.pointer.y * 0.18;
      this.camera.lookAt(0, 0, 0);
    }
  }

  tickFrame = (now = performance.now()) => {
    if (document.hidden || !this.renderer || !this.assetsReady || !this.isVisible) {
      this.lastTick = now;
      return;
    }

    if (this.prefersReducedMotion) {
      if (!this.hasRenderedStatic) {
        this.updateScene(0);
        this.renderer.render(this.scene, this.camera);
        this.hasRenderedStatic = true;
      }
      return;
    }

    if (this.budget.minFrameMs > 0 && now - this.lastFrameTime < this.budget.minFrameMs) {
      return;
    }
    this.lastFrameTime = now;

    const dt = Math.min(0.08, Math.max(0.001, (now - this.lastTick) / 1000));
    this.lastTick = now;

    this.updateScene(dt);
    this.renderer.render(this.scene, this.camera);
  };
}

new CareersEndSectionScene();
