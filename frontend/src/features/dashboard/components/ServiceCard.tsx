import { Pin, PinOff } from "lucide-react";
import clsx from "clsx";
import { ArrivalChips } from "./ArrivalChips";
import type { EnrichedService } from "../../action-engine/useActionStatus";

interface Props {
  service: EnrichedService;
  isPinned: boolean;
  onTogglePin: (serviceNo: string) => void;
}

const CARD_STYLES = {
  stay: "bg-[var(--color-bg-surface)]/90 border-[var(--color-border-subtle)] border-l-[var(--color-border-muted)]",
  leave: "bg-[var(--color-accent-soft)] border-[var(--color-accent)]/50 shadow-[var(--shadow-card)] border-l-[var(--color-accent)]",
  gone: "bg-[var(--color-bg-base-alt)]/90 border-[var(--color-border-subtle)]/60 border-l-[var(--color-border-subtle)]",
};

const BADGE_STYLES = {
  stay: "bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]",
  leave: "bg-[var(--color-accent)] text-[var(--color-bg-base)] font-black animate-pulse",
  gone: "bg-[var(--color-bg-surface-elevated)]/80 border border-[var(--color-border-subtle)] text-[var(--color-text-muted)]",
};

export function ServiceCard({ service, isPinned, onTogglePin }: Props) {
  const status = service.status ?? "stay";
  const isGone = status === "gone";
  const isLastBus = service.arrivals.length === 1;

  return (
    <div
      className={clsx(
        "relative rounded-xl border border-l-4 p-3 transition-all duration-200 shadow-[var(--shadow-card)]",
        "[transition-timing-function:var(--ease-out-snappy)]",
        CARD_STYLES[status],
        isGone && "opacity-55"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 shrink-0 w-16">
          {isPinned && (
            <Pin
              size={10}
              className="text-[var(--color-accent)] fill-[var(--color-accent)] shrink-0"
              aria-label="Pinned"
            />
          )}
          <span className="text-[28px] font-black tracking-tight leading-none text-[var(--color-text-primary)]">
            {service.serviceNo}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <ArrivalChips arrivals={service.arrivals} />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isLastBus && !isGone && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase bg-red-950/80 border border-red-700/60 text-red-300">
              Last
            </span>
          )}
          <span
            className={clsx(
              "flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-black border",
              BADGE_STYLES[status]
            )}
          >
            <span aria-hidden>{service.statusEmoji}</span>
            <span>{service.statusLabel}</span>
          </span>
          <button
            onClick={() => onTogglePin(service.serviceNo)}
            className="touch-target flex h-11 w-11 min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-lg btn-tactile touch-manipulation text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            aria-label={isPinned ? "Unpin service" : "Pin service"}
          >
            {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
        </div>
      </div>

      {status === "leave" && service.minsUntilLeave !== null && (
        <div className="mt-2 space-y-1">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-surface-elevated)]"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-1000"
              style={{
                width: `${Math.max(0, Math.min(100, (service.minsUntilLeave / 5) * 100))}%`,
                transitionTimingFunction: "var(--ease-out-snappy)",
              }}
            />
          </div>
          {service.leaveAtDisplay && (
            <p className="text-sm font-black tabular-nums text-[var(--color-accent)]">
              🏃 {service.minsUntilLeave !== null && service.minsUntilLeave <= 0
                ? "Leave now"
                : `Leave house in ${service.minsUntilLeave} min`}
              {service.minsUntilLeave !== null && service.minsUntilLeave > 0 && (
                <span className="font-bold opacity-90">
                  {" · "}by {service.leaveAtDisplay}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {status === "stay" && service.leaveAtDisplay && (
        <p className="mt-1.5 text-sm font-bold tabular-nums text-[var(--color-accent)]">
          🚶 Leave house in {service.minsUntilLeave ?? 0} min
          {service.minsUntilLeave !== null && service.minsUntilLeave > 0 && (
            <span className="opacity-80"> · by {service.leaveAtDisplay}</span>
          )}
        </p>
      )}
    </div>
  );
}
