import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth";
import { subscribeUserDoc, syncUserFields } from "./firestore-user";

/**
 * App preferences backed by localStorage and synced to Firestore (`users/{uid}`)
 * when Firebase is configured.
 */
export interface Settings {
  /** Continue to the next queued track when one finishes. */
  autoplay: boolean;
  /** Restore the last played track (paused) when the app reopens. */
  rememberPlayback: boolean;
  /** Record played songs into the Recently Played history. */
  trackRecentlyPlayed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  autoplay: true,
  rememberPlayback: true,
  trackRecentlyPlayed: true,
};

const STORAGE_KEY = "ive-dive-archive:settings";

interface SettingsContextValue {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function sanitizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return DEFAULT_SETTINGS;
  const obj = raw as Record<string, unknown>;
  return {
    autoplay:
      typeof obj["autoplay"] === "boolean" ? obj["autoplay"] : DEFAULT_SETTINGS.autoplay,
    rememberPlayback:
      typeof obj["rememberPlayback"] === "boolean"
        ? obj["rememberPlayback"]
        : DEFAULT_SETTINGS.rememberPlayback,
    trackRecentlyPlayed:
      typeof obj["trackRecentlyPlayed"] === "boolean"
        ? obj["trackRecentlyPlayed"]
        : DEFAULT_SETTINGS.trackRecentlyPlayed,
  };
}

function writeStorage(next: Settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuth();
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return sanitizeSettings(JSON.parse(raw));
      }
    } catch {
      /* storage unavailable */
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    if (!uid) return;
    return subscribeUserDoc(uid, (data) => {
      if (!data.settings) return;
      const merged = sanitizeSettings(data.settings);
      setSettings(merged);
      writeStorage(merged);
    });
  }, [uid]);

  const setSetting = useCallback<SettingsContextValue["setSetting"]>(
    (key, value) => {
      setSettings((prev) => {
        const nextSettings = { ...prev, [key]: value };
        writeStorage(nextSettings);
        void syncUserFields(uid, { settings: nextSettings });
        return nextSettings;
      });
    },
    [uid],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, setSetting }),
    [settings, setSetting],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
