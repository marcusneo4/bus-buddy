export interface ArrivalSlot {
  estimatedArrival: string | null;
  minutesAway: number | null;
  crowdLevel: "seats" | "standing" | "full" | "unknown";
  busType: "single" | "double" | "bendy" | "unknown";
  isMonitored: boolean;
}

export interface ServiceData {
  serviceNo: string;
  operator: string;
  arrivals: ArrivalSlot[];
  leaveAt: string | null;
  status: "gone" | "leave" | "stay" | null;
}

export interface DashboardResponse {
  stopCode: string;
  fetchedAt: string;
  services: ServiceData[];
}

export interface WeatherResponse {
  temperatureC: number;
  rainProbabilityPct: number;
  ambiance: "rain" | "cloudy" | "sunny";
}

const BASE = "/api";
const BACKEND_HINT =
  " Make sure the backend is running: cd backend && npm run dev";

const DEFAULT_API_TIMEOUT_MS = 10_000;
/** Driving mode calls 4 LTA APIs (incidents, images, speed bands, travel times); speed bands are paginated so we allow longer. */
const DRIVING_API_TIMEOUT_MS = 45_000;

interface RequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

function mapHttpErrorToUserMessage(status: number): string {
  if (status === 400) return "Invalid request. Please refresh and try again.";
  if (status === 401 || status === 403) return "You are not authorized to perform this action.";
  if (status === 404) return "Requested data is unavailable right now.";
  if (status === 429) return "Too many requests. Please wait a moment and retry.";
  if (status === 502 || status === 503 || status === 504) return "Service temporarily unavailable. Please retry shortly.";
  if (status >= 500) return "Server error. Please try again in a moment.";
  return "Request failed. Please try again.";
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

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeArrivalSlot(value: unknown): ArrivalSlot {
  const slot = isRecord(value) ? value : {};
  const crowdLevel = slot.crowdLevel;
  const busType = slot.busType;
  return {
    estimatedArrival: asNullableString(slot.estimatedArrival),
    minutesAway: asNullableNumber(slot.minutesAway),
    crowdLevel:
      crowdLevel === "seats" || crowdLevel === "standing" || crowdLevel === "full"
        ? crowdLevel
        : "unknown",
    busType:
      busType === "single" || busType === "double" || busType === "bendy" ? busType : "unknown",
    isMonitored: asBoolean(slot.isMonitored),
  };
}

function normalizeServiceData(value: unknown): ServiceData {
  const service = isRecord(value) ? value : {};
  const arrivalsRaw = Array.isArray(service.arrivals) ? service.arrivals : [];
  const status = service.status;
  return {
    serviceNo: asString(service.serviceNo, "—"),
    operator: asString(service.operator, "Unknown"),
    arrivals: arrivalsRaw.map(normalizeArrivalSlot),
    leaveAt: asNullableString(service.leaveAt),
    status: status === "gone" || status === "leave" || status === "stay" ? status : null,
  };
}

function normalizeDashboardResponse(value: unknown): DashboardResponse {
  const raw = isRecord(value) ? value : {};
  const servicesRaw = Array.isArray(raw.services) ? raw.services : [];
  return {
    stopCode: asString(raw.stopCode),
    fetchedAt: asString(raw.fetchedAt, new Date().toISOString()),
    services: servicesRaw.map(normalizeServiceData),
  };
}

function normalizeWeatherResponse(value: unknown): WeatherResponse {
  const raw = isRecord(value) ? value : {};
  const ambiance = raw.ambiance;
  return {
    temperatureC: asNumber(raw.temperatureC),
    rainProbabilityPct: Math.max(0, Math.min(100, asNumber(raw.rainProbabilityPct))),
    ambiance: ambiance === "rain" || ambiance === "cloudy" || ambiance === "sunny" ? ambiance : "cloudy",
  };
}

function normalizeDrivingResponse(value: unknown): DrivingResponse {
  const raw = isRecord(value) ? value : {};
  const incidentsRaw = Array.isArray(raw.incidents) ? raw.incidents : [];
  const camerasRaw = Array.isArray(raw.cameras) ? raw.cameras : [];
  const expresswaysRaw = Array.isArray(raw.expressways) ? raw.expressways : [];
  const travelTimesRaw = Array.isArray(raw.travelTimes) ? raw.travelTimes : [];

  return {
    fetchedAt: asString(raw.fetchedAt, new Date().toISOString()),
    incidents: incidentsRaw.map((incident) => {
      const row = isRecord(incident) ? incident : {};
      return {
        Type: asString(row.Type, "Unknown"),
        Latitude: asNumber(row.Latitude),
        Longitude: asNumber(row.Longitude),
        Message: asString(row.Message, ""),
      };
    }),
    cameras: camerasRaw.map((camera) => {
      const row = isRecord(camera) ? camera : {};
      return {
        CameraID: asString(row.CameraID, "unknown"),
        Latitude: asNumber(row.Latitude),
        Longitude: asNumber(row.Longitude),
        ImageLink: asString(row.ImageLink),
        distanceKm: asNumber(row.distanceKm),
      };
    }),
    expressways: expresswaysRaw.map((expressway) => {
      const row = isRecord(expressway) ? expressway : {};
      const status = row.status;
      return {
        name: asString(row.name, "Unknown"),
        avgBand: asNumber(row.avgBand),
        status: status === "jammed" || status === "slow" || status === "clear" ? status : "clear",
      };
    }),
    travelTimes: travelTimesRaw.map((route) => {
      const row = isRecord(route) ? route : {};
      const segmentsRaw = Array.isArray(row.segments) ? row.segments : [];
      return {
        name: asString(row.name, "Unknown"),
        direction: asNumber(row.direction),
        farEndPoint: asString(row.farEndPoint, "Unknown"),
        totalMinutes: asNumber(row.totalMinutes),
        segments: segmentsRaw.map((segment) => {
          const s = isRecord(segment) ? segment : {};
          return {
            start: asString(s.start),
            end: asString(s.end),
            mins: asNumber(s.mins),
          };
        }),
      };
    }),
  };
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutError = new DOMException("Request timed out", "TimeoutError");
  let didTimeout = false;
  let onAbort: (() => void) | null = null;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort(timeoutError);
  }, timeoutMs);
  if (options.signal) {
    onAbort = () => controller.abort(options.signal?.reason);
    if (options.signal.aborted) {
      onAbort();
    } else {
      options.signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
    });
  } catch (err) {
    const msg =
      didTimeout || (err instanceof DOMException && err.name === "TimeoutError")
        ? "Request timed out. Tap refresh to try again."
        : options.signal?.aborted
          ? "Request cancelled."
          : err instanceof TypeError && err.message?.includes("fetch")
        ? "Cannot reach backend." + BACKEND_HINT
        : err instanceof Error
          ? "Network error. Please try again."
          : "Network error";
    throw new Error(msg);
  } finally {
    clearTimeout(timeoutId);
    if (options.signal && onAbort) {
      options.signal.removeEventListener("abort", onAbort);
    }
  }
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try {
      const j = JSON.parse(body) as { error?: string };
      if (j.error) detail = j.error;
    } catch {
      /* use raw body */
    }
    // In Vite dev, backend-down proxy failures can surface as API 500 with ECONNREFUSED text.
    if (
      res.status === 500 &&
      /(ECONNREFUSED|connect ECONNREFUSED|http proxy error|AggregateError)/i.test(
        detail
      )
    ) {
      throw new Error("Cannot reach backend." + BACKEND_HINT);
    }
    throw new Error(mapHttpErrorToUserMessage(res.status));
  }
  return res.json() as Promise<T>;
}

