import { RefreshCw, AlertTriangle, Plus, Minus } from "lucide-react";
import clsx from "clsx";
import { useWeatherTheme } from "../../weather/useWeatherTheme";
import type { WeatherResponse } from "../../../lib/apiClient";

interface Props {
  weather: WeatherResponse | null;
  weatherError?: string | null;
  isStale: boolean;
  loading: boolean;
  onRefresh: () => void;
  walkTimeMin: number;
  onWalkTimeChange: (mins: number) => void;
}

export function WeatherHeader({
  weather,
  weatherError,
  isStale,
  loading,
  onRefresh,
  walkTimeMin,
  onWalkTimeChange,
}: Props) {
  const theme = useWeatherTheme(weather?.ambiance);

  return (
    <header
      className={clsx(
        "bg-gradient-to-r border-b border-[var(--color-border-subtle)] px-3 py-2.5 flex items-center gap-2",
        theme.headerBg
      )}
    >
      <span className="text-base shrink-0" aria-hidden>🚌</span>
      <span className="text-sm font-black tracking-tight shrink-0 text-[var(--color-text-primary)]">
        Bus Buddy
      </span>

      {weather ? (
        <div
          className={clsx(
            "flex items-center gap-1.5 text-sm font-bold flex-1 min-w-0",
            theme.headerText
          )}
        >
          <span className="shrink-0">{theme.icon}</span>
          <span className="shrink-0">{theme.label}</span>
          <span className="shrink-0 text-[var(--color-text-muted)]">·</span>
          <span className="tabular-nums shrink-0">
            {Number.isFinite(weather.temperatureC) ? `${weather.temperatureC}°C` : "—"}
          </span>
          <span className="shrink-0 text-[var(--color-text-muted)]">·</span>
          <span className="min-w-0 truncate tabular-nums">
            {weather.rainProbabilityPct}% rain · West Coast
            {weather.rainProbabilityPct >= 50 && (
              <span className="ml-1 hidden font-black sm:inline text-[var(--color-accent)]">· Bring umbrella ☂️</span>
            )}
          </span>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-medium text-[var(--color-accent)]/90">
            {weatherError ?? "Weather unavailable"}
          </p>
        </div>
      )}

      <div className="flex items-center gap-0.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/90 px-1 py-0.5 shrink-0">
        <button
          onClick={() => onWalkTimeChange(Math.max(0, walkTimeMin - 1))}
          disabled={walkTimeMin <= 0}
          className="touch-target flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text-secondary)] disabled:opacity-30 btn-tactile touch-manipulation"
          aria-label="Decrease walk time"
        >
          <Minus size={14} />
        </button>
        <span className="w-10 text-center text-xs font-bold tabular-nums select-none text-[var(--color-text-primary)]" aria-hidden>
          🚶{walkTimeMin}m
        </span>
        <button
          onClick={() => onWalkTimeChange(Math.min(60, walkTimeMin + 1))}
          disabled={walkTimeMin >= 60}
          className="touch-target flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text-secondary)] disabled:opacity-30 btn-tactile touch-manipulation"
          aria-label="Increase walk time"
        >
          <Plus size={14} />
        </button>
      </div>

      {isStale && (
        <AlertTriangle
          size={14}
          className="text-[var(--color-accent)] shrink-0"
          aria-label="Data may be outdated"
        />
      )}

      <button
        onClick={onRefresh}
        disabled={loading}
        className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] btn-tactile touch-manipulation disabled:opacity-40"
        aria-label="Refresh now"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
      </button>
    </header>
  );
}
