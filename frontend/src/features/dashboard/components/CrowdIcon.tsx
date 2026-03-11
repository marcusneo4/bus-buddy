import type { ArrivalSlot } from "../../../lib/apiClient";

interface Props {
  level: ArrivalSlot["crowdLevel"];
  /** Render as a labelled pill (default: dot only) */
  showLabel?: boolean;
}

const DOT_COLOR: Record<ArrivalSlot["crowdLevel"], string> = {
  seats: "bg-emerald-500",
  standing: "bg-amber-500",
  full: "bg-red-500",
  unknown: "bg-zinc-600",
};

const LABEL: Record<ArrivalSlot["crowdLevel"], string> = {
  seats: "Seats",
  standing: "Standing",
  full: "Full",
  unknown: "",
};

const TITLE: Record<ArrivalSlot["crowdLevel"], string> = {
  seats: "Seats available",
  standing: "Standing room",
  full: "Full — no room",
  unknown: "",
};

export function CrowdIcon({ level, showLabel = false }: Props) {
  if (level === "unknown") return null;

  return (
    <span
      className={`inline-flex items-center gap-1 ${showLabel ? "rounded-full px-1.5 py-0.5" : ""}`}
      title={TITLE[level]}
      aria-label={TITLE[level]}
    >
      <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${DOT_COLOR[level]}`} />
      {showLabel && (
        <span className="text-[10px] font-semibold text-zinc-300">{LABEL[level]}</span>
      )}
    </span>
  );
}
