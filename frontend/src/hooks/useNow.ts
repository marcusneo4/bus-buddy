import { useState, useEffect } from "react";

/**
 * Returns the current timestamp (ms) and re-renders the consumer at the given
 * interval. Used to keep time-relative displays (countdowns, status badges)
 * accurate between data-fetch cycles.
 */
export function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
