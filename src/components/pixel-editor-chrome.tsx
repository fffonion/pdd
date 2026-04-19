import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";
import { Circle, type LucideIcon, Square } from "lucide-react";
import type { PindouBeadShape, PindouBoardTheme } from "../lib/pindou-board-theme";
import { getPindouBoardThemeShades, pindouBoardThemes } from "../lib/pindou-board-theme";
import { getThemeClasses } from "../lib/theme";

export function getCompactPindouToolbarButtonMetrics() {
  return {
    groupGapClass: "gap-[3px]",
    buttonSizeClass: "h-[30px] w-[30px]",
    boardSwatchPaddingClass: "p-[3px]",
    boardSwatchInnerRadiusClass: "rounded-[6px]",
    iconSizeClass: "h-[16px] w-[16px]",
  };
}

export function InlineSliderField({
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
    <div className={clsx("flex min-h-11 min-w-[116px] shrink-0 items-center gap-2 rounded-[10px] border px-2.5 py-2 sm:min-h-0 sm:rounded-md sm:px-3 sm:py-2 sm:min-w-[210px] sm:gap-3", theme.pill)}>
      <label className={clsx("hidden shrink-0 text-sm font-semibold sm:inline", theme.cardTitle)} htmlFor={id}>
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

export function ToolIconButton({
  active,
  disabled,
  icon: Icon,
  isDark,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  isDark: boolean;
  label: string;
  onClick: () => void;
}) {
  const theme = getThemeClasses(isDark);
  return (
    <button
      className={clsx(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border transition sm:h-10 sm:w-10 sm:rounded-md xl:h-10 xl:w-10",
        disabled ? theme.disabledButton : active ? theme.controlButtonActive : theme.pill,
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

export function PindouBeadShapeButtons({
  isDark,
  selectedShape,
  labels,
  groupLabel,
  onChange,
}: {
  isDark: boolean;
  selectedShape: PindouBeadShape;
  labels: Record<PindouBeadShape, string>;
  groupLabel: string;
  onChange: (value: PindouBeadShape) => void;
}) {
  const theme = getThemeClasses(isDark);
  const compactMetrics = getCompactPindouToolbarButtonMetrics();
  const shapeIcons: Record<PindouBeadShape, LucideIcon> = {
    square: Square,
    circle: Circle,
  };

  return (
    <div className={clsx("flex items-center", compactMetrics.groupGapClass)} aria-label={groupLabel} role="group">
      {(["square", "circle"] as const).map((shape) => {
        const Icon = shapeIcons[shape];
        return (
          <button
            key={shape}
            className={clsx(
              "flex shrink-0 items-center justify-center rounded-[8px] border transition sm:rounded-md",
              compactMetrics.buttonSizeClass,
              selectedShape === shape ? theme.controlButtonActive : theme.pill,
            )}
            onClick={() => onChange(shape)}
            title={labels[shape]}
            type="button"
          >
            <Icon className={compactMetrics.iconSizeClass} />
          </button>
        );
      })}
    </div>
  );
}

export function PindouBoardThemeButtons({
  isDark,
  selectedTheme,
  labels,
  groupLabel,
  onChange,
}: {
  isDark: boolean;
  selectedTheme: PindouBoardTheme;
  labels: Record<PindouBoardTheme, string>;
  groupLabel: string;
  onChange: (value: PindouBoardTheme) => void;
}) {
  const theme = getThemeClasses(isDark);
  const compactMetrics = getCompactPindouToolbarButtonMetrics();

  return (
    <div className={clsx("flex items-center", compactMetrics.groupGapClass)} aria-label={groupLabel} role="group">
      {pindouBoardThemes.map((boardTheme) => {
        const shades = getPindouBoardThemeShades(boardTheme);
        return (
          <button
            key={boardTheme}
            className={clsx(
              "flex shrink-0 items-center justify-center rounded-[8px] border transition sm:rounded-md",
              compactMetrics.buttonSizeClass,
              compactMetrics.boardSwatchPaddingClass,
              selectedTheme === boardTheme ? theme.controlButtonActive : theme.pill,
            )}
            onClick={() => onChange(boardTheme)}
            title={labels[boardTheme]}
            type="button"
          >
            <span
              className={clsx("h-full w-full border border-black/10", compactMetrics.boardSwatchInnerRadiusClass)}
              style={boardTheme === "none"
                ? {
                    background: "#FFFFFF",
                    boxShadow: "inset 0 0 0 1px rgba(17,17,17,0.08)",
                  }
                : {
                    background: `linear-gradient(135deg, ${shades[0]} 0%, ${shades[0]} 33%, ${shades[1]} 33%, ${shades[1]} 66%, ${shades[2]} 66%, ${shades[2]} 100%)`,
                  }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function BlinkingTimerText({
  value,
  colonVisible,
  className,
}: {
  value: string;
  colonVisible: boolean;
  className?: string;
}) {
  const [hoursText, minutesText = "00"] = value.split(":");

  return (
    <span className={clsx("inline-flex items-center justify-center leading-none tabular-nums", className)}>
      <span>{hoursText}</span>
      <span className={clsx("inline-block w-[0.5ch] text-center transition-opacity", colonVisible ? "opacity-100" : "opacity-0")}>:</span>
      <span>{minutesText}</span>
    </span>
  );
}

export function BatteryStatusIcon({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  const level = getBatteryLevelBand(percent);
  const fillColor = level.color;
  const activeSegments = level.segments;

  return (
    <svg
      aria-label={`battery-${activeSegments}`}
      className={className}
      viewBox="0 0 28 14"
      fill="none"
      role="img"
    >
      <rect x="1" y="2" width="23" height="10" rx="2.2" stroke={fillColor} strokeWidth="1.2" />
      <rect x="24.8" y="5" width="2.2" height="4" rx="0.8" fill={fillColor} />
      {[0, 1, 2, 3, 4].map((index) => {
        const x = 3 + index * 4;
        return (
          <rect
            key={index}
            x={x}
            y="4"
            width="3"
            height="6"
            rx="0.8"
            fill={index < activeSegments ? fillColor : "transparent"}
            opacity={index < activeSegments ? 1 : 0.18}
            stroke={index < activeSegments ? "none" : fillColor}
            strokeWidth={index < activeSegments ? 0 : 0.6}
          />
        );
      })}
    </svg>
  );
}

function getBatteryLevelBand(percent: number) {
  if (percent >= 85) {
    return { segments: 5, color: "#2F9E44" };
  }
  if (percent >= 65) {
    return { segments: 4, color: "#2F9E44" };
  }
  if (percent >= 45) {
    return { segments: 3, color: "#D97706" };
  }
  if (percent >= 20) {
    return { segments: 2, color: "#D97706" };
  }
  return { segments: 1, color: "#DC2626" };
}

export function formatPindouTimer(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatClockTime() {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
