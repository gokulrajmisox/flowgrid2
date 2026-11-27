import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  computeCardVisorFrame,
  computeDiamondInstances,
  computeEndSceneBudget,
  computeStickerInstances,
  isHeaderOverDarkSection,
  parseBufPayload,
} from './endSectionUtils.js';

function bufferFromFile(relPath) {
  const buf = readFileSync(relPath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

test('parseBufPayload decodes real diamond.buf packed normals and indices', () => {
  const diamond = parseBufPayload(bufferFromFile('assets/models/tunnels/diamond.buf'));
  assert.equal(diamond.vertexCount, 217);
  assert.equal(diamond.indexCount, 1290);
  assert.ok(
    diamond.indices instanceof Uint8Array ||
      diamond.indices instanceof Uint16Array ||
      diamond.indices instanceof Uint32Array
  );
  assert.equal(diamond.indices.length, 1290);
  assert.ok(diamond.attributes.position);
  assert.ok(diamond.attributes.normal);
  assert.ok(diamond.attributes.normal.array instanceof Float32Array);
  assert.ok(diamond.attributes.thickness);
});

test('parseBufPayload decodes real astronaut_helmet.buf and bone skinning attributes', () => {
  const helmet = parseBufPayload(bufferFromFile('assets/models/tunnels/astronaut_helmet.buf'));
  assert.equal(helmet.vertexCount, 3403);
  assert.equal(helmet.indexCount, 12597);
  assert.ok(helmet.attributes.position);
  assert.ok(helmet.attributes.normal);
  assert.ok(helmet.attributes.tangent);
  assert.ok(helmet.attributes.uv);
  assert.ok(helmet.attributes.boneIndices);
  assert.ok(helmet.attributes.boneWeights);
});

test('computeDiamondInstances is deterministic and covers tunnel depth range', () => {
  const a = computeDiamondInstances(64, 'diamonds-3');
  const b = computeDiamondInstances(64, 'diamonds-3');
  assert.deepEqual(Array.from(a.positions), Array.from(b.positions));
  assert.equal(a.positions.length, 64 * 3);
  assert.equal(a.rotationAxes.length, 64 * 3);
  assert.ok(a.positions[2] >= 10.9 && a.positions[2] <= 19.1);
  assert.ok(a.positions[63 * 3 + 2] <= 19.01);
});

test('computeStickerInstances normalizes atlas UVs inside [0, 1]', () => {
  const stickers = computeStickerInstances(26, 'stickers-end');
  assert.equal(stickers.ids.length, 26);
  for (let i = 0; i < 26; i++) {
    const u = stickers.uvInfos[i * 4];
    const v = stickers.uvInfos[i * 4 + 1];
    const w = stickers.uvInfos[i * 4 + 2];
    const h = stickers.uvInfos[i * 4 + 3];
    assert.ok(u >= 0 && u + w <= 1);
    assert.ok(v >= 0 && v + h <= 1);
  }
});

test('computeCardVisorFrame cycles sprite offsets cleanly', () => {
  const f0 = computeCardVisorFrame(0);
  const f1 = computeCardVisorFrame(0.5);
  assert.equal(f0.uOffsetX, 0);
  assert.equal(f0.uOffsetY, 1);
  assert.ok(f1.uOffsetX >= 0 && f1.uOffsetX < 1);
  assert.ok(f1.ledLight > 0 && f1.ledLight <= 1);
});

test('computeEndSceneBudget scales cleanly between GPU and Software WebGL', () => {
  const gpu = computeEndSceneBudget(false);
  const sw = computeEndSceneBudget(true);
  assert.ok(sw.diamondCount < gpu.diamondCount);
  assert.ok(sw.minFrameMs >= 30);
  assert.equal(sw.dprCap, 1);
});

test('isHeaderOverDarkSection detects header probe overlap accurately', () => {
  assert.equal(isHeaderOverDarkSection([{ top: 20, bottom: 900 }], 44), true);
  assert.equal(isHeaderOverDarkSection([{ top: 80, bottom: 900 }], 44), false);
  assert.equal(isHeaderOverDarkSection([{ top: -900, bottom: 10 }], 44), false);
});
