/**
 * Pure data helpers for the Careers #end-section 3D showcase:
 * - Decodes Lusion/Flowgrid `.buf` binary mesh/animation payloads
 * - Computes deterministic seeded starfield/diamond & sticker layouts
 * - Computes LED visor face frame UVs and Software WebGL budgets
 * - Evaluates whether fixed header overlaps dark end/next sections
 */

export const GOAL_WHITE_TUNNEL_STICKERS = [
  { x: 1132, y: 3, w: 195, h: 195 },
  { x: 744, y: 3, w: 195, h: 256 },
  { x: 525, y: 3, w: 213, h: 282 },
  { x: 242, y: 3, w: 277, h: 286 },
  { x: 1055, y: 633, w: 209, h: 209 },
  { x: 1076, y: 398, w: 209, h: 209 },
  { x: 3, y: 772, w: 298, h: 249 },
  { x: 945, y: 3, w: 181, h: 249 },
  { x: 1291, y: 389, w: 160, h: 197 },
  { x: 1055, y: 848, w: 83, h: 122 },
  { x: 1132, y: 204, w: 167, h: 179 },
  { x: 1270, y: 828, w: 192, h: 193 },
  { x: 780, y: 265, w: 182, h: 167 },
  { x: 564, y: 445, w: 294, h: 184 },
  { x: 307, y: 683, w: 205, h: 334 },
  { x: 864, y: 438, w: 206, h: 189 },
  { x: 968, y: 258, w: 149, h: 134 },
  { x: 734, y: 635, w: 165, h: 382 },
  { x: 605, y: 291, w: 169, h: 141 },
  { x: 302, y: 445, w: 256, h: 232 },
  { x: 518, y: 683, w: 210, h: 266 },
  { x: 242, y: 295, w: 357, h: 144 },
  { x: 3, y: 3, w: 233, h: 469 },
  { x: 905, y: 633, w: 144, h: 340 },
  { x: 1270, y: 613, w: 187, h: 209 },
  { x: 3, y: 478, w: 293, h: 288 },
];

export const STICKER_ATLAS_SIZE = { width: 1465, height: 1024 };

export const DIAMOND_FACET_PLANES = [
  -0.694747, 0.694747, 0.186157, -0.239229,
  -0.50859, 0.694747, 0.50859, -0.239229,
  -0.186157, 0.694747, 0.694747, -0.239229,
  0.186157, 0.694747, 0.694747, -0.239229,
  0.50859, 0.694747, 0.50859, -0.239229,
  0.694747, 0.694747, 0.186157, -0.239229,
  0.694747, 0.694747, -0.186157, -0.239229,
  0.50859, 0.694747, -0.50859, -0.239229,
  0.186157, 0.694747, -0.694746, -0.239229,
  -0.186156, 0.694747, -0.694747, -0.239229,
  -0.508589, 0.694747, -0.50859, -0.239229,
  -0.694747, 0.694747, -0.186157, -0.239229,
  -0.694747, -0.694747, 0.186157, -0.455518,
  -0.50859, -0.694747, 0.50859, -0.455518,
  -0.186157, -0.694747, 0.694747, -0.455518,
  0.186157, -0.694747, 0.694747, -0.455518,
  0.50859, -0.694747, 0.50859, -0.455518,
  0.694746, -0.694747, 0.186157, -0.455518,
  0.694746, -0.694747, -0.186157, -0.455518,
  0.50859, -0.694747, -0.50859, -0.455518,
  0.186157, -0.694747, -0.694746, -0.455518,
  -0.186156, -0.694747, -0.694747, -0.455518,
  -0.508589, -0.694747, -0.50859, -0.455518,
  -0.694747, -0.694747, -0.186157, -0.455518,
  0, -1, 0, -0.34434,
];

const TYPED_ARRAY_MAP = {
  Float32Array,
  Uint32Array,
  Uint16Array,
  Uint8Array,
  Int32Array,
  Int16Array,
  Int8Array,
};

