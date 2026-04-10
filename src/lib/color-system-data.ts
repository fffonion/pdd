import mard221CommonJson from "../data/mard-221-common.json";
import colorSystemMappingTsv from "../data/color-system-mapping.tsv?raw";

export interface SharedColorSystemDefinition {
  code: number;
  id: string;
  label: string;
  labelToHex: Record<string, string>;
  commonLabels: string[];
  extraLabels: string[];
}

interface MappingRow {
  hex: string;
  mard: string;
  coco: string;
  manman: string;
  panpan: string;
  mixiaowo: string;
}

const commonHexes = (mard221CommonJson as string[]).map((hex) => normalizeHex(hex));
const commonHexSet = new Set(commonHexes);
const mappingRows = parseCompactColorMapping(colorSystemMappingTsv);
const mappingRowByHex = new Map(mappingRows.map((row) => [row.hex, row]));

export const sharedColorSystemDefinitions: SharedColorSystemDefinition[] = [
  buildMard221Definition(),
  buildMappedDefinition(1, "mard_full", "MARD Full", "mard"),
  buildMappedDefinition(2, "system_COCO", "COCO", "coco"),
  buildMappedDefinition(3, "system_漫漫", "漫漫", "manman"),
  buildMappedDefinition(4, "system_盼盼", "盼盼", "panpan"),
  buildMappedDefinition(5, "system_咪小窝", "咪小窝", "mixiaowo"),
];

export const sharedColorSystemById = new Map(
  sharedColorSystemDefinitions.map((entry) => [entry.id, entry]),
);
export const sharedColorSystemByCode = new Map(
  sharedColorSystemDefinitions.map((entry) => [entry.code, entry]),
);

function buildMard221Definition(): SharedColorSystemDefinition {
  const pairs = commonHexes.map((hex) => {
    const row = mappingRowByHex.get(hex);
    if (!row?.mard) {
      throw new Error(`Missing MARD mapping for common color ${hex}.`);
    }
    const label = normalizeMard221Label(row.mard);
    return [label, hex] as const;
  });

  return {
    code: 0,
    id: "mard_221",
    label: "MARD 221",
    labelToHex: Object.fromEntries(pairs),
    commonLabels: pairs.map(([label]) => label),
    extraLabels: [],
  };
}

function buildMappedDefinition(
  code: number,
  id: string,
  label: string,
  field: keyof MappingRow,
): SharedColorSystemDefinition {
  const commonLabels = commonHexes.map((hex) => {
    const row = mappingRowByHex.get(hex);
    const systemLabel = row?.[field];
    if (!systemLabel) {
      throw new Error(`Missing ${id} mapping for common color ${hex}.`);
    }
    return systemLabel;
  });

  const labelToHex: Record<string, string> = {};
  const extraLabels: string[] = [];
  for (const row of mappingRows) {
    const systemLabel = row[field];
    if (!systemLabel) {
      continue;
    }
    labelToHex[systemLabel] = row.hex;
    if (!commonHexSet.has(row.hex)) {
      extraLabels.push(systemLabel);
    }
  }

  extraLabels.sort(compareTextCodePoint);

  return {
    code,
    id,
    label,
    labelToHex,
    commonLabels,
    extraLabels,
  };
}

function parseCompactColorMapping(tsv: string) {
  return tsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [hex, mard = "", coco = "", manman = "", panpan = "", mixiaowo = ""] =
        line.split("\t");
      return {
        hex: normalizeHex(hex),
        mard,
        coco,
        manman,
        panpan,
        mixiaowo,
      } satisfies MappingRow;
    });
}

function normalizeHex(value: string) {
  return `#${value.replace(/^#/, "").toUpperCase()}`;
}

function normalizeMard221Label(label: string) {
  const match = /^([A-Z]+)0*([1-9]\d*)$/i.exec(label.trim());
  if (!match) {
    return label.trim();
  }
  return `${match[1].toUpperCase()}${Number.parseInt(match[2], 10)}`;
}

function compareTextCodePoint(left: string, right: string) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
