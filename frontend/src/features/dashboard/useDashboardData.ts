import { useState, useEffect, useCallback, useRef } from "react";
import { getDashboard, getWeather } from "../../lib/apiClient";
import type { DashboardResponse, WeatherResponse } from "../../lib/apiClient";

const REFRESH_INTERVAL_MS = 30_000;

export interface DashboardDataState {
  dashboard: DashboardResponse | null;
  weather: WeatherResponse | null;
  loading: boolean;
  error: string | null;
  weatherError: string | null;
  lastUpdated: Date | null;
  isStale: boolean;
  refresh: () => void;
}

export function useDashboardData(
  stopCode: string,
  walkTimeMin: number
): DashboardDataState {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastUpdatedRef = useRef<Date | null>(null);

  useEffect(() => {
    lastUpdatedRef.current = lastUpdated;
  }, [lastUpdated]);

  const fetchAll = useCallback(async () => {
    const hasStop = stopCode.trim().length > 0;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setWeatherError(null);

    try {
      const dashboardPromise = hasStop
        ? getDashboard(stopCode.trim(), walkTimeMin, { signal: controller.signal })
        : Promise.resolve(null);
      const [dash, wx] = await Promise.allSettled([
        dashboardPromise,
        getWeather({ signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;
      let hasSuccessfulFetch = false;

      if (dash.status === "fulfilled") {
        setDashboard(dash.value);
        hasSuccessfulFetch = true;
      } else if (hasStop) {
        setError(
          dash.reason instanceof Error
            ? dash.reason.message
            : "Failed to load bus data"
        );
      }

      if (wx.status === "fulfilled") {
        setWeather(wx.value);
        hasSuccessfulFetch = true;
      } else {
        setWeatherError("Weather temporarily unavailable.");
      }

      if (hasSuccessfulFetch) {
        setLastUpdated(new Date());
        setIsStale(false);
      } else if (lastUpdatedRef.current) {
        setIsStale(true);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [stopCode, walkTimeMin]);

  // Initial fetch and refresh interval
  useEffect(() => {
    void fetchAll();
    const interval = setInterval(() => {
      void fetchAll();
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchAll]);

  // Mark data as stale after 60s without a successful refresh
  useEffect(() => {
    if (!lastUpdated) return;
    const staleTimer = setTimeout(
      () => setIsStale(true),
      REFRESH_INTERVAL_MS * 2
    );
    return () => clearTimeout(staleTimer);
  }, [lastUpdated]);

  return {
    dashboard,
    weather,
    loading,
    error,
    weatherError,
    lastUpdated,
    isStale,
    refresh: fetchAll,
  };
}
