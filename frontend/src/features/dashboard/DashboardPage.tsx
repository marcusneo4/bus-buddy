import { useState, useEffect, useRef, useCallback } from "react";
import { useDashboardData } from "./useDashboardData";
import { usePreferences } from "../preferences/usePreferences";
import { useEnrichedServices } from "../action-engine/useActionStatus";
import { WeatherHeader } from "./components/WeatherHeader";
import { StopTabBar } from "./components/StopTabBar";
import { QuickStats } from "./components/QuickStats";
import { ServiceList } from "./components/ServiceList";
import { preferencesStore, getWalkTimeForStop } from "../preferences/preferencesStore";
import { useNow } from "../../hooks/useNow";

const PRIMARY_STOPS = ["16131", "17019"];
const ROTATION_INTERVAL_MS = 7_500;
const WAKE_DURATION_MS = 3 * 60_000; // tap-to-wake lasts 3 minutes

// Image backgrounds per stop code (Psyduck themes)
const STOP_BACKGROUNDS: Record<string, string> = {
  "16131": "/stop-bg-1.png",
  "16009": "/stop-bg-2.png",
  "17019": "/stop-bg-3.png",
  "17011": "/stop-bg-4.png",
};
const DEFAULT_BG = "linear-gradient(160deg, var(--color-bg-base) 0%, var(--color-bg-base-alt) 50%, #1a1f2e 100%)";

function isSleepTime(now: number): boolean {
  const d = new Date(now);
  const h = d.toLocaleString("en-SG", { hour: "numeric", hour12: false, timeZone: "Asia/Singapore" });
  const hour = Number(h);
  // Sleep between 1:00 AM and 7:00 AM
  return hour >= 1 && hour < 7;
}

function SleepScreen({ onWake }: { onWake: () => void }) {
  const now = useNow(1_000);
  const clockTime = new Date(now).toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore",
  });

  return (
    <div
      className="flex h-full flex-col items-center justify-center cursor-pointer select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)] transition-transform duration-200 active:scale-[0.99] min-h-[44px] min-w-[44px]"
      style={{ backgroundColor: "var(--color-bg-base)" }}
      onClick={onWake}
      onTouchStart={onWake}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onWake();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Tap to wake"
    >
      <p className="text-6xl font-black tabular-nums tracking-tight mb-4 text-[var(--color-text-primary)]/50">
        {clockTime}
      </p>
      <p className="text-sm font-medium tracking-widest uppercase text-[var(--color-text-secondary)]">
        Tap to wake
      </p>
      <p className="text-[10px] mt-2 text-[var(--color-text-muted)]">
        Bus Buddy · Active 7 AM – 1 AM
      </p>
    </div>
  );
}

