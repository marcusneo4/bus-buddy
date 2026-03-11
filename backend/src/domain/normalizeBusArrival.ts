import type { LtaBusArrival, LtaBusArrivalSlot } from "../integrations/ltaClient.js";

export type CrowdLevel = "seats" | "standing" | "full" | "unknown";
export type BusType = "single" | "double" | "bendy" | "unknown";
export type ArrivalStatus = "gone" | "leave" | "stay";

export interface ArrivalSlot {
  estimatedArrival: string | null; // ISO8601 or null
  minutesAway: number | null;
  crowdLevel: CrowdLevel;
  busType: BusType;
  isMonitored: boolean;
}

export interface NormalizedService {
  serviceNo: string;
  operator: string;
  arrivals: ArrivalSlot[];
  // computed fields require walkTimeMin context — set by route handler
  leaveAt: string | null;
  status: ArrivalStatus | null;
}

function mapCrowd(load: LtaBusArrivalSlot["Load"]): CrowdLevel {
  if (load === "SEA") return "seats";
  if (load === "SDA") return "standing";
  if (load === "LSD") return "full";
  return "unknown";
}

function mapBusType(type: LtaBusArrivalSlot["Type"]): BusType {
  if (type === "SD") return "single";
  if (type === "DD") return "double";
  if (type === "BD") return "bendy";
  return "unknown";
}

function normalizeSlot(slot: LtaBusArrivalSlot): ArrivalSlot {
  const arrival = slot.EstimatedArrival || null;
  let minutesAway: number | null = null;
  if (arrival) {
    const arrivalMs = new Date(arrival).getTime();
    if (Number.isFinite(arrivalMs)) {
      const diffMs = arrivalMs - Date.now();
      minutesAway = Math.round(diffMs / 60_000);
    }
  }
  return {
    estimatedArrival: arrival,
    minutesAway,
    crowdLevel: mapCrowd(slot.Load),
    busType: mapBusType(slot.Type),
    isMonitored: slot.Monitored === 1,
  };
}

function computeStatus(
  firstArrival: string | null,
  walkTimeMin: number
): { leaveAt: string | null; status: ArrivalStatus | null } {
  if (!firstArrival) return { leaveAt: null, status: null };

  const arrivalMs = new Date(firstArrival).getTime();
  if (!Number.isFinite(arrivalMs)) {
    return { leaveAt: null, status: null };
  }
  const walkMs = walkTimeMin * 60_000;
  const leaveAtMs = arrivalMs - walkMs;
  const nowMs = Date.now();
  const leaveAt = new Date(leaveAtMs).toISOString();

  let status: ArrivalStatus;
  const minsUntilLeave = (leaveAtMs - nowMs) / 60_000;

  if (minsUntilLeave < 0) {
    status = "gone";
  } else if (minsUntilLeave <= 5) {
    status = "leave";
  } else {
    status = "stay";
  }

  return { leaveAt, status };
}

export function normalizeServices(
  rawServices: LtaBusArrival[],
  walkTimeMin: number
): NormalizedService[] {
  return rawServices.map((svc) => {
    const slots = [svc.NextBus, svc.NextBus2, svc.NextBus3]
      .map(normalizeSlot)
      .filter((s) => s.estimatedArrival !== null);

    const firstArrival = slots[0]?.estimatedArrival ?? null;
    const { leaveAt, status } = computeStatus(firstArrival, walkTimeMin);

    return {
      serviceNo: svc.ServiceNo,
      operator: svc.Operator,
      arrivals: slots,
      leaveAt,
      status,
    };
  });
}
