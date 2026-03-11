import { Search, X, Plus, Minus } from "lucide-react";
import type { BusStop, Preferences } from "../../preferences/preferencesStore";

interface Props {
  prefs: Preferences;
  filter: string;
  onFilterChange: (v: string) => void;
  onStopChange: (code: string) => void;
  onWalkTimeChange: (mins: number) => void;
}

export function ControlsBar({
  prefs,
  filter,
  onFilterChange,
  onStopChange,
  onWalkTimeChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur-sm">
      {/* Stop selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {prefs.favoriteStops.map((stop: BusStop) => (
          <button
            key={stop.code}
            onClick={() => onStopChange(stop.code)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
              prefs.activeStopCode === stop.code
                ? "border-white bg-white text-black"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {stop.label}
          </button>
        ))}
      </div>

      {/* Filter + walk time row */}
      <div className="flex items-center gap-3">
        {/* Search filter */}
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Filter bus number…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-8 pr-8 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
          />
          {filter && (
            <button
              onClick={() => onFilterChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              aria-label="Clear filter"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Walk time control */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5">
          <button
            onClick={() => onWalkTimeChange(Math.max(0, prefs.walkTimeMin - 1))}
            disabled={prefs.walkTimeMin <= 0}
            className="rounded p-0.5 text-zinc-400 hover:text-white disabled:opacity-30 active:scale-90 transition-transform"
            aria-label="Decrease walk time"
          >
            <Minus size={14} />
          </button>
          <span className="w-12 text-center text-sm font-semibold text-white tabular-nums">
            🚶 {prefs.walkTimeMin}m
          </span>
          <button
            onClick={() =>
              onWalkTimeChange(Math.min(60, prefs.walkTimeMin + 1))
            }
            disabled={prefs.walkTimeMin >= 60}
            className="rounded p-0.5 text-zinc-400 hover:text-white disabled:opacity-30 active:scale-90 transition-transform"
            aria-label="Increase walk time"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
