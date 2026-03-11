import { useMemo } from "react";
import { useNow } from "../../hooks/useNow";
import { BusTypeIcon } from "../dashboard/components/BusTypeIcon";
import { MapPin, CircleDot } from "lucide-react";

const LOOP_SECONDS = 30 * 60;
const SERVICE_START_HOUR = 6;
const SERVICE_END_HOUR = 20;

// Rounded-rectangle track (SVG 0–100 space).
// Smaller than the full viewBox so labels + icons can sit OUTSIDE the rect.
// With these values, 15 min (West Coast Plaza) lands exactly at the bottom-right corner.
const RECT_TRACK = { ox: 18, oy: 20, w: 64, h: 60, r: 10 } as const;
const RECT_PERIMETER = (() => {
  const { w, h, r } = RECT_TRACK;
  return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
})();

// Bus returns to VP at 20 min; departs again at 0 (30) min.
const VP_RETURN_MIN = 20;

type AlertState = "okay" | "prepare" | "run" | "inactive";

interface StopDef {
  name: string;
  minuteOffset: number;
  isVp?: boolean;
  isReturn?: boolean;
}

const STOPS: StopDef[] = [
  { name: "Varsity Park Condo", minuteOffset: 0, isVp: true },
  { name: "West Coast Market", minuteOffset: 4 },
  { name: "Clementi Mall", minuteOffset: 9 },
  { name: "West Coast Plaza", minuteOffset: 15 },
  { name: "Varsity Park Condo", minuteOffset: VP_RETURN_MIN, isVp: true, isReturn: true },
];

// Landmarks for the linear progress bar with SVG icons (from your assets)
const LINEAR_LANDMARKS: { minute: number; label: string; icon: string; iconAlt?: string }[] = [
  { minute: 0, label: "VP Depart", icon: "/flag-for-flag-singapore-svgrepo-com.svg" },
  { minute: 4, label: "West Coast Market", icon: "/merlion-svgrepo-com.svg", iconAlt: "invert" },
  { minute: 9, label: "Clementi Mall", icon: "/singapore-svgrepo-com.svg", iconAlt: "invert" },
  { minute: 15, label: "West Coast Plaza", icon: "/singapore-monument-svgrepo-com.svg" },
  { minute: VP_RETURN_MIN, label: "VP Return", icon: "/flag-for-flag-singapore-svgrepo-com.svg" },
];

/**
 * Maps a minute offset (0–30) to an (x, y, angleDeg) position along the
 * perimeter of RECT_TRACK, starting at the top-left area going clockwise.
 * angleDeg follows the same convention as the old polarPosition so the bus
 * icon rotation (angleDeg + 90) still points in the direction of travel.
 */
function rectPosition(minuteOffset: number): { x: number; y: number; angleDeg: number } {
  const { ox, oy, w, h, r } = RECT_TRACK;
  const topLen = w - 2 * r;
  const rightLen = h - 2 * r;
  const bottomLen = w - 2 * r;
  const leftLen = h - 2 * r;
  const cornerLen = (Math.PI / 2) * r;

  let dist = ((minuteOffset / 30) % 1) * RECT_PERIMETER;
  if (dist < 0) dist += RECT_PERIMETER;

  // Top edge →
  if (dist < topLen) return { x: ox + r + dist, y: oy, angleDeg: -90 };
  dist -= topLen;

  // Top-right corner
  if (dist < cornerLen) {
    const t = dist / cornerLen;
    const a = ((-90 + t * 90) * Math.PI) / 180;
    return { x: ox + w - r + r * Math.cos(a), y: oy + r + r * Math.sin(a), angleDeg: -90 + t * 90 };
  }
  dist -= cornerLen;

  // Right edge ↓
  if (dist < rightLen) return { x: ox + w, y: oy + r + dist, angleDeg: 0 };
  dist -= rightLen;

  // Bottom-right corner
  if (dist < cornerLen) {
    const t = dist / cornerLen;
    const a = (t * 90 * Math.PI) / 180;
    return { x: ox + w - r + r * Math.cos(a), y: oy + h - r + r * Math.sin(a), angleDeg: t * 90 };
  }
  dist -= cornerLen;

  // Bottom edge ←
  if (dist < bottomLen) return { x: ox + w - r - dist, y: oy + h, angleDeg: 90 };
  dist -= bottomLen;

  // Bottom-left corner
  if (dist < cornerLen) {
    const t = dist / cornerLen;
    const a = ((90 + t * 90) * Math.PI) / 180;
    return { x: ox + r + r * Math.cos(a), y: oy + h - r + r * Math.sin(a), angleDeg: 90 + t * 90 };
  }
  dist -= cornerLen;

  // Left edge ↑
  if (dist < leftLen) return { x: ox, y: oy + h - r - dist, angleDeg: 180 };
  dist -= leftLen;

  // Top-left corner
  if (dist < cornerLen) {
    const t = dist / cornerLen;
    const a = ((180 + t * 90) * Math.PI) / 180;
    return { x: ox + r + r * Math.cos(a), y: oy + r + r * Math.sin(a), angleDeg: 180 + t * 90 };
  }

  return { x: ox + r, y: oy, angleDeg: -90 };
}

