import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useAuth } from "./auth";
import { subscribeUserDoc, syncUserFields } from "./firestore-user";

/**
 * Album-based theme system.
 *
 * Every theme is just a set of overrides for the semantic design tokens declared
 * in src/styles.css under `[data-theme="..."]`. Components never hardcode colors:
 * they use the tokens (bg-primary, glass-panel, --gradient-accent, ...), so adding
 * a new album theme means adding one CSS block plus one entry in THEMES.
 */
export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  /** Preview swatch colors — CSS color strings, only used by the settings UI. */
  swatch: [string, string, string];
}

export interface ThemeTransitionOrigin {
  x: number;
  y: number;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "default",
    name: "Dive Archive",
    description: "The original midnight-violet stage palette.",
    swatch: ["oklch(0.14 0.035 292)", "oklch(0.68 0.2 300)", "oklch(0.8 0.13 200)"],
  },
  {
    id: "looks-can-kill",
    name: "Looks Can Kill",
    description: "Pop-art hero crimson with electric comic blue.",
    swatch: ["oklch(0.12 0.025 255)", "oklch(0.64 0.23 22)", "oklch(0.72 0.17 248)"],
  },
  {
    id: "lucid-dream",
    name: "LUCID DREAM",
    description: "Dreamy pastel cloud pink with sky-cyan glow.",
    swatch: ["oklch(0.14 0.032 330)", "oklch(0.8 0.13 345)", "oklch(0.83 0.11 205)"],
  },
  {
    id: "revive-plus",
    name: "REVIVE+",
    description: "Deep cobalt navy with crisp ice-white typography.",
    swatch: ["oklch(0.12 0.05 262)", "oklch(0.64 0.19 258)", "oklch(0.93 0.02 250)"],
  },
  {
    id: "ive-secret",
    name: "IVE SECRET",
    description: "Baby sky-blue with neon orchid-pink stars & white.",
    swatch: ["oklch(0.13 0.04 246)", "oklch(0.76 0.13 240)", "oklch(0.72 0.21 318)"],
  },
  {
    id: "ive-empathy",
    name: "IVE EMPATHY",
    description: "Warm charcoal-rose with heart crimson & blush.",
    swatch: ["oklch(0.13 0.024 12)", "oklch(0.64 0.21 18)", "oklch(0.82 0.1 355)"],
  },
  {
    id: "ive-switch",
    name: "IVE SWITCH",
    description: "Iridescent mint-aqua, sky blue & pastel pink.",
    swatch: ["oklch(0.13 0.036 196)", "oklch(0.78 0.14 176)", "oklch(0.79 0.15 342)"],
  },
  {
    id: "ive-mine",
    name: "I'VE MINE",
    description: "Dark cherry wine with bold rose-magenta & white.",
    swatch: ["oklch(0.12 0.026 355)", "oklch(0.68 0.21 345)", "oklch(0.92 0.025 350)"],
  },
  {
    id: "after-like",
    name: "After LIKE",
    description: "Iconic saturated green with RGB disco blue.",
    swatch: ["oklch(0.12 0.032 148)", "oklch(0.74 0.2 144)", "oklch(0.72 0.17 252)"],
  },
  {
    id: "love-dive",
    name: "LOVE DIVE",
    description: "Dreamy powder-sky blue with pure pearl white.",
    swatch: ["oklch(0.13 0.038 238)", "oklch(0.77 0.12 232)", "oklch(0.94 0.015 235)"],
  },
  {
    id: "eleven",
    name: "ELEVEN",
    description: "Debut ruby-magenta blending into sunset coral-orange.",
    swatch: ["oklch(0.12 0.036 350)", "oklch(0.64 0.24 352)", "oklch(0.72 0.19 36)"],
  },
];

export const isThemeId = (value: string) => THEMES.some((t) => t.id === value);

const STORAGE_KEY = "ive-dive-archive:theme";
const DEFAULT_THEME = "default";

interface ThemeContextValue {
  theme: string;
  setTheme: (id: string, origin?: ThemeTransitionOrigin) => void;
  themes: ThemeMeta[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STATUS_BAR_HEX: Record<string, string> = {
  default: "#1a1326",
  "looks-can-kill": "#121521",
  "lucid-dream": "#1f141e",
  "revive-plus": "#0c152e",
  "ive-secret": "#0f1829",
  "ive-empathy": "#1e1214",
  "ive-switch": "#0d1d22",
  "ive-mine": "#1c1116",
  "after-like": "#0d1b12",
  "love-dive": "#0e1726",
  eleven: "#1e0f17",
};

function apply(id: string) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["theme"] = id;

  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    const color = THEME_STATUS_BAR_HEX[id] ?? "#1a1326";
    void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    void StatusBar.setBackgroundColor({ color }).catch(() => {});
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuth();
  const [theme, setThemeState] = useState(() => {
    let stored = DEFAULT_THEME;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw && isThemeId(raw)) stored = raw;
      } catch {
        /* storage unavailable */
      }
    }
    apply(stored);
    return stored;
  });

  useEffect(() => {
    if (!uid) return;
    return subscribeUserDoc(uid, (data) => {
      if (!data.theme || !isThemeId(data.theme)) return;
      setThemeState(data.theme);
      apply(data.theme);
      try {
        window.localStorage.setItem(STORAGE_KEY, data.theme);
      } catch {
        /* storage unavailable */
      }
    });
  }, [uid]);

  const setTheme = useCallback(
    (id: string, origin?: ThemeTransitionOrigin) => {
      if (!isThemeId(id) || id === theme) return;

      const previousTheme = theme;
      const isReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const commitTheme = () => {
        setThemeState(id);
        apply(id);
        try {
          window.localStorage.setItem(STORAGE_KEY, id);
        } catch {
          /* storage unavailable */
        }
        void syncUserFields(uid, { theme: id });
      };

      if (isReducedMotion || typeof window === "undefined" || typeof document === "undefined") {
        commitTheme();
        return;
      }

      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }

      const x = origin ? origin.x : window.innerWidth / 2;
      const y = origin ? origin.y : window.innerHeight / 2;
      const radius = Math.ceil(
        Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)),
      );

      document.documentElement.style.setProperty("--theme-origin-x", `${x}px`);
      document.documentElement.style.setProperty("--theme-origin-y", `${y}px`);
      document.documentElement.style.setProperty("--theme-radius", `${radius}px`);

      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };

      const dispatchStart = (usesViewTransition: boolean) => {
        window.dispatchEvent(
          new CustomEvent("ive:theme-transition-start", {
            detail: { fromTheme: previousTheme, toTheme: id, x, y, radius, usesViewTransition },
          }),
        );
      };

      const dispatchEnd = () => {
        window.dispatchEvent(new CustomEvent("ive:theme-transition-end"));
      };

      if (typeof doc.startViewTransition === "function") {
        const transition = doc.startViewTransition(() => {
          flushSync(() => {
            dispatchStart(true);
            commitTheme();
          });
        });

        transition.finished
          .catch(() => {})
          .finally(() => {
            dispatchEnd();
          });
      } else {
        dispatchStart(false);
        commitTheme();
        window.setTimeout(dispatchEnd, 640);
      }
    },
    [theme, uid],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, themes: THEMES }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
