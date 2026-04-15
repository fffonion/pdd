import clsx from "clsx";
import { useMemo, type RefObject } from "react";
import type { Messages } from "../lib/i18n";
import { measureHexDistance255, type EditableCell } from "../lib/chart-processor";
import { getThemeClasses } from "../lib/theme";

const EMPTY_SELECTION_LABEL = "__EMPTY__";

export interface HoneycombColorOption {
  label: string;
  displayLabel: string;
  hex: string | null;
  radiusScale?: number;
}

interface HoneycombLayoutCell {
  sourceLabel: string;
  label: string;
  hex: string | null;
  radiusScale: number;
  strokeWidth: number;
  points: string;
}

export function ColorPickerPopup({
  t,
  isDark,
  selectedLabel,
  selectedHex,
  open,
  triggerRef,
  setOpen,
}: {
  t: Messages;
  isDark: boolean;
  selectedLabel: string;
  selectedHex: string | null;
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  setOpen: (value: boolean) => void;
}) {
  const theme = getThemeClasses(isDark);
  const displayLabel = selectedLabel === EMPTY_SELECTION_LABEL ? t.emptyPixel : selectedLabel;

  return (
    <div className="shrink-0">
      <button
        ref={triggerRef}
        className={clsx(
          "flex h-10 items-center gap-2 rounded-md border px-3 transition",
          open ? theme.controlButtonActive : theme.pill,
        )}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span
          className="h-4 w-4 rounded-full border border-black/10"
          style={{ backgroundColor: selectedHex ?? "transparent" }}
        />
        <span className={clsx("hidden text-sm font-semibold sm:inline", theme.cardTitle)}>
          {t.selectedColor}
        </span>
        <span className={clsx("text-sm font-semibold", theme.cardTitle)}>{displayLabel}</span>
      </button>
    </div>
  );
}

export function ColorPickerPanel({
  t,
  isDark,
  selectedLabel,
  filterText,
  options,
  onFilterTextChange,
  onSelectLabel,
  popupRef,
  popupStyle,
}: {
  t: Messages;
  isDark: boolean;
  selectedLabel: string;
  filterText: string;
  options: HoneycombColorOption[];
  onFilterTextChange: (value: string) => void;
  onSelectLabel: (label: string) => void;
  popupRef: RefObject<HTMLDivElement | null>;
  popupStyle: { left: number; top: number; width: number; height: number };
}) {
  const popupInnerHeight = Math.max(220, popupStyle.height - 88);
  const theme = getThemeClasses(isDark);

  return (
    <div
      ref={popupRef}
      className={clsx(
        "absolute z-[80] flex flex-col overflow-hidden rounded-[10px] border p-4 shadow-2xl",
        theme.controlShell,
      )}
      style={{
        left: `${popupStyle.left}px`,
        top: `${popupStyle.top}px`,
        width: `${popupStyle.width}px`,
        height: `${popupStyle.height}px`,
      }}
    >
      <input
        className={clsx(
          "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition",
          theme.input,
        )}
        placeholder={t.paletteFilterPlaceholder}
        value={filterText}
        onChange={(event) => onFilterTextChange(event.target.value)}
      />
      <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
        <HoneycombColorGrid
          isDark={isDark}
          selectedLabel={selectedLabel}
          options={options}
          width={popupStyle.width}
          height={popupInnerHeight}
          onSelectLabel={onSelectLabel}
        />
      </div>
    </div>
  );
}

