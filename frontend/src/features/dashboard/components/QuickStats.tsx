import { Bus, Clock } from "lucide-react";
import { useNow } from "../../../hooks/useNow";
import type { EnrichedService } from "../../action-engine/useActionStatus";

interface Props {
  services: EnrichedService[];
}

function formatMins(mins: number | null): string {
  if (mins === null) return "—";
  if (mins <= 0) return "Arr";
  return `${mins}m`;
}

function computeQuickStats(services: EnrichedService[]) {
  let nextMins: number | null = null;
  let nextServiceNo: string | null = null;
  let busesIn5 = 0;

  for (const svc of services) {
    for (const arr of svc.arrivals) {
      const m = arr.minutesAway;
      if (m === null || m < 0) continue;
      if (nextMins === null || m < nextMins) {
        nextMins = m;
        nextServiceNo = svc.serviceNo;
      }
    }
    const hasIn5 = svc.arrivals.some(
      (a) => a.minutesAway !== null && a.minutesAway >= 0 && a.minutesAway <= 5
    );
    if (hasIn5) busesIn5 += 1;
  }

  return { nextMins, nextServiceNo, busesIn5 };
}

export function QuickStats({ services }: Props) {
  const { nextMins, nextServiceNo, busesIn5 } = computeQuickStats(services);
  const now = useNow(1_000);
  const clockTime = new Date(now).toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore",
  });

  if (services.length === 0) return null;

  return (
    <div className="grid grid-cols-3 items-center gap-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base-alt)]/80 px-3 py-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <Bus size={14} className="text-[var(--color-accent)] shrink-0" aria-hidden />
        {nextServiceNo != null && nextMins !== null ? (
          <span className="text-xs tabular-nums truncate text-[var(--color-text-secondary)]">
            <span className="font-bold text-[var(--color-text-primary)]">Next:</span>{" "}
            <span className="font-black text-sm text-[var(--color-accent)]">{nextServiceNo}</span>
            {" in "}
            <span className="font-bold text-[var(--color-text-primary)]">{formatMins(nextMins)}</span>
          </span>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">No arrivals</span>
        )}
      </div>

      <div className="flex justify-center">
        <div
          className="flex items-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-1.5 shadow-[var(--shadow-card)]"
          aria-label="Current time"
        >
          <span className="text-sm font-black tabular-nums tracking-tight text-[var(--color-text-primary)]">
            {clockTime}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 justify-end">
        <Clock size={14} className="shrink-0 text-[var(--color-text-muted)]" aria-hidden />
        <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
          <span className="font-bold text-[var(--color-text-secondary)]">{busesIn5}</span>
          {" bus"}{busesIn5 !== 1 ? "es" : ""} in 5m
        </span>
      </div>
    </div>
  );
}
