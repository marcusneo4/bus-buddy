/**
 * Driving domain tests: haversine, aggregation, camera prioritization.
 */

import { describe, it, expect } from "vitest";
import {
  haversineKm,
  aggregateExpressways,
  aggregateTravelTimes,
  aggregateExpresswaysFromTravelTimes,
  prioritizeCameras,
} from "./driving.js";
import type {
  LtaTrafficSpeedBand,
  LtaEstTravelTime,
  LtaTrafficImage,
} from "../integrations/ltaClient.js";

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(1.3, 103.8, 1.3, 103.8)).toBe(0);
  });

  it("returns positive distance for distinct points", () => {
    const d = haversineKm(1.29, 103.85, 1.35, 103.9);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(15);
  });
});

describe("aggregateExpressways", () => {
  it("returns empty array for empty input", () => {
    expect(aggregateExpressways([])).toEqual([]);
  });

  it("ignores non-expressway RoadCategory", () => {
    const bands: LtaTrafficSpeedBand[] = [
      {
        LinkID: "1",
        RoadName: "Local Rd",
        RoadCategory: "E",
        SpeedBand: 5,
        MinimumSpeed: "40",
        MaximumSpeed: "50",
        StartLon: "103",
        StartLat: "1",
        EndLon: "103",
        EndLat: "1",
      },
    ];
    expect(aggregateExpressways(bands)).toEqual([]);
  });

  it("aggregates by RoadName and returns status and avgBand", () => {
    const bands: LtaTrafficSpeedBand[] = [
      {
        LinkID: "1",
        RoadName: "PIE",
        RoadCategory: "A",
        SpeedBand: 1,
        MinimumSpeed: "0",
        MaximumSpeed: "10",
        StartLon: "103",
        StartLat: "1",
        EndLon: "103",
        EndLat: "1",
      },
      {
        LinkID: "2",
        RoadName: "PIE",
        RoadCategory: "A",
        SpeedBand: 2,
        MinimumSpeed: "10",
        MaximumSpeed: "20",
        StartLon: "103",
        StartLat: "1",
        EndLon: "103",
        EndLat: "1",
      },
    ];
    const result = aggregateExpressways(bands);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("PIE");
    expect(result[0].status).toBe("jammed");
    expect(result[0].avgBand).toBeGreaterThanOrEqual(1);
    expect(result[0].avgBand).toBeLessThanOrEqual(8);
  });
});

describe("aggregateTravelTimes", () => {
  it("returns empty array for empty input", () => {
    expect(aggregateTravelTimes([])).toEqual([]);
  });

  it("aggregates by Name|Direction and sums EstTime", () => {
    const times: LtaEstTravelTime[] = [
      {
        Name: "PIE",
        Direction: 1,
        FarEndPoint: "End",
        StartPoint: "A",
        EndPoint: "B",
        EstTime: 10,
      },
      {
        Name: "PIE",
        Direction: 1,
        FarEndPoint: "End",
        StartPoint: "B",
        EndPoint: "C",
        EstTime: 5,
      },
    ];
    const result = aggregateTravelTimes(times);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("PIE");
    expect(result[0].totalMinutes).toBe(15);
    expect(result[0].segments).toHaveLength(2);
  });
});

describe("aggregateExpresswaysFromTravelTimes", () => {
  it("returns empty array for empty input", () => {
    expect(aggregateExpresswaysFromTravelTimes([])).toEqual([]);
  });

  it("returns expressway summaries with status", () => {
    const times: LtaEstTravelTime[] = [
      { Name: "AYE", Direction: 1, FarEndPoint: "X", StartPoint: "A", EndPoint: "B", EstTime: 50 },
    ];
    const result = aggregateExpresswaysFromTravelTimes(times);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const aye = result.find((r) => r.name === "AYE");
    expect(aye).toBeDefined();
    expect(aye!.status).toBe("jammed");
  });
});

describe("prioritizeCameras", () => {
  const centerLat = 1.2966;
  const centerLon = 103.7764;

  it("returns empty array for empty input", () => {
    expect(prioritizeCameras([], centerLat, centerLon)).toEqual([]);
  });

  it("includes distanceKm on each camera", () => {
    const images: LtaTrafficImage[] = [
      {
        CameraID: "9999",
        Latitude: centerLat + 0.01,
        Longitude: centerLon,
        ImageLink: "https://example.com/img.jpg",
      },
    ];
    const result = prioritizeCameras(images, centerLat, centerLon);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("distanceKm");
    expect(typeof result[0].distanceKm).toBe("number");
  });

  it("returns at most 25 cameras", () => {
    const images: LtaTrafficImage[] = Array.from({ length: 50 }, (_, i) => ({
      CameraID: String(1000 + i),
      Latitude: centerLat + (i * 0.001),
      Longitude: centerLon,
      ImageLink: "https://example.com/img.jpg",
    }));
    const result = prioritizeCameras(images, centerLat, centerLon);
    expect(result.length).toBeLessThanOrEqual(25);
  });
});
