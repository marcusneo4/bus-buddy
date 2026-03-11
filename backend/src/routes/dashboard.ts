/**
 * Dashboard API routes: bus arrivals, weather, driving (traffic) data.
 * Validates input, delegates to integrations/domain, returns JSON.
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  fetchBusArrivals,
  fetchTrafficIncidents,
  fetchTrafficImages,
  fetchTrafficSpeedBands,
  fetchEstTravelTimes,
} from "../integrations/ltaClient.js";
import { fetchWeather } from "../integrations/weatherClient.js";
import { normalizeServices } from "../domain/normalizeBusArrival.js";
import {
  aggregateExpressways,
  aggregateExpresswaysFromTravelTimes,
  aggregateTravelTimes,
  prioritizeCameras,
} from "../domain/driving.js";
import { TtlCache } from "../lib/cache.js";
import { env } from "../config/env.js";

const ROUTE_TAG = "[DashboardRoutes]";
const router = Router();
const cache = new TtlCache(env.CACHE_TTL_MS);

const DRIVING_CACHE_TTL_MS = 60_000;
const WEATHER_CACHE_TTL_MS = 5 * 60_000;
const WEATHER_CACHE_KEY = "weather:singapore";

/** Wraps async route handlers so rejections are passed to central error middleware. */
function wrapAsync(
  fn: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

const dashboardQuerySchema = z.object({
  stopCode: z.string().trim().regex(/^\d{5}$/, "stopCode must be a 5-digit code"),
  walkTimeMin: z.coerce.number().min(0).max(60).default(5),
});

router.get(
  "/dashboard",
  wrapAsync(async (req: Request, res: Response) => {
    const parsed = dashboardQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid query parameters",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { stopCode, walkTimeMin } = parsed.data;
    const cacheKey = `dashboard:${stopCode}`;

    try {
      const rawServices = await cache.getOrLoad(cacheKey, () =>
        fetchBusArrivals(stopCode)
      );
      const services = normalizeServices(rawServices, walkTimeMin);

      res.json({
        stopCode,
        fetchedAt: new Date().toISOString(),
        services,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${ROUTE_TAG} /api/dashboard failed:`, message);
      res.status(502).json({ error: "Bus data temporarily unavailable" });
    }
  })
);

router.get(
  "/weather",
  wrapAsync(async (_req: Request, res: Response) => {
    try {
      const weather = await cache.getOrLoad(
        WEATHER_CACHE_KEY,
        () => fetchWeather(),
        WEATHER_CACHE_TTL_MS
      );
      res.json(weather);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${ROUTE_TAG} /api/weather failed:`, message);
      res.status(502).json({ error: "Failed to fetch weather data" });
    }
  })
);

router.get(
  "/driving",
  wrapAsync(async (_req: Request, res: Response) => {
    try {
      const [incidentsResult, imagesResult, speedBandsResult, travelTimesResult] =
        await Promise.allSettled([
          cache.getOrLoad("driving:incidents", () => fetchTrafficIncidents(), DRIVING_CACHE_TTL_MS),
          cache.getOrLoad("driving:images", () => fetchTrafficImages(), DRIVING_CACHE_TTL_MS),
          cache.getOrLoad("driving:speedbands", () => fetchTrafficSpeedBands(), DRIVING_CACHE_TTL_MS),
          cache.getOrLoad("driving:traveltimes", () => fetchEstTravelTimes(), DRIVING_CACHE_TTL_MS),
        ]);

      if (incidentsResult.status === "rejected") {
        console.warn(
          `${ROUTE_TAG} incidents fetch failed:`,
          incidentsResult.reason?.message ?? incidentsResult.reason
        );
      }
      if (imagesResult.status === "rejected") {
        console.warn(
          `${ROUTE_TAG} images fetch failed:`,
          imagesResult.reason?.message ?? imagesResult.reason
        );
      }
      if (speedBandsResult.status === "rejected") {
        console.warn(
          `${ROUTE_TAG} speed bands fetch failed:`,
          speedBandsResult.reason?.message ?? speedBandsResult.reason
        );
      }
      if (travelTimesResult.status === "rejected") {
        console.warn(
          `${ROUTE_TAG} travel times fetch failed:`,
          travelTimesResult.reason?.message ?? travelTimesResult.reason
        );
      }

      const incidents = incidentsResult.status === "fulfilled" ? incidentsResult.value : [];
      const allImages = imagesResult.status === "fulfilled" ? imagesResult.value : [];
      const speedBands = speedBandsResult.status === "fulfilled" ? speedBandsResult.value : [];
      const travelTimes = travelTimesResult.status === "fulfilled" ? travelTimesResult.value : [];

      if (speedBands.length === 0 && speedBandsResult.status === "fulfilled") {
        console.warn(
          `${ROUTE_TAG} speed bands API returned empty; check DataMall subscription for Traffic Speed Bands.`
        );
      }

      const cameras = prioritizeCameras(
        allImages,
        env.SINGAPORE_LAT,
        env.SINGAPORE_LON
      );

      let expressways = aggregateExpressways(speedBands);
      if (expressways.length === 0) {
        expressways = aggregateExpresswaysFromTravelTimes(travelTimes);
      }

      const aggregatedTravelTimes = aggregateTravelTimes(travelTimes);

      res.json({
        fetchedAt: new Date().toISOString(),
        incidents,
        cameras,
        expressways,
        travelTimes: aggregatedTravelTimes,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${ROUTE_TAG} /api/driving failed:`, message);
      res.status(502).json({ error: "Driving data temporarily unavailable" });
    }
  })
);

export default router;
