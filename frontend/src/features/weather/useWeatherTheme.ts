import { useMemo } from "react";
import type { WeatherResponse } from "../../lib/apiClient";

export interface WeatherTheme {
  headerBg: string;
  headerText: string;
  icon: string;
  label: string;
}

const THEMES: Record<WeatherResponse["ambiance"], WeatherTheme> = {
  rain: {
    headerBg: "from-blue-950 to-slate-950 border-blue-800/40",
    headerText: "text-blue-300",
    icon: "🌧️",
    label: "Rainy",
  },
  cloudy: {
    headerBg: "from-slate-900 to-zinc-950 border-zinc-800/40",
    headerText: "text-slate-300",
    icon: "☁️",
    label: "Cloudy",
  },
  sunny: {
    headerBg: "from-amber-950 to-zinc-950 border-amber-800/30",
    headerText: "text-amber-300",
    icon: "☀️",
    label: "Sunny",
  },
};

export function useWeatherTheme(
  ambiance: WeatherResponse["ambiance"] | undefined
): WeatherTheme {
  return useMemo(
    () => (ambiance ? THEMES[ambiance] : THEMES.cloudy),
    [ambiance]
  );
}
