/**
 * Driving-mode domain: speed bands, travel times, camera prioritization.
 * Pure functions and small helpers; no I/O.
 */

import type {
  LtaTrafficSpeedBand,
  LtaEstTravelTime,
  LtaTrafficImage,
} from "../integrations/ltaClient.js";

export type ExpresswayStatus = "jammed" | "slow" | "clear";

export interface ExpresswaySummary {
  name: string;
  avgBand: number;
  status: ExpresswayStatus;
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

/** Earth radius in km for haversine. */
const EARTH_RADIUS_KM = 6371;

/**
 * Distance between two points in km (haversine).
 * @param lat1 - Latitude of first point (degrees)
 * @param lon1 - Longitude of first point (degrees)
 * @param lat2 - Latitude of second point (degrees)
 * @param lon2 - Longitude of second point (degrees)
 * @returns Distance in kilometres
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Typical free-flow travel time (minutes) per expressway for ratio-based status. */
const TYPICAL_CLEAR_MINS: Record<string, number> = {
  AYE: 28,
  BKE: 12,
  CTE: 18,
  ECP: 22,
  KJE: 10,
  PIE: 48,
  SLE: 14,
  TPE: 22,
  "KALLANG-PAYA LEBAR": 22,
  "MARINA COASTAL": 8,
};

/** Typical speed (km/h) per LTA band 1–8 for expressways. Band 1 ≈ standstill, 8 ≈ free flow. */
const BAND_TO_KMH: number[] = [0, 8, 18, 28, 38, 50, 62, 74, 86];

const EXPRESSWAY_CATEGORY = "A";
const MIN_VALID_SPEED = 0;
const MAX_VALID_SPEED = 120;

/**
 * Effective speed in km/h for a speed-band segment.
 * Uses Min/Max when valid; otherwise infers from SpeedBand 1–8.
 */
function effectiveSpeedKmh(segment: LtaTrafficSpeedBand): number {
  const min = parseFloat(segment.MinimumSpeed);
  const max = parseFloat(segment.MaximumSpeed);
  if (
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min >= MIN_VALID_SPEED &&
    max <= MAX_VALID_SPEED
  ) {
    return (min + max) / 2;
  }
  const band = Math.max(1, Math.min(8, Math.round(segment.SpeedBand)));
  return BAND_TO_KMH[band] ?? 40;
}

/** Status from average speed: jammed = crawl, slow = heavy congestion, clear = moving well. */
function speedToStatus(avgSpeedKmh: number): ExpresswayStatus {
  if (avgSpeedKmh < 18) return "jammed";
  if (avgSpeedKmh < 42) return "slow";
  return "clear";
}

/** Map average speed to display band 1–8 for UI. */
function speedToBand(avgSpeedKmh: number): number {
  if (avgSpeedKmh <= 12) return 1;
  if (avgSpeedKmh <= 23) return 2;
  if (avgSpeedKmh <= 33) return 3;
  if (avgSpeedKmh <= 44) return 4;
  if (avgSpeedKmh <= 56) return 5;
  if (avgSpeedKmh <= 68) return 6;
  if (avgSpeedKmh <= 80) return 7;
  return 8;
}

/**
 * Aggregate speed-band segments by expressway (RoadCategory A), sorted by name.
 * @param bands - Raw LTA speed band segments
 * @returns Expressway summaries with avgBand and status
 */
export function aggregateExpressways(
  bands: LtaTrafficSpeedBand[]
): ExpresswaySummary[] {
  if (bands.length === 0) return [];

  const byRoad = new Map<string, { sumSpeed: number; count: number }>();

  for (const segment of bands) {
    if (!segment?.RoadName || typeof segment.RoadName !== "string") continue;
    if (segment.RoadCategory !== EXPRESSWAY_CATEGORY) continue;

    const speed = effectiveSpeedKmh(segment);
    const entry = byRoad.get(segment.RoadName) ?? { sumSpeed: 0, count: 0 };
    entry.sumSpeed += speed;
    entry.count += 1;
    byRoad.set(segment.RoadName, entry);
  }

  return Array.from(byRoad.entries())
    .map(([name, { sumSpeed, count }]) => {
      const avgSpeedKmh = sumSpeed / count;
      const status = speedToStatus(avgSpeedKmh);
      const avgBand = speedToBand(avgSpeedKmh);
      return { name, avgBand, status };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Aggregate estimated travel times by route key (Name|Direction).
 * @param times - Raw LTA estimated travel time segments
 * @returns Routes with total minutes and segment list
 */
export function aggregateTravelTimes(
  times: LtaEstTravelTime[]
): TravelTimeRoute[] {
  const byKey = new Map<
    string,
    {
      direction: number;
      farEndPoint: string;
      totalMinutes: number;
      segments: TravelTimeSegment[];
    }
  >();

  for (const segment of times) {
    if (!segment?.Name || typeof segment.Name !== "string") continue;
    if (!Number.isFinite(segment.EstTime)) continue;

    const key = `${segment.Name}|${segment.Direction}`;
    const entry = byKey.get(key) ?? {
      direction: segment.Direction,
      farEndPoint: segment.FarEndPoint,
      totalMinutes: 0,
      segments: [],
    };
    entry.totalMinutes += segment.EstTime;
    entry.segments.push({
      start: segment.StartPoint,
      end: segment.EndPoint,
      mins: segment.EstTime,
    });
    byKey.set(key, entry);
  }

  return Array.from(byKey.entries()).map(([key, route]) => ({
    name: key.split("|")[0],
    direction: route.direction,
    farEndPoint: route.farEndPoint,
    totalMinutes: route.totalMinutes,
    segments: route.segments,
  }));
}

function statusFromRatio(
  totalMinutes: number,
  typicalMinutes: number
): ExpresswayStatus {
  const ratio = totalMinutes / typicalMinutes;
  if (ratio > 1.4) return "jammed";
  if (ratio > 1.15) return "slow";
  return "clear";
}

/**
 * Fallback: derive expressway status from travel-time ratio when speed bands are unavailable.
 */
export function aggregateExpresswaysFromTravelTimes(
  times: LtaEstTravelTime[]
): ExpresswaySummary[] {
  if (times.length === 0) return [];

  const byName = new Map<string, { totalRatio: number; count: number }>();

  for (const segment of times) {
    if (!segment?.Name || typeof segment.Name !== "string") continue;
    if (!Number.isFinite(segment.EstTime) || segment.EstTime <= 0) continue;

    const key = segment.Name.toUpperCase();
    const typicalMinutes =
      TYPICAL_CLEAR_MINS[key] ??
      TYPICAL_CLEAR_MINS[segment.Name] ??
      Math.max(8, Math.round(segment.EstTime));
    const ratio = segment.EstTime / typicalMinutes;
    const entry = byName.get(segment.Name) ?? { totalRatio: 0, count: 0 };
    entry.totalRatio += ratio;
    entry.count += 1;
    byName.set(segment.Name, entry);
  }

  return Array.from(byName.entries())
    .map(([name, { totalRatio, count }]) => {
      const avgRatio = totalRatio / count;
      const status = statusFromRatio(avgRatio, 1);
      const avgBand =
        status === "jammed" ? 2 : status === "slow" ? 4 : 7;
      return { name, avgBand, status };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Camera IDs that must always appear (e.g. checkpoint cams). */
const MUST_SHOW_CAMERA_IDS = new Set(["8701", "9701"]);

/** Camera IDs for West Coast / AYE / MCE focus. */
const WEST_FOCUS_CAMERA_IDS = new Set([
  "1501", "1502", "1503", "1504", "1505", "1506", "1507", "1508",
  "6705", "6706", "6710", "6711", "6712", "6716",
]);

const MAX_CAMERAS = 25;

/** Traffic image with computed distance for API response. */
export interface TrafficCameraWithDistance extends LtaTrafficImage {
  distanceKm: number;
}

/**
 * Prioritize and return top N cameras: checkpoints first, then West focus, then by distance.
 * @param images - All traffic images from LTA
 * @param centerLat - Center latitude (e.g. Singapore ref)
 * @param centerLon - Center longitude
 * @returns Up to MAX_CAMERAS cameras with distanceKm, sorted by priority then distance
 */
export function prioritizeCameras(
  images: LtaTrafficImage[],
  centerLat: number,
  centerLon: number
): TrafficCameraWithDistance[] {
  const withMeta = images.map((camera) => {
    const distanceKm =
      Math.round(
        haversineKm(centerLat, centerLon, camera.Latitude, camera.Longitude) * 10
      ) / 10;
    const priority = MUST_SHOW_CAMERA_IDS.has(camera.CameraID)
      ? 0
      : WEST_FOCUS_CAMERA_IDS.has(camera.CameraID)
        ? 1
        : 2;
    return { ...camera, distanceKm, priority };
  });

  return withMeta
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, MAX_CAMERAS)
    .map(({ priority: _p, ...rest }) => rest as TrafficCameraWithDistance);
}
