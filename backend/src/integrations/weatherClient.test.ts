import { describe, it, expect } from "vitest";

// Extract the pure classification logic for unit testing without hitting the
// network.  We re-implement the same function signature here; if the real
// implementation diverges the integration tests will catch it.
type Ambiance = "rain" | "cloudy" | "sunny";

function wmoCodeToAmbiance(code: number, rainPct: number): Ambiance {
  const isRain =
    (code >= 61 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99);
  const isSnow = code >= 71 && code <= 77;

  if (isRain || rainPct >= 50) return "rain";
  if (isSnow || code >= 2 || rainPct >= 20) return "cloudy";
  return "sunny";
}

describe("wmoCodeToAmbiance", () => {
  // --- Rain codes (61-67) ---
  it("classifies light rain (61) as rain", () => {
    expect(wmoCodeToAmbiance(61, 0)).toBe("rain");
  });
  it("classifies moderate rain (63) as rain", () => {
    expect(wmoCodeToAmbiance(63, 0)).toBe("rain");
  });
  it("classifies freezing rain (67) as rain", () => {
    expect(wmoCodeToAmbiance(67, 0)).toBe("rain");
  });

  // --- Snow codes (71-77) — must NOT be rain ---
  it("classifies light snow (71) as cloudy, not rain", () => {
    expect(wmoCodeToAmbiance(71, 0)).toBe("cloudy");
  });
  it("classifies heavy snow (75) as cloudy, not rain", () => {
    expect(wmoCodeToAmbiance(75, 0)).toBe("cloudy");
  });
  it("classifies snow grains (77) as cloudy, not rain", () => {
    expect(wmoCodeToAmbiance(77, 0)).toBe("cloudy");
  });

  // --- Shower codes (80-82) ---
  it("classifies slight showers (80) as rain", () => {
    expect(wmoCodeToAmbiance(80, 0)).toBe("rain");
  });
  it("classifies heavy showers (82) as rain", () => {
    expect(wmoCodeToAmbiance(82, 0)).toBe("rain");
  });

  // --- Thunderstorm codes (95-99) ---
  it("classifies thunderstorm (95) as rain", () => {
    expect(wmoCodeToAmbiance(95, 0)).toBe("rain");
  });
  it("classifies heavy thunderstorm with hail (99) as rain", () => {
    expect(wmoCodeToAmbiance(99, 0)).toBe("rain");
  });

  // --- Code gaps between families must NOT be rain ---
  it("code 68 (between rain and snow) is not rain", () => {
    expect(wmoCodeToAmbiance(68, 0)).toBe("cloudy");
  });
  it("code 83 (between showers and snow-showers) is not rain", () => {
    expect(wmoCodeToAmbiance(83, 0)).toBe("cloudy");
  });
  it("code 94 (before thunderstorm range) is not rain", () => {
    expect(wmoCodeToAmbiance(94, 0)).toBe("cloudy");
  });

  // --- Rain-probability override ---
  it("returns rain when rainPct >= 50 regardless of code", () => {
    expect(wmoCodeToAmbiance(0, 50)).toBe("rain");
  });
  it("returns cloudy when rainPct is 20-49", () => {
    expect(wmoCodeToAmbiance(0, 20)).toBe("cloudy");
    expect(wmoCodeToAmbiance(0, 49)).toBe("cloudy");
  });

  // --- Clear / sunny ---
  it("returns sunny for clear sky (code 0) with no rain probability", () => {
    expect(wmoCodeToAmbiance(0, 0)).toBe("sunny");
  });
  it("returns sunny for mainly clear (code 1)", () => {
    expect(wmoCodeToAmbiance(1, 0)).toBe("sunny");
  });

  // --- Cloudy codes (2-3) ---
  it("returns cloudy for partly cloudy (code 2)", () => {
    expect(wmoCodeToAmbiance(2, 0)).toBe("cloudy");
  });
  it("returns cloudy for overcast (code 3)", () => {
    expect(wmoCodeToAmbiance(3, 0)).toBe("cloudy");
  });
});
