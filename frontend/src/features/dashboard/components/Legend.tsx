import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { BusTypeIcon } from "./BusTypeIcon";

export function Legend() {
  const [open, setOpen] = useState(true);

  return (
    <div className="mx-3 mb-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/90 overflow-hidden shadow-[var(--shadow-card)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="touch-target w-full flex min-h-[2.75rem] items-center justify-between px-3 py-2.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors duration-200 touch-manipulation [transition-timing-function:var(--ease-out-snappy)]"
        aria-expanded={open}
      >
        <span className="font-semibold tracking-wide uppercase">Legend</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-[var(--color-border-subtle)]/60">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 mt-2">
              Bus Type
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <BusTypeIcon type="single" />
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">Single Deck</span>
                  <span className="text-[11px] text-[var(--color-text-muted)] ml-2">1-floor bus</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BusTypeIcon type="double" />
                <div>
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">Double Decker</span>
                  <span className="text-[11px] text-[var(--color-text-muted)] ml-2">2-floor bus · more capacity</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">
              Crowd Level <span className="normal-case font-normal">(coloured dot)</span>
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">Seats available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">Standing room only</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">Bus is full — might not stop</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-[var(--color-border-muted)] shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">Crowd level unknown</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">
              Status — what to do
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-sm bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  <span className="font-bold text-[var(--color-text-primary)]">Stay ☕</span> — no need to leave yet; plenty of time
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-sm bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/50 shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  <span className="text-[var(--color-accent)] font-bold">Leave 🏃</span> — bus arrives within your walk time; leave soon
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-sm bg-[var(--color-bg-base-alt)] border border-[var(--color-border-subtle)] shrink-0 opacity-55" />
                <span className="text-xs text-[var(--color-text-muted)]">
                  <span className="font-bold text-[var(--color-text-secondary)]">Gone 💨</span> — bus already left or no more buses today
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
