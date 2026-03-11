import { BusTypeIcon } from "./BusTypeIcon";
import type { ArrivalSlot } from "../../../lib/apiClient";

interface Props {
  arrivals: ArrivalSlot[];
}

function formatMins(mins: number | null): string {
  if (mins === null) return "—";
  if (mins <= 0) return "Arr";
  return `${mins}m`;
}

/** Colored dot representing bus load level */
const CROWD_DOT: Record<ArrivalSlot["crowdLevel"], string> = {
  seats: "bg-emerald-500",
  standing: "bg-amber-500",
  full: "bg-red-500",
  unknown: "bg-[var(--color-border-muted)]",
};

const CROWD_TITLE: Record<ArrivalSlot["crowdLevel"], string> = {
  seats: "Seats available",
  standing: "Standing room",
  full: "Full — no room",
  unknown: "",
};

export function ArrivalChips({ arrivals }: Props) {
  if (arrivals.length === 0) {
    return <span className="text-xs text-[var(--color-text-muted)]">No service</span>;
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {arrivals.map((slot, idx) => {
        const isNext = idx === 0;
        return (
          <div
            key={idx}
            className={`flex items-center gap-1.5 ${isNext ? "" : "opacity-75"}`}
          >
            {/* Crowd dot */}
            <span
              className={`inline-block h-3 w-3 rounded-full shrink-0 ${CROWD_DOT[slot.crowdLevel]}`}
              title={CROWD_TITLE[slot.crowdLevel]}
              aria-label={CROWD_TITLE[slot.crowdLevel]}
            />

            {/* Bus type icon uses built-in 2-tone livery colors */}
            <BusTypeIcon
              type={slot.busType}
              className={slot.busType === "unknown" ? "opacity-60" : ""}
            />

            {/* Arrival time */}
            <span
              className={`tabular-nums leading-none font-black ${
                isNext
                  ? "text-[22px] text-[var(--color-text-primary)]"
                  : "text-base text-[var(--color-text-secondary)]"
              }`}
            >
              {formatMins(slot.minutesAway)}
            </span>

            {/* Dot separator between arrivals */}
            {idx < arrivals.length - 1 && (
              <span className="text-[var(--color-text-muted)] text-sm ml-0.5" aria-hidden>
                ·
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
