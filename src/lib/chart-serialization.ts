import { deflateSync, inflateSync } from "fflate";
import {
  sharedColorSystemByCode,
  sharedColorSystemById,
  sharedColorSystemDefinitions,
  type SharedColorSystemDefinition,
} from "./color-system-data";

const SERIALIZATION_PREFIX = "pd5.";
const BASE83_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._~!$'()*,;:@[]{}|^/";
const BASE83_RADIX = BigInt(BASE83_ALPHABET.length);
const FLAG_HAS_TITLE = 1 << 0;
const FLAG_HAS_MANUAL_RUNS = 1 << 1;
const FLAG_HAS_EDITOR_MODE = 1 << 2;
const FLAG_EDITOR_MODE_PINDOU = 1 << 3;
const FLAG_EDITING_LOCKED = 1 << 4;

const COMMON_COLOR_TOKEN_COUNT = sharedColorSystemDefinitions[0]?.commonLabels.length ?? 0;
const EXTENDED_COLOR_TOKEN = COMMON_COLOR_TOKEN_COUNT;
const commonIndexByLabelById = new Map(
  sharedColorSystemDefinitions.map((entry) => [
    entry.id,
    new Map(entry.commonLabels.map((label, index) => [label, index])),
  ]),
);
const extraIndexByLabelById = new Map(
  sharedColorSystemDefinitions.map((entry) => [
    entry.id,
    new Map(entry.extraLabels.map((label, index) => [label, index])),
  ]),
);

if (COMMON_COLOR_TOKEN_COUNT > 255) {
  throw new Error("Common color token count must fit into a single byte.");
}

const base83IndexByChar = new Map(
  [...BASE83_ALPHABET].map((character, index) => [character, index]),
);

export const CHART_SHARE_BASE_URL = "https://yooooo.us/pdd/";

export type SerializedChartCell = [string, 1 | 0] | null;

export interface SerializedChartPayload {
  colorSystemId: string;
  gridWidth: number;
  gridHeight: number;
  preferredEditorMode?: "edit" | "pindou";
  editingLocked?: boolean;
  title?: string;
  cells: SerializedChartCell[];
}

export interface SerializeChartOptions {
  includeManualRuns?: boolean;
  includePreferredEditorMode?: boolean;
}

export class ChartSerializationError extends Error {
  code:
    | "invalid-input"
    | "invalid-serialization"
    | "unknown-color-system"
    | "unknown-label"
    | "too-many-colors";

  constructor(
    code:
      | "invalid-input"
      | "invalid-serialization"
      | "unknown-color-system"
      | "unknown-label"
      | "too-many-colors",
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "ChartSerializationError";
  }
}

