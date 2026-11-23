import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { THEMES, type ThemeMeta } from "@/lib/theme";

interface TransitionEventData {
  fromTheme: string;
  toTheme: string;
  x: number;
  y: number;
  radius: number;
  usesViewTransition: boolean;
}

interface EraPillState {
  id: number;
  meta: ThemeMeta;
}

export function ThemeTransitionOverlay() {
  const [activeTransition, setActiveTransition] = useState<TransitionEventData | null>(null);
  const [eraPill, setEraPill] = useState<EraPillState | null>(null);
  const pillTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleStart = (e: Event) => {
      const detail = (e as CustomEvent<TransitionEventData>).detail;
      setActiveTransition(detail);

      const meta = THEMES.find((t) => t.id === detail.toTheme);
      if (meta) {
        if (pillTimerRef.current !== null) {
          window.clearTimeout(pillTimerRef.current);
        }
        setEraPill({ id: Date.now(), meta });
        pillTimerRef.current = window.setTimeout(() => {
          setEraPill(null);
          pillTimerRef.current = null;
        }, 1450);
      }
    };

    const handleEnd = () => {
      setActiveTransition(null);
    };

    window.addEventListener("ive:theme-transition-start", handleStart);
    window.addEventListener("ive:theme-transition-end", handleEnd);

    return () => {
      window.removeEventListener("ive:theme-transition-start", handleStart);
      window.removeEventListener("ive:theme-transition-end", handleEnd);
      if (pillTimerRef.current !== null) {
        window.clearTimeout(pillTimerRef.current);
      }
    };
  }, []);

  const targetThemeMeta = activeTransition
    ? THEMES.find((t) => t.id === activeTransition.toTheme)
    : undefined;
  const primarySwatch = targetThemeMeta?.swatch[1] ?? "oklch(0.68 0.2 300)";
  const accentSwatch = targetThemeMeta?.swatch[2] ?? "oklch(0.8 0.13 200)";

  return (
    <>
      {activeTransition && (
        <div
          key={`${activeTransition.fromTheme}->${activeTransition.toTheme}-${activeTransition.x}-${activeTransition.y}`}
          className="pointer-events-none fixed inset-0 z-[99998] overflow-hidden select-none"
          aria-hidden="true"
        >
          {/* Beat 1: Luminous Tap-Point Ignition Spark */}
          <div
            className={
              activeTransition.usesViewTransition
                ? "pointer-events-none absolute rounded-full"
                : "theme-tap-spark-fallback pointer-events-none absolute rounded-full"
            }
            style={{
              left: `${activeTransition.x - 48}px`,
              top: `${activeTransition.y - 48}px`,
              width: "96px",
              height: "96px",
              viewTransitionName: activeTransition.usesViewTransition ? "theme-spark" : undefined,
              background: `radial-gradient(circle, white 0%, ${primarySwatch} 38%, ${accentSwatch} 65%, transparent 80%)`,
              filter: "blur(6px)",
            }}
          />

          {/* Beat 2a: Leading Razor-Sharp Prism Ring */}
          <div
            className={
              activeTransition.usesViewTransition
                ? "pointer-events-none absolute rounded-full"
                : "theme-shockwave-ring-fallback pointer-events-none absolute rounded-full"
            }
            style={{
              left: `${activeTransition.x - activeTransition.radius}px`,
              top: `${activeTransition.y - activeTransition.radius}px`,
              width: `${activeTransition.radius * 2}px`,
              height: `${activeTransition.radius * 2}px`,
              viewTransitionName: activeTransition.usesViewTransition ? "theme-ring" : undefined,
              border: `2.5px solid color-mix(in oklab, ${primarySwatch} 72%, white)`,
              boxShadow: [
                `0 0 28px 4px ${primarySwatch}`,
                `0 0 12px 2px ${accentSwatch}`,
                `inset 0 0 32px 4px color-mix(in oklab, ${primarySwatch} 62%, transparent)`,
                `inset 0 0 10px 1px color-mix(in oklab, ${accentSwatch} 75%, white)`,
              ].join(", "),
            }}
          />

          {/* Beat 2b: Trailing Diffused Lightstick Aura Wave (+60ms staggered) */}
          <div
            className={
              activeTransition.usesViewTransition
                ? "pointer-events-none absolute rounded-full"
                : "theme-shockwave-aura-fallback pointer-events-none absolute rounded-full"
            }
            style={{
              left: `${activeTransition.x - activeTransition.radius}px`,
              top: `${activeTransition.y - activeTransition.radius}px`,
              width: `${activeTransition.radius * 2}px`,
              height: `${activeTransition.radius * 2}px`,
              viewTransitionName: activeTransition.usesViewTransition ? "theme-aura" : undefined,
              border: `10px solid color-mix(in oklab, ${accentSwatch} 68%, ${primarySwatch})`,
              filter: "blur(12px)",
            }}
          />
        </div>
      )}

      {/* Beat 3: Floating Glass Era Stamp Pill */}
      {eraPill && (
        <div
          key={eraPill.id}
          className="pointer-events-none fixed inset-x-0 top-5 z-[99999] flex justify-center px-4 select-none"
          aria-live="polite"
        >
          <div
            className="era-pill-toast flex items-center gap-2.5 rounded-full border px-4 py-2 backdrop-blur-xl shadow-2xl"
            style={{
              backgroundColor: `color-mix(in oklab, ${eraPill.meta.swatch[0]} 82%, transparent)`,
              borderColor: `color-mix(in oklab, ${eraPill.meta.swatch[1]} 55%, white 20%)`,
              boxShadow: `0 12px 36px -8px ${eraPill.meta.swatch[1]}88`,
            }}
          >
            <span className="flex items-center -space-x-1">
              {eraPill.meta.swatch.slice(1).map((c) => (
                <span
                  key={c}
                  className="h-3.5 w-3.5 rounded-full border border-white/30"
                  style={{ background: c }}
                />
              ))}
            </span>
            <Sparkles size={13} style={{ color: eraPill.meta.swatch[1] }} />
            <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-foreground">
              {eraPill.meta.id === "default" ? eraPill.meta.name : `${eraPill.meta.name} Era`}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
