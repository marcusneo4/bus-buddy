import { Suspense, lazy, useState } from "react";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { BusTypeIcon } from "./features/dashboard/components/BusTypeIcon";

const DrivingPage = lazy(async () => {
  const module = await import("./features/driving/DrivingPage");
  return { default: module.DrivingPage };
});

const ShuttleRadarPage = lazy(async () => {
  const module = await import("./features/shuttle-radar/ShuttleRadarPage");
  return { default: module.ShuttleRadarPage };
});

type AppMode = "bus" | "driving" | "shuttle-radar";

function LexusBadge({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-label="Lexus logo"
      role="img"
    >
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9.7 8.2v7h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const [mode, setMode] = useState<AppMode>("bus");

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <header className="relative shrink-0 border-b border-[var(--color-border-subtle)] bg-gradient-to-r from-[var(--color-bg-base-alt)] via-[var(--color-bg-base)] to-[var(--color-bg-base-alt)]/95 px-3 pb-3 pt-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-[var(--shadow-floating)]">
              <BusTypeIcon type="double" className="h-5 w-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold tracking-[0.16em] text-[var(--color-text-muted)] uppercase">
                Bus Buddy
              </span>
              <span className="text-sm font-black tracking-wide">
                Campus Travel Console
              </span>
            </div>
          </div>
          <div className="hidden min-[420px]:flex items-center gap-1.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-elevated)]/80 px-1.5 py-1 shadow-[var(--shadow-card)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">
              Live LTA · Tap a mode
            </span>
          </div>
        </div>

        <nav
          className="mt-3 flex items-stretch gap-1.5 rounded-2xl bg-[var(--color-bg-surface)]/90 p-1.5 shadow-[var(--shadow-card)]"
          role="tablist"
          aria-label="App modes"
        >
          <button
            onClick={() => setMode("bus")}
            role="tab"
            aria-selected={mode === "bus"}
            className={`btn-tactile touch-target flex flex-[1.3] items-center justify-center gap-2 rounded-xl px-2 py-2 text-[11px] font-semibold [transition-timing-function:var(--ease-out-snappy)] ${
              mode === "bus"
                ? "bg-[var(--color-accent)] text-[var(--color-bg-base)] shadow-[var(--shadow-card-hover)]"
                : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            <BusTypeIcon type="double" className="h-4 w-7 shrink-0" />
            <span className="tracking-wide">Bus board</span>
          </button>

          <button
            onClick={() => setMode("driving")}
            role="tab"
            aria-selected={mode === "driving"}
            className={`btn-tactile touch-target flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold [transition-timing-function:var(--ease-out-snappy)] ${
              mode === "driving"
                ? "bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] shadow-[var(--shadow-card-hover)]"
                : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            <LexusBadge className="h-4 w-4 shrink-0" />
            <span className="tracking-wide">Road jam</span>
          </button>

          <button
            onClick={() => setMode("shuttle-radar")}
            role="tab"
            aria-selected={mode === "shuttle-radar"}
            className={`btn-tactile touch-target flex flex-[0.9] items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold [transition-timing-function:var(--ease-out-snappy)] ${
              mode === "shuttle-radar"
                ? "bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] shadow-[var(--shadow-card-hover)]"
                : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            <span className="text-sm leading-none" aria-hidden>
              🛰️
            </span>
            <span className="tracking-wide">Shuttle</span>
          </button>
        </nav>
      </header>

      <div className="flex-1 min-h-0">
        {mode === "bus" && <DashboardPage />}
        {mode !== "bus" && (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--color-text-muted)]">
                Loading mode…
              </div>
            }
          >
            {mode === "driving" && <DrivingPage />}
            {mode === "shuttle-radar" && <ShuttleRadarPage />}
          </Suspense>
        )}
      </div>
    </div>
  );
}
