import { RotateCcw } from "lucide-react";
import clsx from "clsx";
import type { BusStop } from "../../preferences/preferencesStore";

const PRIMARY_STOP_CODES = ["16131", "17019"];

interface Props {
  stops: BusStop[];
  activeCode: string;
  autoRotate: boolean;
  rotationProgress: number;
  onStopChange: (code: string) => void;
  onToggleAutoRotate: () => void;
}

export function StopTabBar({
  stops,
  activeCode,
  autoRotate,
  rotationProgress,
  onStopChange,
  onToggleAutoRotate,
}: Props) {
  const primaryStops = stops.filter((s) => PRIMARY_STOP_CODES.includes(s.code));
  const secondaryStops = stops.filter((s) => !PRIMARY_STOP_CODES.includes(s.code));

  return (
    <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base-alt)]">
      <div className="flex items-stretch">
        {primaryStops.map((stop) => {
          const isActive = stop.code === activeCode;
          return (
            <button
              key={stop.code}
              onClick={() => onStopChange(stop.code)}
              aria-pressed={isActive}
              className={clsx(
                "touch-target relative flex-1 py-3.5 text-sm font-bold touch-manipulation transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset",
                "[transition-timing-function:var(--ease-out-snappy)] active:scale-[0.98]",
                isActive
                  ? "text-[var(--color-text-primary)] bg-[var(--color-accent)]/90 border-b-2 border-[var(--color-accent-muted)] shadow-[var(--shadow-card)]"
                  : "text-[var(--color-text-muted)] bg-transparent border-b-2 border-transparent hover:text-[var(--color-text-secondary)]"
              )}
            >
              {stop.label}
              {isActive && autoRotate && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-bg-surface)]">
                  <div
                    className="h-full bg-[var(--color-text-primary)]/80 transition-all duration-100"
                    style={{ width: `${rotationProgress * 100}%`, transitionTimingFunction: "var(--ease-out-snappy)" }}
                  />
                </div>
              )}
            </button>
          );
        })}

        <button
          onClick={onToggleAutoRotate}
          className={clsx(
            "touch-target flex min-w-[2.75rem] items-center justify-center transition-colors duration-200 active:bg-[var(--color-bg-surface)] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset",
            "[transition-timing-function:var(--ease-out-snappy)]",
            autoRotate ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
          )}
          title={autoRotate ? "Pause auto-rotation" : "Resume auto-rotation"}
          aria-label={autoRotate ? "Pause auto-rotation" : "Resume auto-rotation"}
        >
          <RotateCcw size={16} className={autoRotate ? "" : "opacity-60"} />
        </button>
      </div>

      {secondaryStops.length > 0 && (
        <div className="flex border-t border-[var(--color-border-subtle)]/60 items-stretch">
          <span className="flex items-center px-3 text-[10px] font-medium shrink-0 text-[var(--color-text-muted)]">
            Also:
          </span>
          <div className="flex flex-1 min-w-0">
            {secondaryStops.map((stop) => {
              const isActive = stop.code === activeCode;
              return (
                <button
                  key={stop.code}
                  onClick={() => onStopChange(stop.code)}
                  aria-pressed={isActive}
                  title={stop.label}
                  className={clsx(
                    "touch-target flex-1 min-w-0 py-2.5 text-sm font-semibold touch-manipulation mx-0.5 first:ml-0 last:mr-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset",
                    "[transition-timing-function:var(--ease-out-snappy)]",
                    isActive
                      ? "text-[var(--color-text-primary)] bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40 rounded-lg"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  )}
                >
                  <span className="block truncate">{stop.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