export function serializeChartPayload(
  payload: SerializedChartPayload,
  options: SerializeChartOptions = {},
) {
  const definition = sharedColorSystemById.get(payload.colorSystemId);
  if (!definition) {
    throw new ChartSerializationError(
      "unknown-color-system",
      `Unsupported chart color system: ${payload.colorSystemId}`,
    );
  }

  if (
    !Number.isSafeInteger(payload.gridWidth) ||
    !Number.isSafeInteger(payload.gridHeight) ||
    payload.gridWidth <= 0 ||
    payload.gridHeight <= 0
  ) {
    throw new ChartSerializationError(
      "invalid-input",
      "Chart serialization requires positive grid width and height.",
    );
  }

  const expectedLength = payload.gridWidth * payload.gridHeight;
  if (payload.cells.length !== expectedLength) {
    throw new ChartSerializationError(
      "invalid-input",
      "Chart serialization requires a cell array that matches the grid dimensions.",
    );
  }

  const title = payload.title?.trim() ?? "";
  const titleBytes = title ? new TextEncoder().encode(title) : new Uint8Array(0);
  const includeManualRuns = options.includeManualRuns ?? true;
  const includePreferredEditorMode = options.includePreferredEditorMode ?? true;
  const chartRuns: Array<{ isFilled: boolean; length: number; encodedValues: number[] }> = [];
  const manualFlags: boolean[] = [];
  let offset = 0;

  while (offset < payload.cells.length) {
    const entry = payload.cells[offset];
    if (!entry) {
      let length = 0;
      while (offset < payload.cells.length && !payload.cells[offset]) {
        length += 1;
        offset += 1;
      }
      chartRuns.push({ isFilled: false, length, encodedValues: [] });
      continue;
    }

    const encodedValues: number[] = [];
    let length = 0;
    while (offset < payload.cells.length) {
      const currentEntry = payload.cells[offset];
      if (!currentEntry) {
        break;
      }

      appendColorToken(encodedValues, definition, currentEntry[0]);
      manualFlags.push(currentEntry[1] === 1);
      length += 1;
      offset += 1;
    }

    chartRuns.push({ isFilled: true, length, encodedValues });
  }

  const manualRuns = includeManualRuns ? buildFlagRuns(manualFlags) : [];
  const flags =
    (titleBytes.length > 0 ? FLAG_HAS_TITLE : 0) |
    (manualRuns.length > 0 ? FLAG_HAS_MANUAL_RUNS : 0) |
    (includePreferredEditorMode ? FLAG_HAS_EDITOR_MODE : 0) |
    (payload.editingLocked ? FLAG_EDITING_LOCKED : 0) |
    (includePreferredEditorMode && payload.preferredEditorMode === "pindou"
      ? FLAG_EDITOR_MODE_PINDOU
      : 0);
  const bytes: number[] = [flags];

  pushVarUint(bytes, definition.code);
  pushVarUint(bytes, payload.gridWidth);
  pushVarUint(bytes, payload.gridHeight);

  if (titleBytes.length > 0) {
    pushVarUint(bytes, titleBytes.length);
    bytes.push(...titleBytes);
  }

  for (const run of chartRuns) {
    pushVarUint(bytes, run.length * 2 + (run.isFilled ? 1 : 0));
    if (run.isFilled) {
      bytes.push(...run.encodedValues);
    }
  }

  if (manualRuns.length > 0) {
    pushVarUint(bytes, manualRuns.length);
    for (const run of manualRuns) {
      pushVarUint(bytes, run.skip);
      pushVarUint(bytes, run.length);
    }
  }

  const payloadBytes = Uint8Array.from(bytes);
  const checksummedBytes = new Uint8Array(payloadBytes.length + 4);
  checksummedBytes.set(payloadBytes, 0);
  writeUint32(checksummedBytes, payloadBytes.length, crc32(payloadBytes));
  const compressedBytes = deflateSync(checksummedBytes, { level: 9 });
  return `${SERIALIZATION_PREFIX}${encodeBase83(compressedBytes)}`;
}

