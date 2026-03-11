import { env } from "../config/env.js";

// ── Driving / Traffic interfaces ──────────────────────────────────────────────

export interface LtaTrafficIncident {
  Type: string;
  Latitude: number;
  Longitude: number;
  Message: string;
}

export interface LtaTrafficImage {
  CameraID: string;
  Latitude: number;
  Longitude: number;
  ImageLink: string;
}

export interface LtaTrafficSpeedBand {
  LinkID: string;
  RoadName: string;
  /** A=Expressway B=Major Arterial C=Arterial D=Minor Arterial E=Local */
  RoadCategory: string;
  /** 1 (slowest) – 8 (fastest) */
  SpeedBand: number;
  MinimumSpeed: string;
  MaximumSpeed: string;
  StartLon: string;
  StartLat: string;
  EndLon: string;
  EndLat: string;
}

export interface LtaEstTravelTime {
  Name: string;
  Direction: number;
  FarEndPoint: string;
  StartPoint: string;
  EndPoint: string;
  EstTime: number;
}

// ── Bus Arrival interfaces ─────────────────────────────────────────────────────

export interface LtaBusArrival {
  ServiceNo: string;
  Operator: string;
  NextBus: LtaBusArrivalSlot;
  NextBus2: LtaBusArrivalSlot;
  NextBus3: LtaBusArrivalSlot;
}

export interface LtaBusArrivalSlot {
  OriginCode: string;
  DestinationCode: string;
  EstimatedArrival: string; // ISO8601 string, empty if not in service
  Monitored: number; // 0 or 1
  Latitude: string;
  Longitude: string;
  VisitNumber: string;
  Load: "SEA" | "SDA" | "LSD" | "";
  Feature: string;
  Type: "SD" | "DD" | "BD" | "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNumericString(value: unknown, fallback = "0"): string {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function normalizeBusSlot(value: unknown): LtaBusArrivalSlot {
  const slot = isRecord(value) ? value : {};
  const loadRaw = slot.Load;
  const typeRaw = slot.Type;
  return {
    OriginCode: asString(slot.OriginCode),
    DestinationCode: asString(slot.DestinationCode),
    EstimatedArrival: asString(slot.EstimatedArrival),
    Monitored: asNumber(slot.Monitored) === 1 ? 1 : 0,
    Latitude: asNumericString(slot.Latitude),
    Longitude: asNumericString(slot.Longitude),
    VisitNumber: asString(slot.VisitNumber),
    Load: loadRaw === "SEA" || loadRaw === "SDA" || loadRaw === "LSD" || loadRaw === "" ? loadRaw : "",
    Feature: asString(slot.Feature),
    Type: typeRaw === "SD" || typeRaw === "DD" || typeRaw === "BD" || typeRaw === "" ? typeRaw : "",
  };
}

function normalizeBusArrival(value: unknown): LtaBusArrival | null {
  if (!isRecord(value)) return null;
  const serviceNo = asString(value.ServiceNo);
  if (!serviceNo) return null;
  return {
    ServiceNo: serviceNo,
    Operator: asString(value.Operator, "Unknown"),
    NextBus: normalizeBusSlot(value.NextBus),
    NextBus2: normalizeBusSlot(value.NextBus2),
    NextBus3: normalizeBusSlot(value.NextBus3),
  };
}