export function HoneycombColorGrid({
  isDark,
  selectedLabel,
  options,
  width,
  height,
  onSelectLabel,
}: {
  isDark: boolean;
  selectedLabel: string;
  options: HoneycombColorOption[];
  width: number;
  height: number;
  onSelectLabel: (label: string) => void;
}) {
  const honeycombLayout = useMemo(
    () => buildHoneycombLayout(options, width, height),
    [options, width, height],
  );

  if (!honeycombLayout.cells.length) {
    return null;
  }

  return (
    <svg
      className="mx-auto block h-auto max-w-full"
      viewBox={`0 0 ${honeycombLayout.width} ${honeycombLayout.height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {honeycombLayout.cells.map((cell) => (
        <g key={cell.sourceLabel} className="cursor-pointer" onClick={() => onSelectLabel(cell.sourceLabel)}>
          <title>{cell.label}</title>
          <polygon
            fill={cell.hex ?? "transparent"}
            points={cell.points}
            stroke={isDark ? "rgba(17, 12, 9, 0.48)" : "rgba(255, 255, 255, 0.75)"}
            strokeWidth={cell.strokeWidth}
          />
          {!cell.hex ? (
            <polygon
              fill="none"
              points={cell.points}
              stroke={
                isDark
                  ? "rgba(168, 162, 158, 0.95)"
                  : "rgba(120, 113, 108, 0.95)"
              }
              strokeDasharray="3 2"
              strokeWidth={1.2 * cell.radiusScale}
            />
          ) : null}
          {selectedLabel === cell.sourceLabel ? (
            <polygon
              fill="none"
              points={cell.points}
              stroke={isDark ? "#FFFFFF" : "#111111"}
              strokeWidth={2.6 * cell.radiusScale}
            />
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function getNearestPaletteOptions(
  color: { label: string; hex: string },
  paletteOptions: Array<{ label: string; hex: string }>,
  limit: number,
) {
  return paletteOptions
    .filter((entry) => entry.label !== color.label)
    .map((entry) => ({
      label: entry.label,
      hex: entry.hex,
      distance: measureHexDistance255(color.hex, entry.hex),
    }))
    .sort((left, right) => left.distance - right.distance || left.label.localeCompare(right.label))
    .slice(0, limit)
    .map(({ label, hex }) => ({ label, hex }));
}

export function summarizeStageColors(
  cells: EditableCell[],
  paletteOptions: Array<{ label: string; hex: string }>,
) {
  const countMap = new Map<string, number>();
  const paletteMap = new Map(paletteOptions.map((entry) => [entry.label, entry.hex]));

  for (const cell of cells) {
    if (!cell.label || !cell.hex) {
      continue;
    }
    countMap.set(cell.label, (countMap.get(cell.label) ?? 0) + 1);
  }

  return Array.from(countMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      hex: paletteMap.get(label) ?? "#000000",
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function buildHoneycombLayout(
  options: HoneycombColorOption[],
  popupWidth: number,
  popupHeight: number,
) {
  if (!options.length) {
    return {
      width: 120,
      height: 100,
      cells: [] as HoneycombLayoutCell[],
    };
  }

  const paddingX = 12;
  const paddingY = 12;
  const positions = buildHoneycombSpiralPositions(options.length);
  const bounds = getHoneycombBounds(positions, options);
  const availableWidth = Math.max(140, popupWidth - paddingX * 2);
  const availableHeight = Math.max(120, popupHeight - paddingY * 2);
  const widthUnits = Math.max(1, bounds.maxX - bounds.minX);
  const heightUnits = Math.max(1, bounds.maxY - bounds.minY);
  const radius = Math.max(
    2.8,
    Math.min(5.2, availableWidth / widthUnits, availableHeight / heightUnits),
  );
  const width = Math.max(120, widthUnits * radius + paddingX * 2);
  const height = Math.max(100, heightUnits * radius + paddingY * 2);
  const centerOffsetX = paddingX + -bounds.minX * radius;
  const centerOffsetY = paddingY + -bounds.minY * radius;

  const cells = options.map((option, index) => {
    const position = positions[index];
    const [unitX, unitY] = axialToUnitPoint(position.q, position.r);
    const centerX = centerOffsetX + unitX * radius;
    const centerY = centerOffsetY + unitY * radius;
    const radiusScale = option.radiusScale ?? 1;
    return {
      sourceLabel: option.label,
      label: option.displayLabel,
      hex: option.hex,
      radiusScale,
      strokeWidth: Math.max(1, radiusScale),
      points: buildHexagonPoints(centerX, centerY, radius * radiusScale),
    };
  });

  return { width, height, cells };
}

function buildHexagonPoints(centerX: number, centerY: number, radius: number) {
  const points: string[] = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    points.push(
      `${(centerX + radius * Math.cos(angle)).toFixed(2)},${(centerY + radius * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return points.join(" ");
}

function buildHoneycombSpiralPositions(count: number) {
  const positions: Array<{ q: number; r: number }> = [];
  if (count <= 0) {
    return positions;
  }

  positions.push({ q: 0, r: 0 });
  if (count === 1) {
    return positions;
  }

  let ring = 1;
  while (positions.length < count) {
    let q = ring;
    let r = 0;
    const directions: Array<[number, number]> = [
      [-1, 1],
      [-1, 0],
      [0, -1],
      [1, -1],
      [1, 0],
      [0, 1],
    ];
    for (const [dq, dr] of directions) {
      for (let step = 0; step < ring; step += 1) {
        if (positions.length >= count) {
          return positions;
        }
        positions.push({ q, r });
        q += dq;
        r += dr;
      }
    }
    ring += 1;
  }

  return positions;
}

function axialToUnitPoint(q: number, r: number) {
  return [Math.sqrt(3) * (q + r / 2), 1.5 * r] as const;
}

function getHoneycombBounds(
  positions: Array<{ q: number; r: number }>,
  options: HoneycombColorOption[],
) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index];
    const radiusScale = options[index]?.radiusScale ?? 1;
    const [x, y] = axialToUnitPoint(position.q, position.r);
    minX = Math.min(minX, x - (Math.sqrt(3) / 2) * radiusScale);
    maxX = Math.max(maxX, x + (Math.sqrt(3) / 2) * radiusScale);
    minY = Math.min(minY, y - radiusScale);
    maxY = Math.max(maxY, y + radiusScale);
  }

  return { minX, maxX, minY, maxY };
}