export function DashboardPage() {
  const [prefs, updatePrefs] = usePreferences();
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationProgress, setRotationProgress] = useState(0);
  const [wakeUntil, setWakeUntil] = useState<number>(0);

  const rotationStartRef = useRef(Date.now());
  const activeStopRef = useRef(prefs.activeStopCode);
  const updatePrefsRef = useRef(updatePrefs);

  const now = useNow(1_000);
  const sleeping = isSleepTime(now) && Date.now() > wakeUntil;

  const handleWake = useCallback(() => {
    setWakeUntil(Date.now() + WAKE_DURATION_MS);
  }, []);

  useEffect(() => {
    activeStopRef.current = prefs.activeStopCode;
  }, [prefs.activeStopCode]);

  useEffect(() => {
    updatePrefsRef.current = updatePrefs;
  }, [updatePrefs]);

  const walkTimeForStop = getWalkTimeForStop(prefs.activeStopCode, prefs.walkTimeMin);
  const { dashboard, weather, loading, error, weatherError, lastUpdated, isStale, refresh } =
    useDashboardData(prefs.activeStopCode, walkTimeForStop);

  const enriched = useEnrichedServices(dashboard?.services ?? [], now);

  useEffect(() => {
    if (!autoRotate) {
      setRotationProgress(0);
      return;
    }

    rotationStartRef.current = Date.now();

    const tick = setInterval(() => {
      const elapsed = Date.now() - rotationStartRef.current;
      const progress = Math.min(elapsed / ROTATION_INTERVAL_MS, 1);
      setRotationProgress(progress);

      if (progress >= 1) {
        const currentStop = activeStopRef.current;
        const currentIdx = PRIMARY_STOPS.indexOf(currentStop);
        const nextStop =
          currentIdx !== -1
            ? PRIMARY_STOPS[(currentIdx + 1) % PRIMARY_STOPS.length]
            : PRIMARY_STOPS[0];
        updatePrefsRef.current({ activeStopCode: nextStop });
        rotationStartRef.current = Date.now();
        setRotationProgress(0);
      }
    }, 100);

    return () => clearInterval(tick);
  }, [autoRotate]);

  function handleStopChange(code: string) {
    if (PRIMARY_STOPS.includes(code)) {
      rotationStartRef.current = Date.now();
      setRotationProgress(0);
      if (!autoRotate) setAutoRotate(true);
    } else {
      setAutoRotate(false);
    }
    updatePrefs({ activeStopCode: code });
  }

  function handleWalkTimeChange(mins: number) {
    updatePrefs({ walkTimeMin: mins });
  }

  function handleTogglePin(serviceNo: string) {
    preferencesStore.togglePin(serviceNo);
  }

  function handleToggleAutoRotate() {
    setAutoRotate((prev) => {
      if (!prev) {
        rotationStartRef.current = Date.now();
        setRotationProgress(0);
        if (!PRIMARY_STOPS.includes(prefs.activeStopCode)) {
          updatePrefsRef.current({ activeStopCode: PRIMARY_STOPS[0] });
        }
      }
      return !prev;
    });
  }

  if (sleeping) {
    return <SleepScreen onWake={handleWake} />;
  }

  const bg = STOP_BACKGROUNDS[prefs.activeStopCode] ?? DEFAULT_BG;
  const isImageBg = typeof bg === "string" && bg.endsWith(".png");

  return (
    <div
      className="flex h-full flex-col overflow-hidden text-[var(--color-text-primary)]"
      style={
        isImageBg
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(15,20,25,0.6) 0%, rgba(15,20,25,0.4) 100%), url(${bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center 70%",
              transition: "background-image 0.6s var(--ease-out-soft)",
            }
          : { background: bg, transition: "background 0.6s var(--ease-out-soft)" }
      }
    >
      <WeatherHeader
        weather={weather}
        weatherError={weatherError}
        isStale={isStale}
        loading={loading}
        onRefresh={refresh}
        walkTimeMin={walkTimeForStop}
        onWalkTimeChange={handleWalkTimeChange}
      />

      <StopTabBar
        stops={prefs.favoriteStops}
        activeCode={prefs.activeStopCode}
        autoRotate={autoRotate}
        rotationProgress={rotationProgress}
        onStopChange={handleStopChange}
        onToggleAutoRotate={handleToggleAutoRotate}
      />

      {enriched.length > 0 && <QuickStats services={enriched} />}

      {error && (
        <div className="mx-3 mt-2 rounded-xl border border-red-800/50 bg-red-950/40 px-3 py-2.5 text-xs shadow-[var(--shadow-card)]" style={{ color: "#f87171" }}>
          ⚠️ {error}
          {error.toLowerCase().includes("backend") && (
            <span className="mt-1 block opacity-90">
              Run: <code className="rounded bg-red-900/50 px-1 py-0.5">cd backend && npm run dev</code>
            </span>
          )}
        </div>
      )}

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <ServiceList
          services={enriched}
          pinnedServices={prefs.pinnedServices}
          loading={loading}
          onTogglePin={handleTogglePin}
        />
      </main>

      <footer className="border-t border-[var(--color-border-subtle)] px-3 py-2 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              isStale ? "bg-[var(--color-accent)]" : "bg-emerald-500"
            } ${!isStale ? "animate-pulse" : ""}`}
          />
          <span>
            {dashboard
              ? `${dashboard.services.length} services · ${prefs.activeStopCode}`
              : "Loading…"}
          </span>
        </span>
        <span className="tabular-nums shrink-0">
          {lastUpdated
            ? lastUpdated.toLocaleTimeString("en-SG", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Singapore",
              })
            : "—"}
        </span>
      </footer>
    </div>
  );
}
