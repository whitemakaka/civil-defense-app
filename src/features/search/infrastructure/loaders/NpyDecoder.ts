/**
 * NPY file decoder
 * Decodes NumPy float16 arrays to Float32Array
 */

export function decodeNpyFloat16(
  buffer: ArrayBuffer,
  expectedCount: number,
  dim: number
): Float32Array {
  const dataOffset = parseNpyHeader(buffer);
  const result = new Float32Array(expectedCount * dim);
  const view = new DataView(buffer, dataOffset);

  for (let i = 0; i < expectedCount * dim; i++) {
    const uint16 = view.getUint16(i * 2, true); // little-endian
    result[i] = float16ToFloat32(uint16);
  }

  return result;
}

function parseNpyHeader(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);

  // Validate magic number: \x93NUMPY
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
    view.getUint8(4),
    view.getUint8(5)
  );

  if (magic !== '\x93NUMPY') {
    throw new Error('Invalid NPY file format');
  }

  const majorVersion = view.getUint8(6);

  // Header length depends on version
  const headerLen = majorVersion === 1
    ? view.getUint16(8, true)
    : view.getUint32(8, true);

  const headerOffset = majorVersion === 1 ? 10 : 12;

  return headerOffset + headerLen;
}

function float16ToFloat32(h: number): number {
  const sign = (h >> 15) & 0x1;
  const exponent = (h >> 10) & 0x1f;
  const fraction = h & 0x3ff;

  // Zero or subnormal
  if (exponent === 0) {
    if (fraction === 0) return sign ? -0 : 0;
    return (sign ? -1 : 1) * (fraction / 1024) * Math.pow(2, -14);
  }

  // Infinity or NaN
  if (exponent === 31) {
    return fraction ? NaN : (sign ? -Infinity : Infinity);
  }

  // Normalized number
  return (sign ? -1 : 1) * (1 + fraction / 1024) * Math.pow(2, exponent - 15);
}
