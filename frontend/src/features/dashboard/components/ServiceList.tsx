import { useMemo } from "react";
import { ServiceCard } from "./ServiceCard";
import { SkeletonRows } from "./SkeletonRows";
import { Legend } from "./Legend";
import type { EnrichedService } from "../../action-engine/useActionStatus";

interface Props {
  services: EnrichedService[];
  pinnedServices: string[];
  loading: boolean;
  onTogglePin: (serviceNo: string) => void;
}

export function ServiceList({
  services,
  pinnedServices,
  loading,
  onTogglePin,
}: Props) {
  const pinnedSet = useMemo(() => new Set(pinnedServices), [pinnedServices]);

  // Pinned first, then sorted by service number — must run before early returns (Rules of Hooks)
  const sorted = useMemo(
    () =>
      [...services].sort((a, b) => {
        const aPinned = pinnedSet.has(a.serviceNo) ? 0 : 1;
        const bPinned = pinnedSet.has(b.serviceNo) ? 0 : 1;
        if (aPinned !== bPinned) return aPinned - bPinned;
        return a.serviceNo.localeCompare(b.serviceNo, undefined, { numeric: true });
      }),
    [services, pinnedSet]
  );

  if (loading && services.length === 0) {
    return <SkeletonRows count={7} />;
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <span className="text-4xl" aria-hidden>🚌</span>
        <p className="text-sm font-semibold text-[var(--color-text-muted)]">No services at this stop</p>
        <p className="text-xs max-w-[220px] text-[var(--color-text-muted)]">
          Tap refresh or wait for the next auto-update.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {sorted.map((svc, idx) => (
        <div
          key={svc.serviceNo}
          className="dashboard-card-enter opacity-0"
          style={{ animationDelay: `${Math.min(idx * 50, 400)}ms` }}
        >
          <ServiceCard
            service={svc}
            isPinned={pinnedSet.has(svc.serviceNo)}
            onTogglePin={onTogglePin}
          />
        </div>
      ))}
      <Legend />
    </div>
  );
}