/**
 * Places the stop icon and text labels OUTSIDE the rounded-rectangle track —
 * giving a clean transit / zoo-map look where labels surround the route.
 * Edge classification uses the angle from the track centre so corner-arc
 * points are handled correctly regardless of indentation.
 */
function getStopLayout(x: number, y: number, iconSize: number) {
  const { ox, oy, w, h } = RECT_TRACK;
  const cx = ox + w / 2;
  const cy = oy + h / 2;
  const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI);

  let edge: "top" | "right" | "bottom" | "left";
  if (angle >= -45 && angle < 45) edge = "right";
  else if (angle >= 45 && angle < 135) edge = "bottom";
  else if (angle >= 135 || angle < -135) edge = "left";
  else edge = "top";

  if (edge === "top") {
    // Icon above the track, labels above the icon
    return {
      iconTransform: `translate(${x - iconSize / 2}, ${y - iconSize - 1})`,
      label: { x, y1: y - iconSize - 3.5, y2: y - iconSize - 7, anchor: "middle" as const },
    };
  }
  if (edge === "bottom") {
    // Icon below the track, labels below the icon
    return {
      iconTransform: `translate(${x - iconSize / 2}, ${y + 1})`,
      label: { x, y1: y + iconSize + 3.5, y2: y + iconSize + 7, anchor: "middle" as const },
    };
  }
  if (edge === "right") {
    // Icon right of the track; labels sit below-right of the icon so long names
    // don't clip against the SVG viewBox right edge.
    return {
      iconTransform: `translate(${x + 1}, ${y - iconSize / 2})`,
      label: {
        x: x + iconSize + 1,
        y1: y + iconSize / 2 + 3,
        y2: y + iconSize / 2 + 6.5,
        anchor: "end" as const,
      },
    };
  }
  // left — icon left of track, labels sit below-left of the icon
  return {
    iconTransform: `translate(${x - iconSize - 1}, ${y - iconSize / 2})`,
    label: {
      x: x - iconSize - 1,
      y1: y + iconSize / 2 + 3,
      y2: y + iconSize / 2 + 6.5,
      anchor: "start" as const,
    },
  };
}

