import { DEFAULT_TILE_KEYS } from "@/lib/quick-filter-tiles";
import { DEFAULT_DASHBOARD_CATEGORIES } from "@/lib/meal-type-sections";

export type ThemeMode = "light" | "dark" | "system";

export type AccentPreset = {
  id: string;
  name: string;
  color: string;
  foreground: string;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "amber", name: "ענבר", color: "#e8823a", foreground: "#14110b" },
  { id: "rose", name: "אדום־ורוד", color: "#e0567a", foreground: "#1a0a10" },
  { id: "teal", name: "טורקיז", color: "#2fb8a6", foreground: "#04201c" },
  { id: "violet", name: "סגול", color: "#8b6ce0", foreground: "#12081f" },
  { id: "blue", name: "כחול", color: "#4d8fe0", foreground: "#04101f" },
  { id: "green", name: "ירוק", color: "#5bb85c", foreground: "#06170a" },
];

// The dashboard's owner-filter row ("הכול" / a specific member) each get
// their own independent category order — "all" is the scope key for the
// unfiltered view; a family member's user_id is the scope key for their
// filtered view.
export const DASHBOARD_ALL_SCOPE = "all";

export type AppSettings = {
  theme: ThemeMode;
  accentId: string;
  defaultUnitSystem: "imperial" | "metric";
  keepScreenAwake: boolean;
  timerSoundEnabled: boolean;
  quickFilterTileKeys: string[];
  // Ordered list of dietary_tags shown as their own section (heading + up
  // to 9 recipes, scrollable for more) on the main recipes page, keyed by
  // dashboard owner-filter scope (DASHBOARD_ALL_SCOPE or a member's
  // user_id) so "הכול" and each family member keep their own separate
  // order — a per-device preference, same as quickFilterTileKeys above.
  dashboardCategoryTagsByOwner: Record<string, string[]>;
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  accentId: "rose",
  defaultUnitSystem: "metric",
  quickFilterTileKeys: DEFAULT_TILE_KEYS,
  dashboardCategoryTagsByOwner: {},
  keepScreenAwake: true,
  timerSoundEnabled: true,
};

/** The category order for a given dashboard scope, falling back to the
 * shared defaults the first time that scope is viewed. */
export function getDashboardCategories(settings: AppSettings, scopeKey: string): string[] {
  return settings.dashboardCategoryTagsByOwner[scopeKey] ?? DEFAULT_DASHBOARD_CATEGORIES;
}

export const SETTINGS_STORAGE_KEY = "recipe-app:settings";

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings> & { dashboardCategoryTags?: string[] };
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    // One-time migration from the old single, unscoped category list (before
    // "הכול" and each family member had their own order) into the "all" scope.
    if (parsed.dashboardCategoryTags && !parsed.dashboardCategoryTagsByOwner) {
      merged.dashboardCategoryTagsByOwner = {
        ...merged.dashboardCategoryTagsByOwner,
        [DASHBOARD_ALL_SCOPE]: parsed.dashboardCategoryTags,
      };
    }
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let current: AppSettings = loadSettings();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(current));
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSettings(): AppSettings {
  return current;
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  current = { ...current, [key]: value };
  persist();
  notify();
  if (key === "theme" || key === "accentId") applyThemeAndAccent(current);
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resolveThemeClass(theme: ThemeMode): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyThemeAndAccent(settings: AppSettings) {
  if (typeof document === "undefined") return;

  const resolved = resolveThemeClass(settings.theme);
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;

  const preset = ACCENT_PRESETS.find((p) => p.id === settings.accentId) ?? ACCENT_PRESETS[0];
  root.style.setProperty("--accent", preset.color);
  root.style.setProperty("--accent-foreground", preset.foreground);
}

/** Inline, blocking script (as a string) — sets theme class + color-scheme
 * before first paint, so there's no flash of the wrong theme. Accent color
 * is applied slightly later, by React, since a brief accent-only flash is
 * far less jarring than a full light/dark flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(
  SETTINGS_STORAGE_KEY,
)});var s=raw?JSON.parse(raw):{};var theme=s.theme||"light";var resolved=theme==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):theme;var root=document.documentElement;root.classList.remove("light","dark");root.classList.add(resolved);root.style.colorScheme=resolved;}catch(e){}})();`;
