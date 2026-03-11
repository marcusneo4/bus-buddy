import { env } from "../config/env.js";

export interface WeatherData {
  temperatureC: number;
  rainProbabilityPct: number;
  ambiance: "rain" | "cloudy" | "sunny";
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    precipitation_probability?: number;
    precipitation?: number;
    weather_code: number;
  };
  hourly?: {
    precipitation_probability?: number[];
  };
}

function wmoCodeToAmbiance(
  code: number,
  rainPct: number
): WeatherData["ambiance"] {
  // WMO code families — https://open-meteo.com/en/docs#weathervariables
  const isRain =
    (code >= 61 && code <= 67) || // rain / freezing rain
    (code >= 80 && code <= 82) || // rain showers
    (code >= 95 && code <= 99);   // thunderstorms
  const isSnow = code >= 71 && code <= 77; // snowfall / snow grains

  if (isRain || rainPct >= 50) return "rain";
  // Snow is treated as cloudy — it never occurs in Singapore but keeps the
  // classifier correct for any deployment context.
  if (isSnow || code >= 2 || rainPct >= 20) return "cloudy";
  return "sunny";
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function fetchWeather(): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(env.SINGAPORE_LAT),
    longitude: String(env.SINGAPORE_LON),
    current: "temperature_2m,weather_code,precipitation",
    hourly: "precipitation_probability",
    forecast_hours: "1",
    timezone: "Asia/Singapore",
  });

  const url = `${env.OPEN_METEO_BASE_URL}/forecast?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });

  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OpenMeteoResponse;
  const current = data?.current;
  if (!current || typeof current.temperature_2m !== "number") {
    throw new Error("Weather API returned invalid or missing current data");
  }
  const temperatureC = Math.round(safeNumber(current.temperature_2m));
  const rawRainProbability =
    data.hourly?.precipitation_probability?.[0] ?? current.precipitation_probability ?? 0;
  const rainProbabilityPct = clamp(Math.round(safeNumber(rawRainProbability)), 0, 100);
  const weatherCode = Math.trunc(safeNumber(current.weather_code));
  const ambiance = wmoCodeToAmbiance(
    weatherCode,
    rainProbabilityPct
  );

  return { temperatureC, rainProbabilityPct, ambiance };
}
