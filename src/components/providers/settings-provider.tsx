"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  applyThemeAndAccent,
  getSettings,
  setSetting,
  subscribeSettings,
  type AppSettings,
} from "@/lib/settings-store";

export function useSettings(): [AppSettings, typeof setSetting] {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettings,
    getSettings,
  );
  return [settings, setSetting];
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings] = useSettings();

  // Keep the theme in sync with OS changes when "system" is selected, and
  // apply the accent color on mount (the blocking init script only handles
  // the theme class, to keep it tiny).
  useEffect(() => {
    applyThemeAndAccent(settings);

    if (settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeAndAccent(getSettings());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings]);

  return <>{children}</>;
}
