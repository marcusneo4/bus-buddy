import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEnrichedServices } from "./useActionStatus";
import type { ServiceData } from "../../lib/apiClient";

const FIXED_NOW = new Date("2024-01-01T08:00:00.000Z").getTime();

function makeService(
  serviceNo: string,
  status: ServiceData["status"],
  leaveAt: string | null = null
): ServiceData {
  return {
    serviceNo,
    operator: "SBST",
    arrivals: [],
    leaveAt,
    status,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useEnrichedServices", () => {
  it("maps stay status to clock emoji and On Time label", () => {
    const { result } = renderHook(() =>
      useEnrichedServices([makeService("96", "stay")], FIXED_NOW)
    );
    expect(result.current[0].statusEmoji).toBe("⏳");
    expect(result.current[0].statusLabel).toBe("On Time");
  });

  it("maps leave status to running emoji and Go Now! label", () => {
    const { result } = renderHook(() =>
      useEnrichedServices([makeService("96", "leave")], FIXED_NOW)
    );
    expect(result.current[0].statusEmoji).toBe("🏃");
    expect(result.current[0].statusLabel).toBe("Go Now!");
  });

  it("maps gone status to wind emoji and Missed label", () => {
    const { result } = renderHook(() =>
      useEnrichedServices([makeService("96", "gone")], FIXED_NOW)
    );
    expect(result.current[0].statusEmoji).toBe("💨");
    expect(result.current[0].statusLabel).toBe("Missed");
  });

  it("formats leaveAt as locale time string (e.g. 4:30 pm)", () => {
    const leaveAt = "2024-01-01T16:30:00+08:00";
    const { result } = renderHook(() =>
      useEnrichedServices([makeService("96", "leave", leaveAt)], FIXED_NOW)
    );
    expect(result.current[0].leaveAtDisplay).toBeTruthy();
    expect(result.current[0].leaveAtDisplay).toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns null leaveAtDisplay when leaveAt is null", () => {
    const { result } = renderHook(() =>
      useEnrichedServices([makeService("96", "stay", null)], FIXED_NOW)
    );
    expect(result.current[0].leaveAtDisplay).toBeNull();
  });

  it("handles null status gracefully", () => {
    const { result } = renderHook(() =>
      useEnrichedServices([makeService("96", null)], FIXED_NOW)
    );
    expect(result.current[0].statusEmoji).toBe("—");
    expect(result.current[0].statusLabel).toBe("—");
  });

  it("returns all services in same order", () => {
    const services = [
      makeService("96", "stay"),
      makeService("151", "leave"),
      makeService("179", "gone"),
    ];
    const { result } = renderHook(() =>
      useEnrichedServices(services, FIXED_NOW)
    );
    expect(result.current.map((s) => s.serviceNo)).toEqual([
      "96",
      "151",
      "179",
    ]);
  });

  it("recomputes minsUntilLeave when now advances", () => {
    // leaveAt is 10 mins from the fixed reference point
    const leaveAt = new Date(FIXED_NOW + 10 * 60_000).toISOString();
    const service = makeService("96", "leave", leaveAt);

    // At t=0: 10 mins remaining
    const { result, rerender } = renderHook(
      ({ now }) => useEnrichedServices([service], now),
      { initialProps: { now: FIXED_NOW } }
    );
    expect(result.current[0].minsUntilLeave).toBe(10);

    // Advance 5 minutes — should show 5 mins remaining without a new API fetch
    rerender({ now: FIXED_NOW + 5 * 60_000 });
    expect(result.current[0].minsUntilLeave).toBe(5);

    // Advance past leaveAt — should show 0 or negative
    rerender({ now: FIXED_NOW + 11 * 60_000 });
    expect(result.current[0].minsUntilLeave).toBe(-1);
  });
});