function formatClock(now: number) {
  return new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDeparture(now: number) {
  return new Date(now).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getSecondsUntilNextDeparture(nowMs: number): number {
  const now = new Date(nowMs);
  const secondsIntoHour =
    now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
  const mod = secondsIntoHour % LOOP_SECONDS;
  return (LOOP_SECONDS - mod) % LOOP_SECONDS;
}

function getNextServiceStart(nowMs: number): Date {
  const now = new Date(nowMs);
  const candidate = new Date(now);
  candidate.setHours(SERVICE_START_HOUR, 0, 0, 0);
  if (now >= candidate) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

type BusPhase =
  | "departing_vp"
  | "otw_west_coast_market"
  | "at_west_coast_market"
  | "otw_clementi"
  | "at_clementi"
  | "otw_west_coast_plaza"
  | "at_west_coast_plaza"
  | "otw_vp"
  | "reached_vp"
  | "at_vp_boarding";

function getBusStatus(minuteOffset: number): {
  phase: BusPhase;
  label: string;
  shortLabel: string;
  subLabel?: string;
} {
  const m = minuteOffset;
  if (m < 0.8) {
    return {
      phase: "departing_vp",
      label: "Bus departing Varsity Park Condo",
      shortLabel: "Departing VP",
      subLabel: "Next: West Coast Market",
    };
  }
  if (m < 4) {
    return {
      phase: "otw_west_coast_market",
      label: "Bus on the way to West Coast Market",
      shortLabel: "→ West Coast Market",
      subLabel: `Arrives in ~${Math.max(0, Math.ceil(4 - m))} min`,
    };
  }
  if (m < 5) {
    return {
      phase: "at_west_coast_market",
      label: "Bus at West Coast Market",
      shortLabel: "At West Coast Market",
      subLabel: "Next: Clementi Mall",
    };
  }
  if (m < 9) {
    return {
      phase: "otw_clementi",
      label: "Bus on the way to Clementi Mall",
      shortLabel: "→ Clementi Mall",
      subLabel: `Arrives in ~${Math.max(0, Math.ceil(9 - m))} min`,
    };
  }
  if (m < 10) {
    return {
      phase: "at_clementi",
      label: "Bus at Clementi Mall",
      shortLabel: "At Clementi Mall",
      subLabel: "Next: West Coast Plaza",
    };
  }
  if (m < 15) {
    return {
      phase: "otw_west_coast_plaza",
      label: "Bus on the way to West Coast Plaza",
      shortLabel: "→ West Coast Plaza",
      subLabel: `Arrives in ~${Math.max(0, Math.ceil(15 - m))} min`,
    };
  }
  if (m < 16) {
    return {
      phase: "at_west_coast_plaza",
      label: "Bus at West Coast Plaza",
      shortLabel: "At West Coast Plaza",
      subLabel: "Next: Back to VP",
    };
  }
  if (m < VP_RETURN_MIN - 0.5) {
    return {
      phase: "otw_vp",
      label: "Bus on the way to Varsity Park Condo",
      shortLabel: "→ Varsity Park Condo",
      subLabel: `Back at VP in ~${Math.max(0, Math.ceil(VP_RETURN_MIN - m))} min`,
    };
  }
  if (m < VP_RETURN_MIN + 1) {
    return {
      phase: "reached_vp",
      label: "VP bus reached Varsity Park Condo",
      shortLabel: "Bus reached VP",
      subLabel: "Next departure in ~10 min",
    };
  }
  const minsToDepart = Math.ceil(30 - m);
  return {
    phase: "at_vp_boarding",
    label: "Bus at Varsity Park Condo",
    shortLabel: "At VP",
    subLabel: `Departing in ~${minsToDepart} min`,
  };
}

export function ShuttleRadarPage() {
  const now = useNow(1_000);

  const computed = useMemo(() => {
    const date = new Date(now);
    const hour = date.getHours();
    const isOperatingHours = hour >= SERVICE_START_HOUR && hour < SERVICE_END_HOUR;

    const cycleSeconds =
      date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1000;
    const cycleProgress = (cycleSeconds % LOOP_SECONDS) / LOOP_SECONDS;
    const busMinuteOffset = cycleProgress * 30;

    const secondsRemaining = getSecondsUntilNextDeparture(now);
    const minutesRemaining = secondsRemaining / 60;

    let state: AlertState = "inactive";
    if (isOperatingHours) {
      if (minutesRemaining <= 6) {
        state = "run";
      } else if (minutesRemaining <= 10) {
        state = "prepare";
      } else {
        state = "okay";
      }
    }

    const nextDepartureMs = isOperatingHours
      ? now + secondsRemaining * 1_000
      : getNextServiceStart(now).getTime();

    const busStatus = getBusStatus(busMinuteOffset);

    return {
      cycleProgress,
      busMinuteOffset,
      state,
      minutesRemaining,
      secondsRemaining,
      nextDepartureMs,
      isOperatingHours,
      busStatus,
    };
  }, [now]);

  const ringColor =
    computed.state === "run"
      ? "stroke-red-400"
      : computed.state === "prepare"
        ? "stroke-amber-400"
        : "stroke-sky-400";

  const panelBg =
    computed.state === "run"
      ? "bg-red-950/85"
      : computed.state === "prepare"
        ? "bg-amber-950/50"
        : "bg-slate-900/60";

  const rootBg =
    computed.state === "run"
      ? "bg-red-950 radar-run-flash"
      : computed.state === "prepare"
        ? "bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(245,158,11,0.2)_0%,transparent_55%),linear-gradient(180deg,#1c1917_0%,#0f172a_50%,#020617_100%)]"
        : "bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(34,211,238,0.12)_0%,transparent_55%),linear-gradient(180deg,#0f172a_0%,#0c1929_40%,#020617_100%)]";

  const bus = rectPosition(computed.busMinuteOffset);
  const progressDashOffset = RECT_PERIMETER * (1 - computed.cycleProgress);

  const statusMessage =
    computed.state === "run"
      ? "RUN!"
      : computed.state === "prepare"
        ? "Time to leave!"
        : computed.state === "okay"
          ? "You’re good — bus on its loop"
          : "Service paused (6am–8pm)";

  const timeLeft = computed.isOperatingHours
    ? `${Math.floor(computed.minutesRemaining).toString().padStart(2, "0")}:${Math.floor(computed.secondsRemaining % 60).toString().padStart(2, "0")}`
    : "—";

  const isReachedVp = computed.busStatus.phase === "reached_vp";
  const busLeftPct = Math.min(94, Math.max(6, (computed.busMinuteOffset / 30) * 100));

  return (
    <div className={`h-full w-full overflow-hidden text-white ${rootBg}`}>
      <div className="flex h-full flex-col">
        {/* Top bar: title + branding only (clock moved to centre) */}
        <header className="shrink-0 rounded-b-[1.25rem] border-b border-white/10 bg-black/50 backdrop-blur-xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/flag-for-flag-singapore-svgrepo-com.svg"
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl object-contain shadow-md sm:h-10 sm:w-10"
                aria-hidden
              />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-cyan-400/90">Condo Shuttle · Live radar</p>
                <h1 className="text-xl font-black tracking-tight text-white drop-shadow-sm sm:text-2xl">Shuttle Radar</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Live status strip — pill style */}
        <div className="shrink-0 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm px-4 py-3 shadow-inner">
            <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white sm:text-base">
                {computed.busStatus.label}
              </p>
              {computed.busStatus.subLabel && (
                <p className="mt-0.5 truncate text-xs text-zinc-400">{computed.busStatus.subLabel}</p>
              )}
            </div>
            {isReachedVp && (
              <span className="shrink-0 rounded-full bg-cyan-500/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200 border border-cyan-400/40">
                At VP
              </span>
            )}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <img src="/merlion-svgrepo-com.svg" alt="" className="h-5 w-5 invert opacity-90 sm:h-6 sm:w-6" aria-hidden />
            </span>
          </div>
        </div>

        {/* Linear progress bar — inside rounded container */}
        <div className="shrink-0 px-4 pb-3 sm:px-5 sm:pb-4">
          <div className="rounded-[1.25rem] border border-white/10 bg-black/40 backdrop-blur-sm px-4 py-4 shadow-xl sm:px-5 sm:py-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              30-min cycle
            </p>
            <div className="relative h-28 sm:h-32 md:h-36 overflow-x-hidden">
            {/* Track */}
            <div className="absolute inset-y-0 left-0 right-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-zinc-700/80" />
            {/* Filled progress */}
            <div
              className="absolute inset-y-0 left-0 top-1/2 h-3 w-0 -translate-y-1/2 rounded-full bg-cyan-500/90 transition-all duration-1000 ease-linear"
              style={{ width: `${(computed.busMinuteOffset / 30) * 100}%` }}
            />
            {/* Landmark icons on the track — large so they’re the main visual */}
            {LINEAR_LANDMARKS.map(({ minute, label, icon, iconAlt }) => {
              const leftPct = (minute / 30) * 100;
              const clampedLeftPct = Math.min(94, Math.max(6, leftPct));
              return (
                <div
                  key={`${minute}-${label}`}
                  className="absolute top-0 flex flex-col items-center gap-1"
                  style={{ left: `${clampedLeftPct}%`, transform: "translateX(-50%)" }}
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-white/40 bg-slate-900 shadow-xl sm:h-14 sm:w-14 md:h-16 md:w-16"
                    title={label}
                  >
                    <img
                      src={icon}
                      alt=""
                      className={`h-9 w-9 object-contain sm:h-10 sm:w-10 md:h-11 md:w-11 ${iconAlt === "invert" ? "invert opacity-90" : "opacity-95"}`}
                      aria-hidden
                    />
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-300 whitespace-nowrap sm:text-xs">
                    {minute === 0 ? "0" : minute}m
                  </span>
                </div>
              );
            })}
            {/* Bus position indicator (thumb) */}
            <div
              className="absolute top-0 flex flex-col items-center"
              style={{
                left: `${busLeftPct}%`,
                transform: "translate(-50%, -15%)",
              }}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-cyan-300 bg-slate-900 shadow-[0_0_16px_rgba(34,211,238,0.6)] sm:h-14 sm:w-14"
                aria-label={`Bus position: ${computed.busMinuteOffset.toFixed(1)} min into cycle`}
              >
                <BusTypeIcon type="single" className="h-6 w-10 sm:h-7 sm:w-11" />
              </span>
            </div>
          </div>
        </div>
        </div>

        <main className="flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-5">
            <div className={`rounded-[1.5rem] border border-white/15 shadow-2xl ${panelBg} overflow-hidden`}>
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_340px]">
                {/* Left: Loop with CENTRAL CLOCK + legend */}
                <div className="p-4 sm:p-6">
                  <div className="relative mx-auto aspect-square w-full max-w-[min(65vh,400px)]">
                    <svg
                      viewBox="0 0 100 100"
                      className="h-full w-full"
                      aria-label="30-minute shuttle route loop; bus returns to VP at 20 min"
                    >
                      <defs>
                        <filter id="shuttle-glow">
                          <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <filter id="icon-invert">
                          <feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" />
                        </filter>
                        {/* Arrow tip for route direction indicators */}
                        <marker id="dir-arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                          <path d="M0,0.5 L3,2 L0,3.5 Z" fill="rgba(34,211,238,0.55)" />
                        </marker>
                      </defs>
                      {/* Track base */}
                      <rect x={RECT_TRACK.ox} y={RECT_TRACK.oy} width={RECT_TRACK.w} height={RECT_TRACK.h} rx={RECT_TRACK.r} className="fill-none stroke-zinc-600/70" strokeWidth="2" />
                      {/* Coloured ring (state-dependent glow) */}
                      <rect
                        x={RECT_TRACK.ox}
                        y={RECT_TRACK.oy}
                        width={RECT_TRACK.w}
                        height={RECT_TRACK.h}
                        rx={RECT_TRACK.r}
                        className={`fill-none ${ringColor}`}
                        strokeWidth="2"
                        strokeLinecap="round"
                        style={{ filter: "url(#shuttle-glow)" }}
                      />
                      {/* Progress arc — grows clockwise from top-left as cycle advances */}
                      <rect
                        x={RECT_TRACK.ox}
                        y={RECT_TRACK.oy}
                        width={RECT_TRACK.w}
                        height={RECT_TRACK.h}
                        rx={RECT_TRACK.r}
                        className="fill-none stroke-white/40"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={RECT_PERIMETER}
                        strokeDashoffset={progressDashOffset}
                      />
                      {/* Route direction chevrons — clockwise: → on top, ↓ on right, ← on bottom */}
                      <path d="M48.5,19 L51.5,19 L50,21.5 Z" fill="rgba(34,211,238,0.55)" />
                      <path d="M83,48.5 L83,51.5 L85.5,50 Z" fill="rgba(34,211,238,0.55)" />
                      <path d="M51.5,81 L48.5,81 L50,78.5 Z" fill="rgba(34,211,238,0.55)" />
                      {STOPS.map((stop, i) => {
                        const point = rectPosition(stop.minuteOffset);
                        const isVp = stop.isVp ?? false;
                        const isReturn = stop.isReturn ?? false;
                        const label = isReturn ? "VP Return" : stop.minuteOffset === 0 ? "VP Depart" : stop.name;
                        const minuteLabel = stop.minuteOffset === 0 ? "0 min" : `${stop.minuteOffset} min`;
                        const landmark = LINEAR_LANDMARKS.find((l) => l.minute === stop.minuteOffset);
                        const iconSize = 10;
                        const pad = 0.6;
                        const layout = getStopLayout(point.x, point.y, iconSize);
                        return (
                          <g key={`${stop.minuteOffset}-${i}`}>
                            {/* Stop dot ON the track */}
                            <rect
                              x={point.x - (isVp ? 2.8 : 2)}
                              y={point.y - (isVp ? 2.8 : 2)}
                              width={isVp ? 5.6 : 4}
                              height={isVp ? 5.6 : 4}
                              rx="1.2"
                              className={isReturn ? "fill-cyan-300" : isVp ? "fill-cyan-400" : "fill-white/70"}
                            />
                            {/* Icon tile OUTSIDE the track */}
                            {landmark && (
                              <g transform={layout.iconTransform}>
                                <rect x="0" y="0" width={iconSize} height={iconSize} rx="1.2" fill="rgba(15,23,42,0.95)" stroke="rgba(148,163,184,0.4)" strokeWidth="0.5" />
                                <image
                                  href={landmark.icon}
                                  x={pad}
                                  y={pad}
                                  width={iconSize - pad * 2}
                                  height={iconSize - pad * 2}
                                  preserveAspectRatio="xMidYMid meet"
                                  filter={landmark.iconAlt === "invert" ? "url(#icon-invert)" : undefined}
                                  opacity={landmark.iconAlt === "invert" ? 0.9 : 0.95}
                                />
                              </g>
                            )}
                            {/* Stop name + minute marker outside the track */}
                            <text
                              x={layout.label.x}
                              y={layout.label.y1}
                              textAnchor={layout.label.anchor}
                              fontSize="3"
                              fontWeight="600"
                              fill="rgba(226,232,240,0.95)"
                            >
                              {label}
                            </text>
                            <text
                              x={layout.label.x}
                              y={layout.label.y2}
                              textAnchor={layout.label.anchor}
                              fontSize="2.5"
                              fill="rgba(148,163,184,0.8)"
                            >
                              {minuteLabel}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    <div
                      className="absolute z-10 flex items-center justify-center rounded-lg border-2 border-cyan-200/70 bg-slate-900/95 p-1.5 shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all duration-1000 ease-linear"
                      style={{
                        left: `${bus.x}%`,
                        top: `${bus.y}%`,
                        transform: `translate(-50%, -50%) rotate(${bus.angleDeg + 90}deg)`,
                      }}
                      aria-label={`Shuttle bus — ${computed.busStatus.shortLabel}`}
                    >
                      <BusTypeIcon type="single" className="h-6 w-10 sm:h-7 sm:w-11" />
                    </div>

                    {/* Central clock — right at the centre for easy viewing */}
                    <div
                      className="absolute left-1/2 top-1/2 z-20 flex w-[42%] min-w-[100px] max-w-[140px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[1.25rem] border-2 border-white/25 bg-slate-900/95 py-3 px-2 shadow-[0_0_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm sm:min-w-[120px] sm:py-4 sm:px-3"
                      aria-label="Current time"
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500 sm:text-[10px]">Now</p>
                      <p className="mt-0.5 text-2xl font-black tabular-nums tracking-tight text-white drop-shadow-md sm:text-3xl md:text-4xl">
                        {formatClock(now)}
                      </p>
                    </div>
                  </div>

                  {/* Inline legend under the loop — pill style */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                    <span className="rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-medium text-zinc-400 flex items-center gap-1.5 border border-white/10">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      VP Depart (0 min)
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-medium text-zinc-400 flex items-center gap-1.5 border border-white/10">
                      <span className="h-2 w-2 rounded-full bg-cyan-300" />
                      VP Return (20 min)
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-medium text-zinc-400 flex items-center gap-1.5 border border-white/10">
                      <CircleDot className="h-3 w-3 text-zinc-500" />
                      Other stops
                    </span>
                  </div>
                </div>

                {/* Right: Important info — rounded cards */}
                <aside className="border-t border-white/10 bg-black/30 p-4 lg:border-l lg:border-t-0 lg:rounded-r-[1.5rem]">
                  {computed.state === "run" && (
                    <div className="mb-4 rounded-[1.25rem] border-2 border-red-400/60 bg-gradient-to-b from-red-950/80 to-red-950/50 px-4 py-4 text-center shadow-lg shadow-red-900/30">
                      <p className="text-2xl font-black uppercase tracking-wider text-red-200 sm:text-3xl">RUN!</p>
                      <p className="mt-1.5 text-sm font-semibold text-red-300/90">Leave house immediately.</p>
                    </div>
                  )}
                  {computed.state === "prepare" && (
                    <div className="mb-4 rounded-[1.25rem] border-2 border-amber-400/50 bg-gradient-to-b from-amber-950/60 to-amber-950/30 px-4 py-4 text-center shadow-lg shadow-amber-900/20">
                      <p className="text-xl font-black uppercase tracking-wider text-amber-200 sm:text-2xl">Time to leave!</p>
                      <p className="mt-1.5 text-sm font-semibold text-amber-300/90">Get ready — bus soon.</p>
                    </div>
                  )}
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Your status</p>
                  <p
                    className={`mt-1.5 text-xl font-black leading-tight sm:text-2xl ${
                      computed.state === "run"
                        ? "text-red-300"
                        : computed.state === "prepare"
                          ? "text-amber-300"
                          : computed.state === "okay"
                            ? "text-sky-200"
                            : "text-zinc-400"
                    }`}
                  >
                    {statusMessage}
                  </p>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-[1rem] border border-white/15 bg-slate-900/60 px-4 py-3 shadow-inner">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Next departure from VP</p>
                      <p className="mt-1 text-lg font-black tabular-nums text-white">
                        {formatDeparture(computed.nextDepartureMs)}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-white/15 bg-slate-900/60 px-4 py-3 shadow-inner">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Time until next bus</p>
                      <p className="mt-1 text-lg font-black tabular-nums text-white">{timeLeft}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1rem] border border-white/10 bg-slate-800/40 px-3 py-3 shadow-inner">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">Alert guide</p>
                    <ul className="space-y-2 text-[11px] text-zinc-300">
                      <li className="flex items-center gap-2 rounded-lg py-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-sm" />
                        Okay — bus on loop, no rush
                      </li>
                      <li className="flex items-center gap-2 rounded-lg py-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-sm" />
                        Prepare — get ready (10–6 min left)
                      </li>
                      <li className="flex items-center gap-2 rounded-lg py-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400 shadow-sm" />
                        Run — leave now (under 6 min)
                      </li>
                    </ul>
                  </div>

                  <div className="mt-3 flex items-start gap-2.5 rounded-[1rem] bg-slate-800/50 px-3 py-2.5 text-[11px] text-zinc-400 border border-white/5">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400/80" />
                    <div>
                      <p className="font-semibold text-zinc-300">Loop summary</p>
                      <p className="mt-0.5 leading-snug">
                        Bus departs VP at 0 min, returns to VP at 20 min. Next departure at :00 and :30. Operating hours 06:00–20:00.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2 rounded-[1rem] border border-white/10 bg-slate-800/30 px-3 py-2.5">
                    <img src="/singapore-svgrepo-com.svg" alt="" className="h-6 w-6 invert opacity-80" aria-hidden />
                    <img src="/singapore-monument-svgrepo-com.svg" alt="" className="h-7 w-7 opacity-80" aria-hidden />
                    <span className="text-[10px] font-medium text-zinc-500">Singapore · West Coast</span>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
