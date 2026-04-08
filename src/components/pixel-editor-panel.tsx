import * as Tabs from "@radix-ui/react-tabs";
import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";
import {
  Eraser,
  Eye,
  EyeOff,
  Maximize2,
  PaintBucket,
  Pencil,
  Pipette,
  Redo2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import type { Messages } from "../lib/i18n";
import type { EditableCell, NormalizedCropRect } from "../lib/mard";
import { getThemeClasses } from "../lib/theme";

type EditTool = "paint" | "erase" | "pick" | "fill";
type EditorPanelMode = "edit" | "pindou";

export function PixelEditorPanel({
  t,
  isDark,
  cells,
  gridWidth,
  gridHeight,
  inputUrl,
  overlayCropRect,
  overlayEnabled,
  onOverlayEnabledChange,
  fillTolerance,
  onFillToleranceChange,
  brushSize,
  onBrushSizeChange,
  editTool,
  onEditToolChange,
  selectedLabel,
  selectedHex,
  paletteOptions,
  onSelectedLabelChange,
  onApplyCell,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  paintActiveRef,
  focusViewOpen,
  onFocusViewOpenChange,
  focusOnly = false,
}: {
  t: Messages;
  isDark: boolean;
  cells: EditableCell[];
  gridWidth: number;
  gridHeight: number;
  inputUrl: string | null;
  overlayCropRect: NormalizedCropRect | null;
  overlayEnabled: boolean;
  onOverlayEnabledChange: (value: boolean) => void;
  fillTolerance: number;
  onFillToleranceChange: (value: number) => void;
  brushSize: number;
  onBrushSizeChange: (value: number) => void;
  editTool: EditTool;
  onEditToolChange: (tool: EditTool) => void;
  selectedLabel: string;
  selectedHex: string | null;
  paletteOptions: Array<{ label: string; hex: string }>;
  onSelectedLabelChange: (label: string) => void;
  onApplyCell: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  paintActiveRef: MutableRefObject<boolean>;
  focusViewOpen: boolean;
  onFocusViewOpenChange: (value: boolean) => void;
  focusOnly?: boolean;
}) {
  const theme = getThemeClasses(isDark);
  const [panelMode, setPanelMode] = useState<EditorPanelMode>(focusOnly ? "pindou" : "edit");
  const [focusedSketchLabel, setFocusedSketchLabel] = useState<string | null>(null);
  const pindouColors = useMemo(
    () => summarizeStageColors(cells, paletteOptions),
    [cells, paletteOptions],
  );

  const tools: Array<{
    id: EditTool;
    label: string;
    icon: typeof Pencil;
  }> = [
    { id: "paint", label: t.toolPaint, icon: Pencil },
    { id: "erase", label: t.toolErase, icon: Eraser },
    { id: "pick", label: t.toolPick, icon: Pipette },
    { id: "fill", label: t.toolFill, icon: PaintBucket },
  ];

  useEffect(() => {
    if (!focusedSketchLabel) {
      return;
    }

    if (!cells.some((cell) => cell.label === focusedSketchLabel)) {
      setFocusedSketchLabel(null);
    }
  }, [cells, focusedSketchLabel]);

  useEffect(() => {
    if (focusOnly && panelMode !== "pindou") {
      setPanelMode("pindou");
    }
  }, [focusOnly, panelMode]);

  return (
    focusOnly ? (
      <PindouModePanel
        t={t}
        isDark={isDark}
        cells={cells}
        gridWidth={gridWidth}
        gridHeight={gridHeight}
        focusedSketchLabel={focusedSketchLabel}
        onFocusedSketchLabelChange={setFocusedSketchLabel}
        pindouColors={pindouColors}
        paintActiveRef={paintActiveRef}
        focusViewOpen={focusViewOpen}
        onFocusViewOpenChange={onFocusViewOpenChange}
        focusOnly
      />
    ) : (
    <Tabs.Root className="min-w-0" value={panelMode} onValueChange={(value) => setPanelMode(value as EditorPanelMode)}>
      <Tabs.List className="relative z-10 mb-[-1px] flex min-w-0 items-end gap-1 overflow-x-auto">
        {([
          ["edit", t.editorTabEdit],
          ["pindou", t.editorTabPindou],
        ] as const).map(([value, label]) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className={clsx(
              "shrink-0 rounded-t-[10px] border border-b-0 px-4 py-2 text-sm font-semibold outline-none transition",
              panelMode === value
                ? clsx(theme.card, theme.cardTitle, "translate-y-px")
                : clsx(theme.pill, theme.cardMuted, "opacity-85 hover:opacity-100"),
            )}
          >
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <section className={clsx("rounded-[14px] rounded-tl-none border p-3 backdrop-blur transition-colors sm:rounded-[16px] sm:rounded-tl-none sm:p-4 xl:rounded-[18px] xl:rounded-tl-none", theme.panel)}>
        <Tabs.Content value="edit" className="mt-4">
          <div className="grid min-w-0 gap-3 xl:grid-cols-[56px_minmax(0,1fr)] xl:gap-4">
            <section className={clsx("min-w-0 rounded-[10px] border p-2 transition-colors xl:min-h-[520px]", theme.card)}>
              <div className="flex w-full gap-2 overflow-x-auto xl:flex-col xl:overflow-visible">
                {tools.map((tool) => (
                  <ToolIconButton
                    key={tool.id}
                    active={editTool === tool.id}
                    icon={tool.icon}
                    isDark={isDark}
                    label={tool.label}
                    onClick={() => onEditToolChange(tool.id)}
                  />
                ))}
                <div className={clsx("hidden h-px xl:block", theme.divider)} />
                <ToolIconButton
                  active={false}
                  disabled={!canUndo}
                  icon={Undo2}
                  isDark={isDark}
                  label={t.toolUndo}
                  onClick={onUndo}
                />
                <ToolIconButton
                  active={false}
                  disabled={!canRedo}
                  icon={Redo2}
                  isDark={isDark}
                  label={t.toolRedo}
                  onClick={onRedo}
                />
                <div className={clsx("hidden h-px xl:block", theme.divider)} />
                <ToolIconButton
                  active={overlayEnabled}
                  icon={overlayEnabled ? Eye : EyeOff}
                  isDark={isDark}
                  label={t.overlayToggle}
                  onClick={() => onOverlayEnabledChange(!overlayEnabled)}
                />
              </div>
            </section>

            <section className={clsx("min-w-0 rounded-[10px] border p-3 transition-colors sm:p-4 xl:min-h-[520px]", theme.card)}>
              <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
                <div>
                  <p className={clsx("text-xs uppercase tracking-[0.18em]", theme.cardMuted)}>{t.editorStage}</p>
                  <p className={clsx("mt-1 text-xs", theme.cardMuted)}>
                    {gridWidth} x {gridHeight}
                  </p>
                </div>
                <ContextToolStrip
                  t={t}
                  isDark={isDark}
                  editTool={editTool}
                  selectedLabel={selectedLabel}
                  selectedHex={selectedHex}
                  paletteOptions={paletteOptions}
                  brushSize={brushSize}
                  onBrushSizeChange={onBrushSizeChange}
                  fillTolerance={fillTolerance}
                  onFillToleranceChange={onFillToleranceChange}
                  onEditToolChange={onEditToolChange}
                  onSelectedLabelChange={onSelectedLabelChange}
                />
              </div>

              <EditorStage
                cells={cells}
                gridWidth={gridWidth}
                gridHeight={gridHeight}
                inputUrl={inputUrl}
                overlayCropRect={overlayCropRect}
                overlayEnabled={overlayEnabled}
                isDark={isDark}
                stageMode="edit"
                onApplyCell={onApplyCell}
                paintActiveRef={paintActiveRef}
              />
            </section>
          </div>
        </Tabs.Content>

        <Tabs.Content value="pindou" className="mt-4">
          <PindouModePanel
            t={t}
            isDark={isDark}
            cells={cells}
            gridWidth={gridWidth}
            gridHeight={gridHeight}
            focusedSketchLabel={focusedSketchLabel}
            onFocusedSketchLabelChange={setFocusedSketchLabel}
            pindouColors={pindouColors}
            paintActiveRef={paintActiveRef}
            focusViewOpen={focusViewOpen}
            onFocusViewOpenChange={onFocusViewOpenChange}
          />
        </Tabs.Content>
      </section>
    </Tabs.Root>
    )
  );
}

function PindouModePanel({
  t,
  isDark,
  cells,
  gridWidth,
  gridHeight,
  focusedSketchLabel,
  onFocusedSketchLabelChange,
  pindouColors,
  paintActiveRef,
  focusViewOpen,
  onFocusViewOpenChange,
  focusOnly = false,
}: {
  t: Messages;
  isDark: boolean;
  cells: EditableCell[];
  gridWidth: number;
  gridHeight: number;
  focusedSketchLabel: string | null;
  onFocusedSketchLabelChange: (label: string | null) => void;
  pindouColors: Array<{ label: string; count: number; hex: string }>;
  paintActiveRef: MutableRefObject<boolean>;
  focusViewOpen: boolean;
  onFocusViewOpenChange: (value: boolean) => void;
  focusOnly?: boolean;
}) {
  const theme = getThemeClasses(isDark);

  return (
    <section
      className={clsx(
        "min-w-0",
        focusOnly
          ? "flex min-h-full w-full max-w-[1600px] flex-col justify-center"
          : clsx("rounded-[10px] border p-3 transition-colors sm:p-4", theme.card),
      )}
    >
      {!focusOnly ? (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className={clsx("text-xs uppercase tracking-[0.18em]", theme.cardMuted)}>{t.editorStage}</p>
            <p className={clsx("mt-1 text-xs", theme.cardMuted)}>
              {gridWidth} x {gridHeight}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className={clsx("text-xs", theme.cardMuted)}>{t.pindouModeHint}</p>
            <button
              className={clsx("flex h-9 w-9 items-center justify-center rounded-md border transition", theme.pill)}
              onClick={() => onFocusViewOpenChange(!focusViewOpen)}
              title={t.pindouFocusView}
              type="button"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <EditorStage
        cells={cells}
        gridWidth={gridWidth}
        gridHeight={gridHeight}
        inputUrl={null}
        overlayCropRect={null}
        overlayEnabled={false}
        isDark={isDark}
        stageMode="pindou"
        focusedLabel={focusedSketchLabel}
        onFocusLabelChange={onFocusedSketchLabelChange}
        paintActiveRef={paintActiveRef}
        focusOnly={focusOnly}
      />

      <div className={clsx("mt-4 flex flex-wrap gap-2 overflow-auto pr-1", focusOnly ? "max-h-[unset] justify-center" : "max-h-[220px]")}>
        {pindouColors.map((color) => {
          const active = focusedSketchLabel === color.label;
          return (
            <button
              key={color.label}
              className={clsx(
                "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                active ? theme.controlButtonActive : theme.pill,
              )}
              onClick={() => onFocusedSketchLabelChange(active ? null : color.label)}
              type="button"
              title={color.label}
            >
              <span
                className="h-5 w-5 rounded-full border border-black/10"
                style={{ backgroundColor: color.hex }}
              />
              <span className={clsx("text-sm font-semibold", active ? "" : theme.cardTitle)}>
                {color.label}
              </span>
              <span className={clsx("text-xs", active ? "" : theme.cardMuted)}>{color.count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ContextToolStrip({
  t,
  isDark,
  editTool,
  selectedLabel,
  selectedHex,
  paletteOptions,
  brushSize,
  onBrushSizeChange,
  fillTolerance,
  onFillToleranceChange,
  onEditToolChange,
  onSelectedLabelChange,
}: {
  t: Messages;
  isDark: boolean;
  editTool: EditTool;
  selectedLabel: string;
  selectedHex: string | null;
  paletteOptions: Array<{ label: string; hex: string }>;
  brushSize: number;
  onBrushSizeChange: (value: number) => void;
  fillTolerance: number;
  onFillToleranceChange: (value: number) => void;
  onEditToolChange: (tool: EditTool) => void;
  onSelectedLabelChange: (label: string) => void;
}) {
  const theme = getThemeClasses(isDark);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [popupStyle, setPopupStyle] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const showPalette = editTool === "paint" || editTool === "fill";
  const showBrushSize = editTool === "paint" || editTool === "erase";
  const showFillThreshold = editTool === "fill";
  const filteredPaletteOptions = useMemo(() => {
    const query = filterText.trim().toUpperCase();
    const source = [{ label: "H2", hex: null }, ...paletteOptions];
    if (!query) {
      return source;
    }
    return source.filter((option) => option.label.toUpperCase().includes(query));
  }, [filterText, paletteOptions]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    function syncPopupPosition() {
      if (!triggerRef.current) {
        return;
      }

      const rect = triggerRef.current.getBoundingClientRect();
      const width = window.innerWidth < 640
        ? Math.min(window.innerWidth - 20, 360)
        : Math.min(460, Math.max(280, Math.min(window.innerWidth - 24, Math.floor(window.innerWidth * 0.34))));
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      const maxHeight = Math.min(560, Math.max(320, Math.floor(window.innerHeight * 0.62)));
      const preferredTop = rect.bottom + 10;
      const top =
        preferredTop + maxHeight <= window.innerHeight - 12
          ? preferredTop
          : Math.max(12, rect.top - maxHeight - 10);
      const height = Math.max(300, Math.min(maxHeight, window.innerHeight - top - 12));
      setPopupStyle({ top, left, width, height });
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        !popupRef.current?.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setPickerOpen(false);
      }
    }

    syncPopupPosition();
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", syncPopupPosition);
    window.addEventListener("scroll", syncPopupPosition, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", syncPopupPosition);
      window.removeEventListener("scroll", syncPopupPosition, true);
    };
  }, [pickerOpen]);

  return (
    <div className={clsx("min-w-0 w-full overflow-hidden rounded-[8px] border px-2.5 py-2 sm:flex-1 sm:px-4", theme.previewStage)}>
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
        {showPalette ? (
          <ColorPickerPopup
            t={t}
            isDark={isDark}
            selectedLabel={selectedLabel}
            selectedHex={selectedHex}
            filterText={filterText}
            options={filteredPaletteOptions}
            onFilterTextChange={setFilterText}
            onSelectLabel={(label) => {
              onEditToolChange(editTool === "fill" ? "fill" : "paint");
              onSelectedLabelChange(label);
              setPickerOpen(false);
            }}
            open={pickerOpen}
            popupStyle={popupStyle}
            popupRef={popupRef}
            triggerRef={triggerRef}
            setOpen={setPickerOpen}
          />
        ) : null}
        {showBrushSize ? (
          <InlineSliderField
            id="brush-size"
            isDark={isDark}
            label={t.brushSize}
            max={12}
            min={1}
            step={1}
            value={brushSize}
            onValueChange={onBrushSizeChange}
          />
        ) : null}
        {showFillThreshold ? (
          <InlineSliderField
            id="fill-threshold"
            isDark={isDark}
            label={t.fillThreshold}
            max={255}
            min={0}
            step={1}
            value={fillTolerance}
            onValueChange={onFillToleranceChange}
          />
        ) : null}
        <span className={clsx("hidden shrink-0 text-xs xl:inline", theme.cardMuted)}>{t.paletteHint}</span>
      </div>
    </div>
  );
}

function ColorPickerPopup({
  t,
  isDark,
  selectedLabel,
  selectedHex,
  filterText,
  options,
  onFilterTextChange,
  onSelectLabel,
  open,
  popupStyle,
  popupRef,
  triggerRef,
  setOpen,
}: {
  t: Messages;
  isDark: boolean;
  selectedLabel: string;
  selectedHex: string | null;
  filterText: string;
  options: Array<{ label: string; hex: string | null }>;
  onFilterTextChange: (value: string) => void;
  onSelectLabel: (label: string) => void;
  open: boolean;
  popupStyle: { top: number; left: number; width: number; height: number } | null;
  popupRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  setOpen: (value: boolean) => void;
}) {
  const theme = getThemeClasses(isDark);
  const popupInnerHeight = useMemo(() => {
    if (!popupStyle) {
      return 320;
    }
    return Math.max(200, popupStyle.height - 88);
  }, [popupStyle]);
  const honeycombLayout = useMemo(
    () => buildHoneycombLayout(options, popupStyle?.width ?? 420, popupInnerHeight),
    [options, popupInnerHeight, popupStyle?.width],
  );

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
        <span className={clsx("hidden text-[11px] uppercase tracking-[0.14em] sm:inline", theme.cardMuted)}>{t.selectedColor}</span>
        <span className={clsx("text-sm font-semibold", theme.cardTitle)}>{selectedLabel}</span>
      </button>

      {open && popupStyle ? (
        <div
          ref={popupRef}
          className={clsx("fixed z-[80] flex flex-col overflow-hidden rounded-[10px] border p-4 shadow-2xl", theme.controlShell)}
          style={{
            top: `${popupStyle.top}px`,
            left: `${popupStyle.left}px`,
            width: `${popupStyle.width}px`,
            height: `${popupStyle.height}px`,
          }}
        >
          <input
            className={clsx("w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition", theme.input)}
            placeholder={t.paletteFilterPlaceholder}
            value={filterText}
            onChange={(event) => onFilterTextChange(event.target.value)}
          />
          <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
            {honeycombLayout.cells.length ? (
              <svg
                className="mx-auto block h-auto max-w-full"
                viewBox={`0 0 ${honeycombLayout.width} ${honeycombLayout.height}`}
                xmlns="http://www.w3.org/2000/svg"
              >
                {honeycombLayout.cells.map((cell) => (
                  <g
                    key={cell.label}
                    className="cursor-pointer"
                    onClick={() => onSelectLabel(cell.sourceLabel)}
                  >
                    <title>{cell.label}</title>
                    <polygon
                      fill={cell.hex ?? "transparent"}
                      points={cell.points}
                      stroke={isDark ? "rgba(17, 12, 9, 0.48)" : "rgba(255, 255, 255, 0.75)"}
                      strokeWidth={1}
                    />
                    {!cell.hex ? (
                      <polygon
                        fill="none"
                        points={cell.points}
                        stroke={isDark ? "rgba(168, 162, 158, 0.95)" : "rgba(120, 113, 108, 0.95)"}
                        strokeDasharray="3 2"
                        strokeWidth={1.2}
                      />
                    ) : null}
                    {selectedLabel === cell.sourceLabel ? (
                      <polygon
                        fill="none"
                        points={cell.points}
                        stroke={isDark ? "#FFFFFF" : "#111111"}
                        strokeWidth={2.6}
                      />
                    ) : null}
                  </g>
                ))}
              </svg>
            ) : (
              <p className={clsx("px-2 py-3 text-sm", theme.cardMuted)}>{t.paletteHint}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EditorStage({
  cells,
  gridWidth,
  gridHeight,
  inputUrl,
  overlayCropRect,
  overlayEnabled,
  isDark,
  stageMode,
  focusedLabel,
  onFocusLabelChange,
  onApplyCell,
  paintActiveRef,
  focusOnly = false,
}: {
  cells: EditableCell[];
  gridWidth: number;
  gridHeight: number;
  inputUrl: string | null;
  overlayCropRect: NormalizedCropRect | null;
  overlayEnabled: boolean;
  isDark: boolean;
  stageMode: EditorPanelMode;
  focusedLabel?: string | null;
  onFocusLabelChange?: (label: string | null) => void;
  onApplyCell?: (index: number) => void;
  paintActiveRef: MutableRefObject<boolean>;
  focusOnly?: boolean;
}) {
  const theme = getThemeClasses(isDark);
  const stageViewportRef = useRef<HTMLDivElement | null>(null);
  const [stageViewport, setStageViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function syncViewport() {
      if (!stageViewportRef.current) {
        return;
      }

      const rect = stageViewportRef.current.getBoundingClientRect();
      const width = Math.max(0, stageViewportRef.current.clientWidth - (window.innerWidth < 640 ? 16 : 24));
      const height = Math.max(0, window.innerHeight - rect.top - 24);
      setStageViewport((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    }

    syncViewport();
    const observer = new ResizeObserver(() => syncViewport());
    if (stageViewportRef.current) {
      observer.observe(stageViewportRef.current);
    }
    window.addEventListener("resize", syncViewport);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  const cellSize = calculateStageCellSize(
    gridWidth,
    gridHeight,
    stageViewport.width,
    stageViewport.height,
  );
  const gridGap = 1;
  const stageWidth = gridWidth * cellSize + Math.max(0, gridWidth - 1) * gridGap;
  const stageHeight = gridHeight * cellSize + Math.max(0, gridHeight - 1) * gridGap;
  const stageScale = calculateStageScale(
    stageWidth,
    stageHeight,
    stageViewport.width,
    stageViewport.height,
  );
  const scaledStageWidth = Math.min(stageWidth * stageScale, Math.max(0, stageViewport.width));
  const scaledStageHeight = stageHeight * stageScale;
  const axisGutter = stageMode === "pindou" ? Math.max(22, Math.round(26 * stageScale)) : 0;
  const topGutter = stageMode === "pindou" ? axisGutter : 0;
  const leftGutter = stageMode === "pindou" ? axisGutter : 0;

  return (
    <div
      ref={stageViewportRef}
      className={clsx(
        "mt-4 w-full min-w-0 max-w-full overflow-hidden rounded-[10px] border p-2 sm:p-3",
        focusOnly ? "flex-1" : "",
        theme.previewStage,
      )}
    >
      <div className={clsx("flex", focusOnly ? "min-h-full items-center justify-center" : "justify-center")}>
        <div
          className="relative w-fit max-w-full"
          style={{
            width: `${scaledStageWidth + leftGutter}px`,
            height: `${scaledStageHeight + topGutter}px`,
          }}
        >
          {stageMode === "pindou" ? (
            <>
              <div
                className="absolute left-0 top-0"
                style={{
                  width: `${leftGutter}px`,
                  height: `${topGutter}px`,
                }}
              />
              <AxisLabels
                axis="x"
                gridCount={gridWidth}
                offset={leftGutter}
                gutter={topGutter}
                stageScale={stageScale}
                stageLength={scaledStageWidth}
                isDark={isDark}
              />
              <AxisLabels
                axis="y"
                gridCount={gridHeight}
                offset={topGutter}
                gutter={leftGutter}
                stageScale={stageScale}
                stageLength={scaledStageHeight}
                isDark={isDark}
              />
            </>
          ) : null}

          <div
            className="absolute overflow-hidden rounded-[8px]"
            style={{
              left: `${leftGutter}px`,
              top: `${topGutter}px`,
              width: `${scaledStageWidth}px`,
              height: `${scaledStageHeight}px`,
            }}
          >
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: `${stageWidth}px`,
                height: `${stageHeight}px`,
                transform: `scale(${stageScale})`,
              }}
            >
              {overlayEnabled && inputUrl ? (
                <img
                  className="pointer-events-none absolute inset-0 z-20 h-full w-full object-cover"
                  src={inputUrl}
                  alt=""
                  style={buildOverlayImageStyle(overlayCropRect)}
                />
              ) : null}

              {stageMode === "pindou" ? (
                <PindouGuideLines
                  gridWidth={gridWidth}
                  gridHeight={gridHeight}
                  cellSize={cellSize}
                  gridGap={gridGap}
                />
              ) : null}

              <div
                className="absolute inset-0 z-10 grid gap-px"
                style={{
                  gridTemplateColumns: `repeat(${gridWidth}, minmax(${cellSize}px, ${cellSize}px))`,
                  gridTemplateRows: `repeat(${gridHeight}, minmax(${cellSize}px, ${cellSize}px))`,
                  backgroundColor: isDark ? "#3a3128" : "#c9c4bc",
                }}
              >
                {cells.map((cell, index) => (
                  <button
                    key={index}
                    className="relative border-0 p-0"
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      backgroundColor: getStageCellBackgroundColor(cell, stageMode, focusedLabel, isDark),
                      boxShadow: getStageCellHighlight(cell, stageMode, focusedLabel, isDark),
                    }}
                    onMouseDown={() => {
                      if (stageMode !== "edit") {
                        return;
                      }
                      paintActiveRef.current = true;
                      onApplyCell?.(index);
                    }}
                    onPointerDown={() => {
                      if (stageMode === "pindou") {
                        onFocusLabelChange?.(cell.label && cell.label === focusedLabel ? null : cell.label);
                        return;
                      }
                      paintActiveRef.current = true;
                      onApplyCell?.(index);
                    }}
                    onMouseEnter={(event) => {
                      if (stageMode !== "edit") {
                        return;
                      }
                      if ((event.buttons & 1) === 1 && paintActiveRef.current) {
                        onApplyCell?.(index);
                      }
                    }}
                    onPointerEnter={(event) => {
                      if (stageMode !== "edit") {
                        return;
                      }
                      if ((event.buttons & 1) === 1 && paintActiveRef.current) {
                        onApplyCell?.(index);
                      }
                    }}
                    type="button"
                  >
                    {cell.label && cellSize >= 18 ? (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] font-bold text-black/65 mix-blend-multiply sm:text-[9px]">
                        {cell.label}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AxisLabels({
  axis,
  gridCount,
  offset,
  gutter,
  stageScale,
  stageLength,
  isDark,
}: {
  axis: "x" | "y";
  gridCount: number;
  offset: number;
  gutter: number;
  stageScale: number;
  stageLength: number;
  isDark: boolean;
}) {
  const textColor = isDark ? "rgba(255,255,255,0.82)" : "rgba(17,17,17,0.78)";
  const fontSize = Math.max(9, Math.min(12, 10 * stageScale + 1));
  const labels = buildAxisLabelPositions(gridCount);

  return (
    <>
      {labels.map((label) => {
        const position = ((label.index + 0.5) / gridCount) * stageLength;
        return (
          <div
            key={`${axis}-${label.value}`}
            className="pointer-events-none absolute flex items-center justify-center font-semibold"
            style={
              axis === "x"
                ? {
                    left: `${offset + position}px`,
                    top: `${gutter * 0.12}px`,
                    width: `${Math.max(12, 18 * stageScale)}px`,
                    height: `${gutter * 0.76}px`,
                    transform: "translateX(-50%)",
                    color: textColor,
                    fontSize: `${fontSize}px`,
                  }
                : {
                    left: `${gutter * 0.08}px`,
                    top: `${offset + position}px`,
                    width: `${gutter * 0.76}px`,
                    height: `${Math.max(12, 18 * stageScale)}px`,
                    transform: "translateY(-50%)",
                    color: textColor,
                    fontSize: `${fontSize}px`,
                  }
            }
          >
            {label.value}
          </div>
        );
      })}
    </>
  );
}

function PindouGuideLines({
  gridWidth,
  gridHeight,
  cellSize,
  gridGap,
}: {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  gridGap: number;
}) {
  const pitch = cellSize + gridGap;
  const lines: Array<{
    key: string;
    orientation: "vertical" | "horizontal";
    position: number;
    dashed: boolean;
  }> = [];

  for (let index = 5; index < gridWidth; index += 5) {
    lines.push({
      key: `vx-${index}`,
      orientation: "vertical",
      position: index * pitch - gridGap / 2,
      dashed: index % 10 !== 0,
    });
  }

  for (let index = 5; index < gridHeight; index += 5) {
    lines.push({
      key: `hy-${index}`,
      orientation: "horizontal",
      position: index * pitch - gridGap / 2,
      dashed: index % 10 !== 0,
    });
  }

  return (
    <>
      {lines.map((line) => (
        <div
          key={line.key}
          className="pointer-events-none absolute z-30 bg-black"
          style={
            line.orientation === "vertical"
              ? {
                  left: `${line.position}px`,
                  top: 0,
                  width: "1.5px",
                  height: "100%",
                  opacity: line.dashed ? 0.9 : 1,
                  backgroundImage: line.dashed
                    ? "repeating-linear-gradient(to bottom, #000 0 7px, transparent 7px 11px)"
                    : "none",
                  backgroundColor: line.dashed ? "transparent" : "#000",
                }
              : {
                  top: `${line.position}px`,
                  left: 0,
                  height: "1.5px",
                  width: "100%",
                  opacity: line.dashed ? 0.9 : 1,
                  backgroundImage: line.dashed
                    ? "repeating-linear-gradient(to right, #000 0 7px, transparent 7px 11px)"
                    : "none",
                  backgroundColor: line.dashed ? "transparent" : "#000",
                }
          }
        />
      ))}
    </>
  );
}

function buildAxisLabelPositions(gridCount: number) {
  const labels: Array<{ index: number; value: number }> = [];
  for (let index = 0; index < gridCount; index += 1) {
    const value = index + 1;
    if (value === 1 || value % 5 === 0 || value === gridCount) {
      labels.push({ index, value });
    }
  }
  return labels;
}

function summarizeStageColors(
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

function getStageCellBackgroundColor(
  cell: EditableCell,
  stageMode: EditorPanelMode,
  focusedLabel: string | null | undefined,
  isDark: boolean,
) {
  const emptyColor = isDark ? "rgba(29,20,16,0.55)" : "rgba(247,244,238,0.65)";
  if (stageMode !== "pindou" || !focusedLabel) {
    return cell.hex ?? emptyColor;
  }

  if (cell.label === focusedLabel && cell.hex) {
    return cell.hex;
  }

  if (cell.hex) {
    return blendHexWithWhite(cell.hex, 0.92);
  }

  return isDark ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.96)";
}

function getStageCellHighlight(
  cell: EditableCell,
  stageMode: EditorPanelMode,
  focusedLabel: string | null | undefined,
  isDark: boolean,
) {
  if (stageMode !== "pindou" || !focusedLabel || cell.label !== focusedLabel) {
    return "none";
  }

  return isDark
    ? "inset 0 0 0 2px rgba(255,255,255,0.9), 0 0 0 1px rgba(255,255,255,0.35)"
    : "inset 0 0 0 2px rgba(17,17,17,0.84), 0 0 0 1px rgba(17,17,17,0.18)";
}

function blendHexWithWhite(hex: string, ratio: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const mix = (value: number) => Math.round(value + (255 - value) * ratio);
  return `rgb(${mix(red)}, ${mix(green)}, ${mix(blue)})`;
}

function InlineSliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  isDark,
  onValueChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  isDark: boolean;
  onValueChange: (value: number) => void;
}) {
  const theme = getThemeClasses(isDark);
  return (
    <div className={clsx("flex min-w-[116px] shrink-0 items-center gap-2 rounded-md border px-2 py-2 sm:min-w-[210px] sm:gap-3 sm:px-3", theme.pill)}>
      <label className={clsx("hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] sm:inline", theme.cardMuted)} htmlFor={id}>
          {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Slider.Root
          id={id}
          className="relative flex h-5 min-w-[56px] flex-1 touch-none select-none items-center sm:min-w-[120px]"
          max={max}
          min={min}
          step={step}
          value={[value]}
          onValueChange={(next) => onValueChange(next[0] ?? value)}
        >
          <Slider.Track className={clsx("relative h-2 grow rounded-full", theme.sliderTrack)}>
            <Slider.Range className={clsx("absolute h-full rounded-full", theme.sliderRange)} />
          </Slider.Track>
          <Slider.Thumb className={clsx("block h-5 w-5 rounded-full border shadow outline-none", theme.sliderThumb)} />
        </Slider.Root>
        <span className={clsx("w-7 shrink-0 text-right text-sm font-semibold sm:w-8", theme.cardTitle)}>{value}</span>
      </div>
    </div>
  );
}

function ToolIconButton({
  active,
  disabled,
  icon: Icon,
  isDark,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: typeof Pencil;
  isDark: boolean;
  label: string;
  onClick: () => void;
}) {
  const theme = getThemeClasses(isDark);
  return (
    <button
      className={clsx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition xl:h-10 xl:w-10",
        disabled
          ? theme.disabledButton
          : active
            ? theme.controlButtonActive
            : theme.pill,
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function buildOverlayImageStyle(
  cropRect: NormalizedCropRect | null,
) {
  if (!cropRect) {
    return { opacity: 1 };
  }

  return {
    opacity: 1,
    width: `${100 / cropRect.width}%`,
    height: `${100 / cropRect.height}%`,
    maxWidth: "none",
    left: `-${(cropRect.x / cropRect.width) * 100}%`,
    top: `-${(cropRect.y / cropRect.height) * 100}%`,
  } as const;
}

function chunkPalette<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function buildHoneycombLayout(
  options: Array<{ label: string; hex: string | null }>,
  popupWidth: number,
  popupHeight: number,
) {
  if (!options.length) {
    return { width: 120, height: 100, cells: [] as Array<{ sourceLabel: string; label: string; hex: string | null; points: string }> };
  }

  const paddingX = 12;
  const paddingY = 12;
  const positions = buildHoneycombSpiralPositions(options.length);
  const bounds = getHoneycombBounds(positions);
  const availableWidth = Math.max(140, popupWidth - paddingX * 2);
  const availableHeight = Math.max(120, popupHeight - paddingY * 2);
  const widthUnits = Math.max(1, bounds.maxX - bounds.minX);
  const heightUnits = Math.max(1, bounds.maxY - bounds.minY);
  const radius = Math.max(2.8, Math.min(5.2, availableWidth / widthUnits, availableHeight / heightUnits));
  const width = Math.max(120, widthUnits * radius + paddingX * 2);
  const height = Math.max(100, heightUnits * radius + paddingY * 2);
  const centerOffsetX = paddingX + (-bounds.minX) * radius;
  const centerOffsetY = paddingY + (-bounds.minY) * radius;

  const cells = options.map((option, index) => {
    const position = positions[index];
    const [unitX, unitY] = axialToUnitPoint(position.q, position.r);
    const centerX = centerOffsetX + unitX * radius;
    const centerY = centerOffsetY + unitY * radius;
    return {
      sourceLabel: option.label,
      label: option.label === "H2" ? "H2" : option.label,
      hex: option.hex,
      points: buildHexagonPoints(centerX, centerY, radius),
    };
  });

  return { width, height, cells };
}

function buildHexagonPoints(centerX: number, centerY: number, radius: number) {
  const points: string[] = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
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
  return [
    Math.sqrt(3) * (q + r / 2),
    1.5 * r,
  ] as const;
}

function getHoneycombBounds(positions: Array<{ q: number; r: number }>) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const position of positions) {
    const [x, y] = axialToUnitPoint(position.q, position.r);
    minX = Math.min(minX, x - Math.sqrt(3) / 2);
    maxX = Math.max(maxX, x + Math.sqrt(3) / 2);
    minY = Math.min(minY, y - 1);
    maxY = Math.max(maxY, y + 1);
  }

  return { minX, maxX, minY, maxY };
}

function calculateStageCellSize(
  gridWidth: number,
  gridHeight: number,
  availableWidth: number,
  availableHeight: number,
) {
  if (gridWidth <= 0 || gridHeight <= 0) {
    return 12;
  }

  const widthBound = availableWidth > 0 ? Math.floor(availableWidth / gridWidth) : 26;
  const heightBound = availableHeight > 0 ? Math.floor(availableHeight / gridHeight) : 26;
  const fitted = Math.min(widthBound, heightBound);
  return Math.max(4, Math.min(26, fitted || 26));
}

function calculateStageScale(
  stageWidth: number,
  stageHeight: number,
  availableWidth: number,
  availableHeight: number,
) {
  if (stageWidth <= 0 || stageHeight <= 0) {
    return 1;
  }

  const widthScale = availableWidth > 0 ? availableWidth / stageWidth : 1;
  const heightScale = availableHeight > 0 ? availableHeight / stageHeight : 1;
  return Math.max(0.1, Math.min(1, widthScale, heightScale));
}