export function deserializeChartPayload(serialized: string): SerializedChartPayload {
  if (!serialized.startsWith(SERIALIZATION_PREFIX)) {
    throw new ChartSerializationError(
      "invalid-serialization",
      "Chart serialization prefix is invalid.",
    );
  }

  const compressedBytes = decodeBase83(serialized.slice(SERIALIZATION_PREFIX.length));
  let bytes: Uint8Array;
  try {
    bytes = inflateSync(compressedBytes);
  } catch {
    throw new ChartSerializationError(
      "invalid-serialization",
      "Chart serialization payload cannot be decompressed.",
    );
  }

  if (bytes.length < 5) {
    throw new ChartSerializationError(
      "invalid-serialization",
      "Chart serialization payload is incomplete.",
    );
  }

  const content = bytes.slice(0, bytes.length - 4);
  const expectedCrc = readUint32(bytes, bytes.length - 4);
  if (crc32(content) !== expectedCrc) {
    throw new ChartSerializationError(
      "invalid-serialization",
      "Chart serialization checksum does not match.",
    );
  }

  const reader = { bytes: content, offset: 0 };
  const flags = readByte(reader);
  const definition = sharedColorSystemByCode.get(readVarUint(reader));
  if (!definition) {
    throw new ChartSerializationError(
      "unknown-color-system",
      "Chart serialization references an unsupported color system.",
    );
  }

  const gridWidth = readVarUint(reader);
  const gridHeight = readVarUint(reader);
  if (gridWidth <= 0 || gridHeight <= 0) {
    throw new ChartSerializationError(
      "invalid-serialization",
      "Chart serialization contains an invalid grid size.",
    );
  }

  let title = "";
  if ((flags & FLAG_HAS_TITLE) !== 0) {
    const titleLength = readVarUint(reader);
    title = new TextDecoder().decode(readBytes(reader, titleLength));
  }

  const totalCells = gridWidth * gridHeight;
  const cells: SerializedChartCell[] = Array.from({ length: totalCells }, () => null);
  const occupiedIndexes: number[] = [];
  let position = 0;

  while (position < totalCells) {
    const runHeader = readVarUint(reader);
    const isFilled = (runHeader & 1) === 1;
    const runLength = Math.floor(runHeader / 2);
    if (runLength <= 0) {
      throw new ChartSerializationError(
        "invalid-serialization",
        "Chart serialization contains an empty run token.",
      );
    }
    if (position + runLength > totalCells) {
      throw new ChartSerializationError(
        "invalid-serialization",
        "Chart serialization writes beyond the declared grid size.",
      );
    }

    if (!isFilled) {
      position += runLength;
      continue;
    }

    for (let index = 0; index < runLength; index += 1) {
      const label = readColorToken(reader, definition);
      cells[position] = [label, 0];
      occupiedIndexes.push(position);
      position += 1;
    }
  }

  if ((flags & FLAG_HAS_MANUAL_RUNS) !== 0) {
    const manualRunCount = readVarUint(reader);
    let occupiedOffset = 0;
    for (let runIndex = 0; runIndex < manualRunCount; runIndex += 1) {
      occupiedOffset += readVarUint(reader);
      const runLength = readVarUint(reader);

      for (let entryIndex = 0; entryIndex < runLength; entryIndex += 1) {
        const occupiedCellIndex = occupiedIndexes[occupiedOffset];
        if (occupiedCellIndex === undefined) {
          throw new ChartSerializationError(
            "invalid-serialization",
            "Chart serialization marks a manual cell outside the chart data.",
          );
        }

        const entry = cells[occupiedCellIndex];
        if (!entry) {
          throw new ChartSerializationError(
            "invalid-serialization",
            "Chart serialization contains a manual flag for an empty cell.",
          );
        }

        cells[occupiedCellIndex] = [entry[0], 1];
        occupiedOffset += 1;
      }
    }
  }

  if (reader.offset !== reader.bytes.length) {
    throw new ChartSerializationError(
      "invalid-serialization",
      "Chart serialization has trailing unread data.",
    );
  }

  const editingLocked = (flags & FLAG_EDITING_LOCKED) !== 0;

  return {
    colorSystemId: definition.id,
    gridWidth,
    gridHeight,
    preferredEditorMode: editingLocked
      ? "pindou"
      : (flags & FLAG_HAS_EDITOR_MODE) !== 0
        ? (flags & FLAG_EDITOR_MODE_PINDOU) !== 0
          ? "pindou"
          : "edit"
        : "pindou",
    editingLocked,
    title,
    cells,
  };
}

export function buildChartShareUrl(serialized: string, baseUrl = CHART_SHARE_BASE_URL) {
  return `${baseUrl}?c=${serialized}`;
}

function appendColorToken(
  output: number[],
  definition: SharedColorSystemDefinition,
  label: string,
) {
  const commonIndex = commonIndexByLabelById.get(definition.id)?.get(label);
  if (commonIndex !== undefined) {
    output.push(commonIndex);
    return;
  }

  const extraIndex = extraIndexByLabelById.get(definition.id)?.get(label);
  if (extraIndex !== undefined) {
    output.push(EXTENDED_COLOR_TOKEN);
    pushVarUint(output, extraIndex);
    return;
  }

  throw new ChartSerializationError(
    "unknown-label",
    `Unsupported chart label for ${definition.id}: ${label}`,
  );
}

function readColorToken(
  reader: { bytes: Uint8Array; offset: number },
  definition: SharedColorSystemDefinition,
) {
  const token = readByte(reader);
  if (token < COMMON_COLOR_TOKEN_COUNT) {
    const label = definition.commonLabels[token];
    if (!label) {
      throw new ChartSerializationError(
        "invalid-serialization",
        "Chart serialization uses an unknown common color token.",
      );
    }
    return label;
  }

  if (token === EXTENDED_COLOR_TOKEN) {
    const extraIndex = readVarUint(reader);
    const label = definition.extraLabels[extraIndex];
    if (!label) {
      throw new ChartSerializationError(
        "invalid-serialization",
        "Chart serialization uses an unknown extended color token.",
      );
    }
    return label;
  }

  throw new ChartSerializationError(
    "invalid-serialization",
    `Chart serialization uses an unsupported color token: ${token}`,
  );
}