/**
 * Decodes Flowgrid/Lusion `.buf` binary ArrayBuffer into plain JS typed arrays.
 * @param {ArrayBuffer} buffer
 * @returns {{ vertexCount: number, indexCount: number, indices: Uint16Array | Uint32Array | null, attributes: Record<string, { array: ArrayBufferView, componentSize: number }> }}
 */
export function parseBufPayload(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 8) {
    throw new Error('Invalid .buf binary payload');
  }

  const view = new DataView(buffer);
  const headerLength = view.getUint32(0, true);
  if (4 + headerLength > buffer.byteLength) {
    throw new Error('Corrupt .buf header length');
  }

  const headerJson = new TextDecoder().decode(new Uint8Array(buffer, 4, headerLength));
  const header = JSON.parse(headerJson);
  const vertexCount = Number(header.vertexCount || 0);
  const indexCount = Number(header.indexCount || 0);
  const attributeDefs = Array.isArray(header.attributes) ? header.attributes : [];

  let offset = 4 + headerLength;
  let indices = null;
  const attributes = {};

  for (let i = 0; i < attributeDefs.length; i++) {
    const def = attributeDefs[i];
    const id = def.id;
    const count = id === 'indices' ? indexCount : vertexCount;
    const componentSize = Number(def.componentSize || 1);
    const TypedArrayCtor = TYPED_ARRAY_MAP[def.storageType];
    if (!TypedArrayCtor) {
      throw new Error(`Unsupported .buf storageType: ${def.storageType}`);
    }

    const bytesPerElement = TypedArrayCtor.BYTES_PER_ELEMENT;
    const rawArray = new TypedArrayCtor(buffer, offset, count * componentSize);

    let finalArray;
    if (def.needsPack && Array.isArray(def.packedComponents)) {
      const comps = def.packedComponents;
      const isSigned = def.storageType.startsWith('Int');
      const range = 1 << (bytesPerElement * 8);
      const halfOffset = isSigned ? range * 0.5 : 0;
      const invRange = 1 / range;
      finalArray = new Float32Array(count * componentSize);
      let cursor = 0;
      for (let v = 0; v < count; v++) {
        for (let c = 0; c < comps.length; c++) {
          const spec = comps[c];
          finalArray[cursor] = (rawArray[cursor] + halfOffset) * invRange * spec.delta + spec.from;
          cursor++;
        }
      }
    } else {
      finalArray = rawArray;
    }

    if (id === 'indices') {
      indices = finalArray;
    } else {
      attributes[id] = { array: finalArray, componentSize };
    }

    offset += count * componentSize * bytesPerElement;
  }

  return {
    vertexCount,
    indexCount,
    meshType: header.meshType || 'Mesh',
    indices,
    attributes,
  };
}

/**
 * Deterministic Mulberry32 PRNG for repeatable diamond/sticker scattering.
 * @param {number | string} seedInput
 * @returns {() => number}
 */
