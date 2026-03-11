import { useState, useEffect, useCallback, useRef } from "react";
import { getDriving, type DrivingResponse } from "../../lib/apiClient";

const POLL_INTERVAL_MS = 60_000; // refresh every 60 seconds
const STALE_AFTER_MS = 120_000;  // mark stale after 2 minutes

export function useDrivingData() {
  const [data, setData] = useState<DrivingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetch = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await getDriving({ signal: controller.signal });
      if (controller.signal.aborted) return;

      setData(result);
      setError(null);
      setLastUpdated(new Date());
      setIsStale(false);

      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      staleTimerRef.current = setTimeout(() => setIsStale(true), STALE_AFTER_MS);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to fetch driving data");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
    const interval = setInterval(() => void fetch(), POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, [fetch]);

  return { data, loading, error, lastUpdated, isStale, refresh: fetch };
}
