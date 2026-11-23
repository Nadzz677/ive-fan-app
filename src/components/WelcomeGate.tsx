import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft, ArrowRight, Disc3, Palette, Rocket, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStagedCatalog } from "@/lib/catalog";
import { THEMES } from "@/lib/theme";
import { getAlbumArtwork, getMemberImage } from "@/data/imageAssets";
import { ArtworkImage } from "./ArtworkImage";
import { AdminStudioView } from "./AdminStudioView";
import { cn } from "@/lib/utils";

const SLIDE_COUNT = 4;

export function WelcomeGate({ children }: { children: React.ReactNode }) {
  const {
    hasCompletedOnboarding,
    completeOnboarding,
    isPreviewingFanApp,
    setPreviewingFanApp,
  } = useAuth();
  const { pendingCount } = useStagedCatalog();
  const isNative = Capacitor.isNativePlatform();

  const [slide, setSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // 1. Desktop Browser (`npm run dev`): Defaults straight into Admin Studio,
  //    with a one-click "Preview Fan App" mode to inspect staged changes in the live UI!
  if (!isNative) {
    if (!isPreviewingFanApp) {
      return <AdminStudioView />;
    }

    return (
      <>
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-[#0d1017]/95 px-5 py-2.5 text-slate-100 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-200">
              Fan App Live Preview
            </span>
            {pendingCount > 0 && (
              <span className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                {pendingCount} Staged Draft{pendingCount === 1 ? "" : "s"} Applied
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPreviewingFanApp(false)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            <ArrowLeft size={13} />
            Return to Admin Console
            {pendingCount > 0 && <Rocket size={12} />}
          </button>
        </div>
        {children}
      </>
    );
  }

  // 2. Mobile / Android Fan App: Open access (no registration wall).
  //    First-time users see the 4-slide swipe intro and go straight to Home!
  if (hasCompletedOnboarding) {
    return <>{children}</>;
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) touchStartX.current = touch.clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const delta = touch.clientX - touchStartX.current;
    touchStartX.current = null;

    if (delta < -45) {
      if (slide < SLIDE_COUNT - 1) setSlide((s) => s + 1);
      else completeOnboarding();
    } else if (delta > 45 && slide > 0) {
      setSlide((s) => s - 1);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="stage-gradient relative flex min-h-screen flex-col justify-between overflow-hidden px-6 pb-10 pt-8"
    >
      {/* Top Bar: Progress Index + Skip */}
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">
          0{slide + 1} // 0{SLIDE_COUNT}
        </span>
        <button
          type="button"
          onClick={completeOnboarding}
          className="press font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </div>

      {/* Slide Stage */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-6 text-center">
        {slide === 0 && (
          <div key="slide-0" className="fade-up flex flex-col items-center">
            <div className="relative grid h-36 w-36 place-items-center rounded-full border border-primary/40 bg-primary/10 shadow-[var(--shadow-glow)]">
              <Sparkles size={42} className="text-primary" />
            </div>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
              WELCOME TO THE ARCHIVE
            </p>
            <h1 className="font-editorial mt-2 text-5xl font-semibold leading-[0.98]">
              IVE <span className="gradient-accent-text italic font-medium">Dive Archive</span>
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A luxury editorial companion dedicated to IVE&apos;s eras, music, and six iconic
              members.
            </p>
          </div>
        )}

        {slide === 1 && (
          <div key="slide-1" className="fade-up flex flex-col items-center">
            <div className="flex items-center justify-center -space-x-5">
              {["yujin", "wonyoung", "rei"].map((id, idx) => (
                <div
                  key={id}
                  className={cn(
                    "h-40 w-28 overflow-hidden rounded-2xl border border-white/20 bg-surface shadow-2xl",
                    idx === 0 && "-rotate-6",
                    idx === 1 && "z-10 scale-105 ring-2 ring-primary/60",
                    idx === 2 && "rotate-6",
                  )}
                >
                  <ArtworkImage
                    src={getMemberImage(id)}
                    alt={id}
                    kind="member"
                    className="object-top"
                  />
                </div>
              ))}
            </div>
            <p className="mt-8 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
              <Users size={12} /> COLLECTIBLE PHOTOCARDS
            </p>
            <h2 className="font-editorial mt-2 text-4xl font-semibold leading-tight">
              Six Editorial Dossiers
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Explore member photocards, journeys, birthday countdowns, and official solo
              spotlights.
            </p>
          </div>
        )}

        {slide === 2 && (
          <div key="slide-2" className="fade-up flex flex-col items-center">
            <div className="relative flex items-center justify-center -space-x-6">
              {["revive-plus", "ive-switch", "ive-secret"].map((id, idx) => (
                <div
                  key={id}
                  className={cn(
                    "h-32 w-32 overflow-hidden rounded-2xl border border-white/15 bg-surface shadow-2xl",
                    idx === 0 && "-rotate-6",
                    idx === 1 && "z-10 scale-110 shadow-[var(--shadow-glow)]",
                    idx === 2 && "rotate-6",
                  )}
                >
                  <ArtworkImage src={getAlbumArtwork(id)} alt={id} kind="album" />
                </div>
              ))}
            </div>
            <p className="mt-9 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
              <Disc3 size={12} /> COMPLETE DISCOGRAPHY
            </p>
            <h2 className="font-editorial mt-2 text-4xl font-semibold leading-tight">
              Every Era, Every Track
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Browse 2021–2026 Korean, Japanese, and global releases with our glowing aura player
              and lyrics viewer.
            </p>
          </div>
        )}

        {slide === 3 && (
          <div key="slide-3" className="fade-up flex flex-col items-center">
            <div className="flex flex-wrap justify-center gap-3 max-w-[260px]">
              {THEMES.slice(1, 7).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-1.5 rounded-full border border-glass-border bg-surface/75 px-3 py-1.5"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ background: t.swatch[1] }}
                  />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-foreground">
                    {t.name}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-8 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
              <Palette size={12} /> {THEMES.length} LIVING ERA THEMES
            </p>
            <h2 className="font-editorial mt-2 text-4xl font-semibold leading-tight">
              Recolor Your World
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Switch between official album-matched color palettes with our 3-beat Prism Depth
              Bloom animation.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Controls: Dots + Next / Enter Archive */}
      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                slide === i ? "w-7 bg-primary" : "w-1.5 bg-foreground/25",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            if (slide < SLIDE_COUNT - 1) setSlide((s) => s + 1);
            else completeOnboarding();
          }}
          className="press inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground glow"
        >
          {slide < SLIDE_COUNT - 1 ? "Next" : "Enter the Archive"} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