export async function getBackendHealth(): Promise<{ status: string }> {
  const res = await fetch("/health", { signal: AbortSignal.timeout(3_000) });
  if (!res.ok) throw new Error("Backend not ready");
  return res.json() as Promise<{ status: string }>;
}

export async function getDashboard(
  stopCode: string,
  walkTimeMin: number,
  options?: RequestOptions
): Promise<DashboardResponse> {
  const data = await apiFetch<unknown>(
    `/dashboard?stopCode=${encodeURIComponent(stopCode)}&walkTimeMin=${walkTimeMin}`,
    options
  );
  return normalizeDashboardResponse(data);
}

export async function getWeather(options?: RequestOptions): Promise<WeatherResponse> {
  const data = await apiFetch<unknown>("/weather", options);
  return normalizeWeatherResponse(data);
}

// ── Driving mode types ────────────────────────────────────────────────────────

export interface TrafficIncident {
  Type: string;
  Latitude: number;
  Longitude: number;
  Message: string;
}

export interface TrafficCamera {
  CameraID: string;
  Latitude: number;
  Longitude: number;
  ImageLink: string;
  distanceKm: number;
}

export interface ExpresswayStatus {
  name: string;
  avgBand: number;
  status: "jammed" | "slow" | "clear";
}

export interface TravelTimeSegment {
  start: string;
  end: string;
  mins: number;
}

export interface TravelTimeRoute {
  name: string;
  direction: number;
  farEndPoint: string;
  totalMinutes: number;
  segments: TravelTimeSegment[];
}

export interface DrivingResponse {
  fetchedAt: string;
  incidents: TrafficIncident[];
  cameras: TrafficCamera[];
  expressways: ExpresswayStatus[];
  travelTimes: TravelTimeRoute[];
}

export async function getDriving(options?: RequestOptions): Promise<DrivingResponse> {
  const data = await apiFetch<unknown>("/driving", {
    timeoutMs: DRIVING_API_TIMEOUT_MS,
    signal: options?.signal,
  });
  return normalizeDrivingResponse(data);
}