function buildFlagRuns(flags: boolean[]) {
  const runs: Array<{ skip: number; length: number }> = [];
  let index = 0;

  while (index < flags.length) {
    let skip = 0;
    while (index < flags.length && !flags[index]) {
      skip += 1;
      index += 1;
    }
    if (index >= flags.length) {
      break;
    }

    let length = 0;
    while (index < flags.length && flags[index]) {
      length += 1;
      index += 1;
    }
    runs.push({ skip, length });
  }

  return runs;
}

function pushVarUint(output: number[], value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ChartSerializationError(
      "invalid-input",
      `Chart serialization cannot encode invalid integer value: ${value}`,
    );
  }

  let remaining = value;
  do {
    let byte = remaining & 0x7f;
    remaining = Math.floor(remaining / 128);
    if (remaining > 0) {
      byte |= 0x80;
    }
    output.push(byte);
  } while (remaining > 0);
}

function readVarUint(reader: { bytes: Uint8Array; offset: number }) {
  let value = 0;
  let shift = 0;

  while (true) {
    const byte = readByte(reader);
    value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) {
      return value;
    }

    shift += 7;
    if (shift > 35) {
      throw new ChartSerializationError(
        "invalid-serialization",
        "Chart serialization contains an oversized integer field.",
      );
    }
  }
}

function readByte(reader: { bytes: Uint8Array; offset: number }) {
  const byte = reader.bytes[reader.offset];
  if (byte === undefined) {
    throw new ChartSerializationError(
      "invalid-serialization",
      "Chart serialization ended unexpectedly.",
    );
  }
  reader.offset += 1;
  return byte;
}

function readBytes(reader: { bytes: Uint8Array; offset: number }, length: number) {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new ChartSerializationError(
      "invalid-serialization",
      "Chart serialization contains an invalid byte range.",
    );
  }

  const nextOffset = reader.offset + length;
  if (nextOffset > reader.bytes.length) {
    throw new ChartSerializationError(
      "invalid-serialization",
      "Chart serialization ended unexpectedly.",
    );
  }

  const slice = reader.bytes.slice(reader.offset, nextOffset);
  reader.offset = nextOffset;
  return slice;
}

function encodeBase83(bytes: Uint8Array) {
  if (bytes.length === 0) {
    return "";
  }

  const leadingZeroCount = countLeadingZeroBytes(bytes);
  let value = bytesToBigInt(bytes);
  let encoded = "";

  while (value > 0n) {
    const remainder = Number(value % BASE83_RADIX);
    encoded = BASE83_ALPHABET[remainder] + encoded;
    value /= BASE83_RADIX;
  }

  return BASE83_ALPHABET[0].repeat(leadingZeroCount) + (encoded || BASE83_ALPHABET[0]);
}

function decodeBase83(serialized: string) {
  if (!serialized) {
    throw new ChartSerializationError(
      "invalid-serialization",
      "Chart serialization payload is empty.",
    );
  }

  const leadingZeroCount = countLeadingZeroCharacters(serialized);
  let value = 0n;
  for (const character of serialized) {
    const digit = base83IndexByChar.get(character);
    if (digit === undefined) {
      throw new ChartSerializationError(
        "invalid-serialization",
        `Chart serialization contains an unsupported character: ${character}`,
      );
    }
    value = value * BASE83_RADIX + BigInt(digit);
  }

  const decoded = bigIntToBytes(value);
  const output = new Uint8Array(leadingZeroCount + decoded.length);
  output.set(decoded, leadingZeroCount);
  return output;
}

function countLeadingZeroBytes(bytes: Uint8Array) {
  let count = 0;
  while (count < bytes.length && bytes[count] === 0) {
    count += 1;
  }
  return count;
}

function countLeadingZeroCharacters(serialized: string) {
  let count = 0;
  while (count < serialized.length && serialized[count] === BASE83_ALPHABET[0]) {
    count += 1;
  }
  return count;
}

function bytesToBigInt(bytes: Uint8Array) {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

function bigIntToBytes(value: bigint) {
  if (value === 0n) {
    return new Uint8Array(0);
  }

  const output: number[] = [];
  let remaining = value;
  while (remaining > 0n) {
    output.push(Number(remaining & 0xffn));
    remaining >>= 8n;
  }
  output.reverse();
  return Uint8Array.from(output);
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
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
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
