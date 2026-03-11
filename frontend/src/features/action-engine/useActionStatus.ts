import { useMemo } from "react";
import type { ServiceData } from "../../lib/apiClient";

export type ArrivalStatus = "gone" | "leave" | "stay" | null;

export interface EnrichedService extends ServiceData {
  leaveAtDisplay: string | null;
  statusEmoji: string;
  statusLabel: string;
  minsUntilLeave: number | null;
}

const STATUS_EMOJI: Record<NonNullable<ArrivalStatus>, string> = {
  gone: "💨",
  leave: "🏃",
  stay: "⏳",
};

const STATUS_LABEL: Record<NonNullable<ArrivalStatus>, string> = {
  gone: "Missed",
  leave: "Go Now!",
  stay: "On Time",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore",
  });
}

function getMinsUntilLeave(leaveAt: string | null, now: number): number | null {
  if (!leaveAt) return null;
  return Math.round((new Date(leaveAt).getTime() - now) / 60_000);
}

/**
 * @param services  - Raw service data from the API.
 * @param now       - Current timestamp in ms. Pass a value from `useNow()` so
 *                    the countdown updates every second instead of freezing at
 *                    the moment the last fetch returned.
 */
export function useEnrichedServices(
  services: ServiceData[],
  now: number
): EnrichedService[] {
  return useMemo(
    () =>
      services.map((svc) => ({
        ...svc,
        // Recalculate minutesAway every second from estimatedArrival so
        // arrival chips and QuickStats stay accurate between 30s fetches.
        arrivals: svc.arrivals.map((arr) => ({
          ...arr,
          minutesAway: arr.estimatedArrival
            ? Math.round((new Date(arr.estimatedArrival).getTime() - now) / 60_000)
            : arr.minutesAway,
        })),
        leaveAtDisplay: svc.leaveAt ? formatTime(svc.leaveAt) : null,
        statusEmoji: svc.status ? STATUS_EMOJI[svc.status] : "—",
        statusLabel: svc.status ? STATUS_LABEL[svc.status] : "—",
        minsUntilLeave: getMinsUntilLeave(svc.leaveAt, now),
      })),
    [services, now]
  );
}
