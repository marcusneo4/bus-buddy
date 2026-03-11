import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { normalizeServices } from "./normalizeBusArrival.js";
import type { LtaBusArrival } from "../integrations/ltaClient.js";

function makeSlot(minsFromNow: number | null, load = "SEA", type = "SD") {
  const arrival =
    minsFromNow !== null
      ? new Date(Date.now() + minsFromNow * 60_000).toISOString()
      : "";
  return {
    OriginCode: "77009",
    DestinationCode: "77009",
    EstimatedArrival: arrival,
    Monitored: 1,
    Latitude: "0",
    Longitude: "0",
    VisitNumber: "1",
    Load: load as "SEA" | "SDA" | "LSD" | "",
    Feature: "",
    Type: type as "SD" | "DD" | "BD" | "",
  };
}

function makeSvc(
  serviceNo: string,
  mins: [number | null, number | null, number | null]
): LtaBusArrival {
  return {
    ServiceNo: serviceNo,
    Operator: "SBST",
    NextBus: makeSlot(mins[0]),
    NextBus2: makeSlot(mins[1]),
    NextBus3: makeSlot(mins[2]),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-01T08:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("normalizeServices", () => {
  it("computes STAY when bus arrives in > 10 mins with 5-min walk", () => {
    const services = normalizeServices([makeSvc("96", [15, 25, 35])], 5);
    expect(services[0].status).toBe("stay");
    expect(services[0].arrivals).toHaveLength(3);
  });

  it("computes LEAVE when bus is 6 mins away with 5-min walk (1-min buffer)", () => {
    const services = normalizeServices([makeSvc("96", [6, 16, 26])], 5);
    expect(services[0].status).toBe("leave");
  });

  it("computes LEAVE when leaveAt is exactly 0 mins away (boundary)", () => {
    // bus in 5 mins, walk 5 mins → leaveAt is now → LEAVE (0 <= 5)
    const services = normalizeServices([makeSvc("96", [5, 15, 25])], 5);
    expect(services[0].status).toBe("leave");
  });

  it("computes GONE when current time is past leaveAt", () => {
    // bus in 3 mins, walk 5 mins → leaveAt was 2 mins ago
    const services = normalizeServices([makeSvc("96", [3, 13, 23])], 5);
    expect(services[0].status).toBe("gone");
  });

  it("computes null status when no arrival data", () => {
    const services = normalizeServices([makeSvc("96", [null, null, null])], 5);
    expect(services[0].status).toBeNull();
    expect(services[0].arrivals).toHaveLength(0);
  });

  it("maps crowd levels correctly", () => {
    const svc = {
      ...makeSvc("96", [10, 20, 30]),
      NextBus: makeSlot(10, "SEA", "SD"),
      NextBus2: makeSlot(20, "SDA", "DD"),
      NextBus3: makeSlot(30, "LSD", "BD"),
    };
    const services = normalizeServices([svc], 5);
    expect(services[0].arrivals[0].crowdLevel).toBe("seats");
    expect(services[0].arrivals[1].crowdLevel).toBe("standing");
    expect(services[0].arrivals[2].crowdLevel).toBe("full");
  });

  it("maps bus types correctly", () => {
    const svc = {
      ...makeSvc("96", [10, 20, 30]),
      NextBus: makeSlot(10, "SEA", "SD"),
      NextBus2: makeSlot(20, "SEA", "DD"),
      NextBus3: makeSlot(30, "SEA", "BD"),
    };
    const services = normalizeServices([svc], 5);
    expect(services[0].arrivals[0].busType).toBe("single");
    expect(services[0].arrivals[1].busType).toBe("double");
    expect(services[0].arrivals[2].busType).toBe("bendy");
  });

  it("computes minutesAway relative to now", () => {
    const services = normalizeServices([makeSvc("96", [10, 20, 30])], 5);
    expect(services[0].arrivals[0].minutesAway).toBe(10);
    expect(services[0].arrivals[1].minutesAway).toBe(20);
  });

  it("handles zero walk time", () => {
    // bus in 3 mins, walk 0 → leaveAt is now+3mins → STAY (3 > 5? no → LEAVE)
    const services = normalizeServices([makeSvc("96", [3, 10, 20])], 0);
    expect(services[0].status).toBe("leave");
  });

  it("normalizes multiple services", () => {
    const services = normalizeServices(
      [makeSvc("96", [15, 25, 35]), makeSvc("151", [2, 12, 22])],
      5
    );
    expect(services).toHaveLength(2);
    expect(services[0].serviceNo).toBe("96");
    expect(services[1].serviceNo).toBe("151");
    expect(services[1].status).toBe("gone"); // bus in 2 mins, walk 5 mins
  });
});