export async function fetchBusArrivals(
  stopCode: string
): Promise<LtaBusArrival[]> {
  const url = `${env.LTA_BASE_URL}/v3/BusArrival?BusStopCode=${encodeURIComponent(stopCode)}`;
  const res = await fetch(url, {
    headers: { AccountKey: env.LTA_API_KEY },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    throw new Error(
      `LTA API error: ${res.status} ${res.statusText} for stop ${stopCode}`
    );
  }

  const data: unknown = await res.json();
  const servicesRaw = isRecord(data) && Array.isArray(data.Services) ? data.Services : [];
  return servicesRaw.map(normalizeBusArrival).filter((row): row is LtaBusArrival => row !== null);
}

// ── Traffic fetch helpers ─────────────────────────────────────────────────────
// LTA traffic APIs (speed bands, travel times, etc.) are slower and often paginated; use a longer timeout.
const LTA_TRAFFIC_TIMEOUT_MS = 20_000;

async function ltaFetch<T>(path: string, skip = 0): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${env.LTA_BASE_URL}${path}${skip > 0 ? `${sep}$skip=${skip}` : ""}`;
  const res = await fetch(url, {
    headers: { AccountKey: env.LTA_API_KEY },
    signal: AbortSignal.timeout(LTA_TRAFFIC_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`LTA API error: ${res.status} ${res.statusText} for ${path}`);
  }
  const data: unknown = await res.json();
  const list =
    isRecord(data) && Array.isArray(data.value)
      ? data.value
      : isRecord(data) && isRecord(data.d) && Array.isArray(data.d.results)
        ? data.d.results
        : isRecord(data) && Array.isArray(data.results)
          ? data.results
          : [];
  return Array.isArray(list) ? list : [];
}

/** Paginate until no more data or hit limit. Optionally cap pages to avoid long runs (e.g. speed bands). */
async function ltaFetchAll<T>(path: string, pageSize = 500, maxPages = 50): Promise<T[]> {
  const results: T[] = [];
  let skip = 0;
  let pages = 0;
  while (pages < maxPages) {
    const page = await ltaFetch<T>(path, skip);
    if (page.length === 0) break;
    results.push(...page);
    pages += 1;
    if (page.length < pageSize) break;
    skip += pageSize;
    if (skip > 20_000) break; // safety limit ~20k records
  }
  return results;
}

// LTA DataMall 2.0 traffic APIs use OData entity set names (no v3 prefix)
export async function fetchTrafficIncidents(): Promise<LtaTrafficIncident[]> {
  // Try both known entity set names – API docs have changed over versions
  try {
    const data = await ltaFetch<unknown>("/TrafficIncidents");
    const sanitized = data
      .map((row) => {
        if (!isRecord(row)) return null;
        return {
          Type: asString(row.Type, "Unknown"),
          Latitude: asNumber(row.Latitude),
          Longitude: asNumber(row.Longitude),
          Message: asString(row.Message),
        };
      })
      .filter((row): row is LtaTrafficIncident => row !== null);
    if (sanitized.length > 0) return sanitized;
  } catch { /* fall through */ }
  try {
    const data = await ltaFetch<unknown>("/IncidentSet");
    return data
      .map((row) => {
        if (!isRecord(row)) return null;
        return {
          Type: asString(row.Type, "Unknown"),
          Latitude: asNumber(row.Latitude),
          Longitude: asNumber(row.Longitude),
          Message: asString(row.Message),
        };
      })
      .filter((row): row is LtaTrafficIncident => row !== null);
  } catch {
    return [];
  }
}

export async function fetchTrafficImages(): Promise<LtaTrafficImage[]> {
  const data = await ltaFetch<unknown>("/Traffic-Imagesv2");
  return data
    .map((row) => {
      if (!isRecord(row)) return null;
      const cameraId = asString(row.CameraID);
      const imageLink = asString(row.ImageLink);
      if (!cameraId || !imageLink) return null;
      return {
        CameraID: cameraId,
        Latitude: asNumber(row.Latitude),
        Longitude: asNumber(row.Longitude),
        ImageLink: imageLink,
      };
    })
    .filter((row): row is LtaTrafficImage => row !== null);
}

export async function fetchTrafficSpeedBands(): Promise<LtaTrafficSpeedBand[]> {
  // LTA DataMall 2.0: paginate (500 per page). Cap at 3 pages to avoid timeout; 1500 segments is enough for heatmap.
  // Try the known-working v3 endpoint first; fall back to legacy names in case LTA changes the API.
  const paths = [
    "/v3/TrafficSpeedBands",
    "/TrafficSpeedBandsv2",
    "/TrafficSpeedBands",
  ];
  const maxPages = 3;
  for (const path of paths) {
    try {
      const data = await ltaFetchAll<unknown>(path, 500, maxPages);
      const sanitized = data
        .map((row) => {
          if (!isRecord(row)) return null;
          const roadName = asString(row.RoadName);
          if (!roadName) return null;
          return {
            LinkID: asString(row.LinkID),
            RoadName: roadName,
            RoadCategory: asString(row.RoadCategory),
            SpeedBand: asNumber(row.SpeedBand),
            MinimumSpeed: asNumericString(row.MinimumSpeed),
            MaximumSpeed: asNumericString(row.MaximumSpeed),
            StartLon: asNumericString(row.StartLon),
            StartLat: asNumericString(row.StartLat),
            EndLon: asNumericString(row.EndLon),
            EndLat: asNumericString(row.EndLat),
          };
        })
        .filter((row): row is LtaTrafficSpeedBand => row !== null);
      if (sanitized.length > 0) {
        console.info(`[/lta] Speed bands from ${path}: ${sanitized.length} segments (paginated, max ${maxPages} pages)`);
        return sanitized;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[/lta] Speed bands ${path} failed:`, msg);
    }
  }
  console.warn("[/lta] No speed band data from any endpoint. Enable 'Traffic Speed Bands' in LTA DataMall for your API key.");
  return [];
}

export async function fetchEstTravelTimes(): Promise<LtaEstTravelTime[]> {
  const data = await ltaFetch<unknown>("/EstTravelTimes");
  return data
    .map((row) => {
      if (!isRecord(row)) return null;
      const name = asString(row.Name);
      const farEndPoint = asString(row.FarEndPoint);
      if (!name || !farEndPoint) return null;
      return {
        Name: name,
        Direction: Math.trunc(asNumber(row.Direction)),
        FarEndPoint: farEndPoint,
        StartPoint: asString(row.StartPoint),
        EndPoint: asString(row.EndPoint),
        EstTime: asNumber(row.EstTime),
      };
    })
    .filter((row): row is LtaEstTravelTime => row !== null);
}
