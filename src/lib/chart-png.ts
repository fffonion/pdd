import {
  deserializeChartPayload,
  serializeChartPayload,
} from "./chart-serialization";

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_IHDR_CHUNK = "IHDR";
const PNG_ITXT_CHUNK = "iTXt";
const CHART_METADATA_KEYWORD = "pindou-chart";

export const CHART_METADATA_APP = "pindou";
export const CHART_METADATA_VERSION = 5;

export interface EmbeddedChartMetadata {
  version: number;
  app: string;
  colorSystemId: string;
  fileName?: string;
  gridWidth: number;
  gridHeight: number;
  preferredEditorMode: "edit" | "pindou";
  editingLocked?: boolean;
  chartTitle?: string;
  cells: Array<[string, 1 | 0] | null>;
}

export async function embedChartMetadataInPngBlob(
  blob: Blob,
  metadata: EmbeddedChartMetadata,
) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const payload = injectPngITXtChunk(
    bytes,
    CHART_METADATA_KEYWORD,
    serializeChartPayload(
      {
        colorSystemId: metadata.colorSystemId,
        gridWidth: metadata.gridWidth,
        gridHeight: metadata.gridHeight,
        preferredEditorMode: metadata.preferredEditorMode,
        editingLocked: metadata.editingLocked,
        title: metadata.chartTitle,
        cells: metadata.cells,
      },
      {
        includeManualRuns: true,
        includePreferredEditorMode: true,
      },
    ),
  );
  const blobBytes = Uint8Array.from(payload);
  return new Blob([blobBytes], { type: "image/png" });
}

export async function readEmbeddedChartMetadataFromFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = extractPngITXtChunk(bytes, CHART_METADATA_KEYWORD);
  if (!text) {
    return null;
  }

  try {
    const parsed = deserializeChartPayload(text);
    return {
      version: CHART_METADATA_VERSION,
      app: CHART_METADATA_APP,
      colorSystemId: parsed.colorSystemId,
      gridWidth: parsed.gridWidth,
      gridHeight: parsed.gridHeight,
      preferredEditorMode: parsed.preferredEditorMode ?? "pindou",
      editingLocked: parsed.editingLocked ?? false,
      chartTitle: parsed.title,
      cells: parsed.cells,
    };
  } catch {
    return null;
  }
}

export function isPngLikeFile(file: File) {
  return file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
}

export function normalizeOutputStem(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, "").replace(/^【拼豆豆】/u, "").trim();
  return stem || "图纸";
}

export function defaultOutputName(
  fileName: string,
  _gridWidth: number,
  _gridHeight: number,
) {
  const stem = normalizeOutputStem(fileName);
  return `【拼豆豆】${stem}.png`;
}

function injectPngITXtChunk(bytes: Uint8Array, keyword: string, text: string) {
  if (!hasPngSignature(bytes)) {
    return bytes;
  }

  const encoder = new TextEncoder();
  const keywordBytes = encoder.encode(keyword);
  const textBytes = encoder.encode(text);
  const chunkData = new Uint8Array(keywordBytes.length + 5 + textBytes.length);
  chunkData.set(keywordBytes, 0);
  chunkData[keywordBytes.length] = 0;
  chunkData[keywordBytes.length + 1] = 0;
  chunkData[keywordBytes.length + 2] = 0;
  chunkData[keywordBytes.length + 3] = 0;
  chunkData[keywordBytes.length + 4] = 0;
  chunkData.set(textBytes, keywordBytes.length + 5);

  const chunk = buildPngChunk(PNG_ITXT_CHUNK, chunkData);
  const ihdrChunkEnd = findPngChunkEnd(bytes, PNG_IHDR_CHUNK);
  if (ihdrChunkEnd < 0) {
    return bytes;
  }

  return concatUint8Arrays(
    concatUint8Arrays(bytes.slice(0, ihdrChunkEnd), chunk),
    bytes.slice(ihdrChunkEnd),
  );
}

function extractPngITXtChunk(bytes: Uint8Array, keyword: string) {
  if (!hasPngSignature(bytes)) {
    return null;
  }

  const decoder = new TextDecoder();
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = decoder.decode(bytes.slice(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) {
      break;
    }

    if (type === PNG_ITXT_CHUNK) {
      const data = bytes.slice(dataStart, dataEnd);
      const nullIndex = data.indexOf(0);
      if (nullIndex > 0) {
        const chunkKeyword = decoder.decode(data.slice(0, nullIndex));
        if (chunkKeyword === keyword) {
          const textBytes = data.slice(nullIndex + 5);
          return decoder.decode(textBytes);
        }
      }
    }

    offset = dataEnd + 4;
  }

  return null;
}

function buildPngChunk(type: string, data: Uint8Array) {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  writeUint32(chunk, 8 + data.length, crc32(concatUint8Arrays(typeBytes, data)));
  return chunk;
}

function findPngChunkEnd(bytes: Uint8Array, chunkType: string) {
  const decoder = new TextDecoder();
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = decoder.decode(bytes.slice(offset + 4, offset + 8));
    const nextOffset = offset + 12 + length;
    if (type === chunkType) {
      return nextOffset;
    }
    offset = nextOffset;
  }
  return -1;
}

function hasPngSignature(bytes: Uint8Array) {
  if (bytes.length < PNG_SIGNATURE.length) {
    return false;
  }
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) {
      return false;
    }
  }
  return true;
}

function concatUint8Arrays(left: Uint8Array, right: Uint8Array) {
  const output = new Uint8Array(left.length + right.length);
  output.set(left, 0);
  output.set(right, left.length);
  return output;
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

const crc32Table = buildCrc32Table();

function buildCrc32Table() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let c = index;
    for (let bit = 0; bit < 8; bit += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[index] = c >>> 0;
  }
  return table;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
