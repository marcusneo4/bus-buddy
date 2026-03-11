import { useCallback, useEffect, useState } from "react";
import { preferencesStore, type Preferences } from "./preferencesStore";

export function usePreferences(): [
  Preferences,
  (partial: Partial<Preferences>) => void
] {
  const [prefs, setPrefs] = useState<Preferences>(() =>
    preferencesStore.get()
  );

  const updatePreferences = useCallback((partial: Partial<Preferences>) => {
    preferencesStore.update(partial);
  }, []);

  useEffect(() => {
    return preferencesStore.subscribe(setPrefs);
  }, []);

  return [prefs, updatePreferences];
}
