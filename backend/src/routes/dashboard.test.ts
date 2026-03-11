/**
 * Dashboard route tests: validation, happy path, and error handling.
 * Mocks LTA and weather integrations to avoid network calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../server.js";
import type { LtaBusArrival } from "../integrations/ltaClient.js";

vi.mock("../integrations/ltaClient.js", () => ({
  fetchBusArrivals: vi.fn(),
  fetchTrafficIncidents: vi.fn(),
  fetchTrafficImages: vi.fn(),
  fetchTrafficSpeedBands: vi.fn(),
  fetchEstTravelTimes: vi.fn(),
}));

vi.mock("../integrations/weatherClient.js", () => ({
  fetchWeather: vi.fn(),
}));

const mockFetchBusArrivals = vi.mocked(
  (await import("../integrations/ltaClient.js")).fetchBusArrivals
);
const mockFetchWeather = vi.mocked(
  (await import("../integrations/weatherClient.js")).fetchWeather
);

function makeSlot(minsFromNow: number) {
  const arrival = new Date(Date.now() + minsFromNow * 60_000).toISOString();
  return {
    OriginCode: "77009",
    DestinationCode: "77009",
    EstimatedArrival: arrival,
    Monitored: 1,
    Latitude: "0",
    Longitude: "0",
    VisitNumber: "1",
    Load: "SEA" as const,
    Feature: "",
    Type: "SD" as const,
  };
}

function makeBusArrival(serviceNo: string, mins: [number, number, number]): LtaBusArrival {
  return {
    ServiceNo: serviceNo,
    Operator: "SBST",
    NextBus: makeSlot(mins[0]),
    NextBus2: makeSlot(mins[1]),
    NextBus3: makeSlot(mins[2]),
  };
}

const mockBusServices: LtaBusArrival[] = [
  makeBusArrival("96", [10, 22, 35]),
  makeBusArrival("151", [5, 15, 25]),
];

const mockWeather = {
  temperatureC: 30,
  rainProbabilityPct: 20,
  ambiance: "sunny" as const,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-06-15T10:00:00.000Z"));
  mockFetchBusArrivals.mockResolvedValue(mockBusServices);
  mockFetchWeather.mockResolvedValue(mockWeather);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GET /api/dashboard", () => {
  it("returns 400 when stopCode is missing", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .query({ walkTimeMin: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid query parameters");
    expect(res.body.details).toBeDefined();
    expect(mockFetchBusArrivals).not.toHaveBeenCalled();
  });

  it("returns 400 when stopCode is not 5 digits", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .query({ stopCode: "123", walkTimeMin: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid query parameters");
    expect(mockFetchBusArrivals).not.toHaveBeenCalled();
  });

  it("returns 400 when walkTimeMin is out of range", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .query({ stopCode: "16131", walkTimeMin: 99 });

    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it("returns 200 with services when query is valid", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .query({ stopCode: "16131", walkTimeMin: 5 });

    expect(res.status).toBe(200);
    expect(res.body.stopCode).toBe("16131");
    expect(res.body.fetchedAt).toBeDefined();
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services).toHaveLength(2);
    expect(res.body.services[0].serviceNo).toBe("96");
    expect(res.body.services[0].status).toBeDefined();
    expect(res.body.services[0].arrivals).toBeDefined();
    expect(mockFetchBusArrivals).toHaveBeenCalledWith("16131");
  });

  it("defaults walkTimeMin to 5 when omitted", async () => {
    const res = await request(app).get("/api/dashboard").query({ stopCode: "17019" });

    expect(res.status).toBe(200);
    expect(res.body.services).toHaveLength(2);
    expect(mockFetchBusArrivals).toHaveBeenCalledWith("17019");
  });

  it("returns 502 when bus fetch throws", async () => {
    mockFetchBusArrivals.mockRejectedValueOnce(new Error("LTA timeout"));

    const res = await request(app)
      .get("/api/dashboard")
      .query({ stopCode: "11111", walkTimeMin: 5 });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("Bus data temporarily unavailable");
  });
});

describe("GET /api/weather", () => {
  it("returns 502 when weather fetch throws", async () => {
    mockFetchWeather.mockRejectedValueOnce(new Error("Open-Meteo down"));

    const res = await request(app).get("/api/weather");

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("Failed to fetch weather data");
  });

  it("returns 200 with weather when fetch succeeds", async () => {
    const res = await request(app).get("/api/weather");

    expect(res.status).toBe(200);
    expect(res.body.temperatureC).toBe(30);
    expect(res.body.rainProbabilityPct).toBe(20);
    expect(res.body.ambiance).toBe("sunny");
    expect(mockFetchWeather).toHaveBeenCalled();
  });
});
