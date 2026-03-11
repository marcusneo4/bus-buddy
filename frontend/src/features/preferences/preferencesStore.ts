const STORAGE_KEY = "busBrotherPrefs_v1";

export interface BusStop {
  code: string;
  label: string;
}

export interface Preferences {
  walkTimeMin: number;
  favoriteStops: BusStop[];
  activeStopCode: string;
  pinnedServices: string[];
}

/** Walk time in minutes per stop code. Varsity Park & Opp = 8 min; Opp Kent Ridge = 4 min; Kent Ridge Terminal = 8 min. */
export const WALK_TIME_BY_STOP: Record<string, number> = {
  "17019": 8,  // Varsity Pk
  "17011": 8,  // Opp Varsity Pk
  "16131": 4,  // Opp Kent Ridge Ter
  "16009": 8,  // Kent Ridge Ter
};

export function getWalkTimeForStop(stopCode: string, fallbackMin: number): number {
  return WALK_TIME_BY_STOP[stopCode] ?? fallbackMin;
}

const DEFAULT_PREFERENCES: Preferences = {
  walkTimeMin: 5,
  favoriteStops: [
    { code: "16131", label: "Opp Kent Ridge Ter" },
    { code: "16009", label: "Kent Ridge Ter" },
    { code: "17019", label: "Varsity Pk" },
    { code: "17011", label: "Opp Varsity Pk" },
  ],
  activeStopCode: "16131",
  pinnedServices: [],
};

function load(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function save(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

// Simple observer pattern so components can subscribe to changes
type Listener = (prefs: Preferences) => void;
const listeners = new Set<Listener>();
let current = load();

export const preferencesStore = {
  get(): Preferences {
    return current;
  },

  update(partial: Partial<Preferences>): void {
    current = { ...current, ...partial };
    save(current);
    listeners.forEach((fn) => fn(current));
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  togglePin(serviceNo: string): void {
    const pinned = current.pinnedServices.includes(serviceNo)
      ? current.pinnedServices.filter((s) => s !== serviceNo)
      : [...current.pinnedServices, serviceNo];
    preferencesStore.update({ pinnedServices: pinned });
  },

  reset(): void {
    current = { ...DEFAULT_PREFERENCES };
    save(current);
    listeners.forEach((fn) => fn(current));
  },
};
