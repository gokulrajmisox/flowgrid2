import * as THREE from 'three';

const fileLoader = new THREE.FileLoader();
const shaderCache = new Map();

function loadText(url) {
  if (!shaderCache.has(url)) {
    shaderCache.set(
      url,
      new Promise((resolve, reject) => {
        fileLoader.load(url, resolve, undefined, reject);
      })
    );
  }
  return shaderCache.get(url);
}

export async function loadShader(name) {
  const base = '/assets/careers/shaders/';
  const [source, common] = await Promise.all([
    loadText(`${base}${name}`),
    loadText(`${base}common.glsl`),
  ]);
  return source.replace(/^\s*#include\s+"\.\/common\.glsl"\s*$/gm, common);
}