export function createSeededRng(seedInput = 'flowgrid-end-scene') {
  let seed = 2166136261;
  const str = String(seedInput);
  for (let i = 0; i < str.length; i++) {
    seed ^= str.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Computes instanced diamond positions, rotation axes, and random seeds.
 * @param {number} count
 * @param {string} seed
 */
export function computeDiamondInstances(count = 64, seed = 'diamonds-3') {
  const rng = createSeededRng(seed);
  const positions = new Float32Array(count * 3);
  const rotationAxes = new Float32Array(count * 3);
  const rands = new Float32Array(count * 4);
  const denom = Math.max(1, count - 1);

  for (let i = 0, p3 = 0, p4 = 0; i < count; i++, p3 += 3, p4 += 4) {
    positions[p3] = 16 * (rng() * 2 - 1);
    positions[p3 + 1] = 16 * (rng() * 2 - 1);
    positions[p3 + 2] = 19 - ((count - i - 1) / denom) * 8;

    // Uniform unit vector on sphere
    const z = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    rotationAxes[p3] = r * Math.cos(theta);
    rotationAxes[p3 + 1] = r * Math.sin(theta);
    rotationAxes[p3 + 2] = z;

    rands[p4] = rng();
    rands[p4 + 1] = rng();
    rands[p4 + 2] = rng();
    rands[p4 + 3] = rng();
  }

  return { count, positions, rotationAxes, rands };
}

/**
 * Computes normalized sticker atlas UVs and randomized drift seeds.
 * @param {number} count
 * @param {string} seed
 */
export function computeStickerInstances(count = 26, seed = 'stickers-end') {
  const rng = createSeededRng(seed);
  const ids = new Float32Array(count);
  const uvInfos = new Float32Array(count * 4);
  const rands = new Float32Array(count * 4);

  for (let i = 0, p4 = 0; i < count; i++, p4 += 4) {
    ids[i] = i / Math.max(1, count);
    const rect = GOAL_WHITE_TUNNEL_STICKERS[i % GOAL_WHITE_TUNNEL_STICKERS.length];
    uvInfos[p4] = rect.x / STICKER_ATLAS_SIZE.width;
    uvInfos[p4 + 1] = rect.y / STICKER_ATLAS_SIZE.height;
    uvInfos[p4 + 2] = rect.w / STICKER_ATLAS_SIZE.width;
    uvInfos[p4 + 3] = rect.h / STICKER_ATLAS_SIZE.height;

    rands[p4] = rng();
    rands[p4 + 1] = rng();
    rands[p4 + 2] = rng();
    rands[p4 + 3] = rng();
  }

  return { count, ids, uvInfos, rands };
}

/**
 * Computes LED visor sprite-sheet UV offset and subtle LED pulse luminance.
 * Atlas grid is 5 columns x 23 rows (120 frames).
 * @param {number} cardTimeSeconds
 */
export function computeCardVisorFrame(cardTimeSeconds) {
  const cols = 5;
  const rows = 23;
  const totalSlots = cols * (rows + 1);
  const safeTime = Math.max(0, Number(cardTimeSeconds) || 0);
  const frameIndex = Math.floor((10 * safeTime) % totalSlots);
  const ratio = frameIndex / totalSlots;
  const fadeIn = Math.min(1, Math.max(0, ratio / 0.15));
  const fadeOut = Math.min(1, Math.max(0, (1 - ratio) / 0.1));
  return {
    uOffsetX: (frameIndex % cols) / cols,
    uOffsetY: (rows - Math.floor(frameIndex / cols)) / rows,
    ledLight: fadeIn * fadeOut,
  };
}

/**
 * Hardware vs Software WebGL rendering budgets for the #end-section canvas.
 * @param {boolean} isSoftwareGl
 */
export function computeEndSceneBudget(isSoftwareGl) {
  return isSoftwareGl
    ? {
        diamondCount: 36,
        stickerCount: 20,
        dprCap: 1,
        antialias: false,
        minFrameMs: 33,
      }
    : {
        diamondCount: 64,
        stickerCount: 26,
        dprCap: 2,
        antialias: true,
        minFrameMs: 0,
      };
}

/**
 * Determines whether the fixed header center Y overlaps a dark bottom section.
 * @param {{ top: number, bottom: number }[]} darkSectionRects
 * @param {number} probeY
 * @returns {boolean}
 */
export function isHeaderOverDarkSection(darkSectionRects, probeY = 44) {
  if (!Array.isArray(darkSectionRects)) return false;
  for (let i = 0; i < darkSectionRects.length; i++) {
    const rect = darkSectionRects[i];
    if (!rect) continue;
    if (rect.top <= probeY && rect.bottom > probeY) {
      return true;
    }
  }
  return false;
}
