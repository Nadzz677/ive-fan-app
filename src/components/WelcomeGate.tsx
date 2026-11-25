import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft, ArrowRight, Disc3, Palette, Rocket, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DEFAULT_HERO_IMAGES, useCatalog, useStagedCatalog } from "@/lib/catalog";
import { THEMES } from "@/lib/theme";
import { getAlbumArtwork, getMemberImage } from "@/data/imageAssets";
import { ArtworkImage } from "./ArtworkImage";
import { AdminStudioView } from "./AdminStudioView";
import { cn } from "@/lib/utils";

const SLIDE_COUNT = 4;

/**
 * Returns the shortest signed circular distance (`-N/2 .. +N/2`) from `activeIdx` to `itemIdx`.
 */
function getCircularOffset(itemIdx: number, activeIdx: number, total: number): number {
  if (total <= 0) return 0;
  let diff = itemIdx - activeIdx;
  const half = Math.floor(total / 2);
  while (diff > half) diff -= total;
  while (diff < -half) diff += total;
  return diff;
}

export function WelcomeGate({ children }: { children: React.ReactNode }) {
  const {
    hasCompletedOnboarding,
    completeOnboarding,
    replayOnboarding,
    isPreviewingFanApp,
    setPreviewingFanApp,
  } = useAuth();
  const { albums, members, config } = useCatalog();
  const { pendingCount } = useStagedCatalog();
  const isNative = Capacitor.isNativePlatform();

  const [slide, setSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Continuous rotation indices for Slides 2, 3, and 4
  const [memberRotIdx, setMemberRotIdx] = useState(0);
  const [albumRotIdx, setAlbumRotIdx] = useState(0);
  const [themeRotIdx, setThemeRotIdx] = useState(0);

  const welcomeCoverUrl = useMemo(() => {
    return (
      config.welcomeImage?.trim() ||
      config.heroImages?.[0]?.trim() ||
      DEFAULT_HERO_IMAGES[0] ||
      ""
    );
  }, [config.welcomeImage, config.heroImages]);

  const rotatingAlbums = useMemo(() => {
    const withCovers = albums.filter((a) => Boolean(a.cover?.trim() || getAlbumArtwork(a.id)));
    return withCovers.length > 0 ? withCovers : albums;
  }, [albums]);

  // Keep continuous rotation timers running so every Welcome Tour page feels alive & dynamic
  useEffect(() => {
    if (isNative && hasCompletedOnboarding) return;
    const memberTimer = window.setInterval(() => {
      setMemberRotIdx((prev) => (prev + 1) % Math.max(1, members.length));
    }, 2100);
    const albumTimer = window.setInterval(() => {
      setAlbumRotIdx((prev) => (prev + 1) % Math.max(1, rotatingAlbums.length));
    }, 1900);
    const themeTimer = window.setInterval(() => {
      setThemeRotIdx((prev) => (prev + 1) % THEMES.length);
    }, 1750);

    return () => {
      window.clearInterval(memberTimer);
      window.clearInterval(albumTimer);
      window.clearInterval(themeTimer);
    };
  }, [isNative, hasCompletedOnboarding, members.length, rotatingAlbums.length]);

  // 1. Desktop Browser (`npm run dev`): Defaults straight into Admin Studio,
  //    with a one-click "Preview Fan App" mode to inspect staged changes in the live UI!
  if (!isNative && !isPreviewingFanApp) {
    return <AdminStudioView />;
  }

  // 2. Mobile / Android Fan App (or Desktop Live Preview):
  //    When `hasCompletedOnboarding` is true, render the main Fan App (with the top return bar on desktop).
  if (hasCompletedOnboarding) {
    if (!isNative) {
      return (
        <>
          <div className="sticky top-0 z-50 flex items-center justify-between border-b border-[#2c3c4a] bg-[#181e24]/95 px-5 py-2.5 text-[#eef3f7] shadow-md backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-[#5ce1b8]" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white">
                Fan App Live Preview
              </span>
              {pendingCount > 0 && (
                <span className="rounded border border-[#f5c43d]/40 bg-[#f5c43d]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#f5c43d]">
                  {pendingCount} Staged Draft{pendingCount === 1 ? "" : "s"} Applied
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSlide(0);
                  replayOnboarding();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#313d49] bg-[#222a32] px-3 py-1.5 text-xs font-medium text-[#d3dde6] transition-colors hover:bg-[#2a343e] hover:text-white"
              >
                <Sparkles size={12} className="text-[#c9c4f6]" />
                Preview Welcome Tour
              </button>
              <button
                type="button"
                onClick={() => setPreviewingFanApp(false)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#5ce1b8] px-3.5 py-1.5 text-xs font-semibold text-[#142026] shadow-sm transition-colors hover:bg-[#4dd4aa]"
              >
                <ArrowLeft size={13} />
                Return to Admin Console
                {pendingCount > 0 && <Rocket size={12} />}
              </button>
            </div>
          </div>
          {children}
        </>
      );
    }
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

  const activeMember = members[memberRotIdx % Math.max(1, members.length)] ?? members[0];
  const activeAlbum =
    rotatingAlbums[albumRotIdx % Math.max(1, rotatingAlbums.length)] ?? rotatingAlbums[0];
  const activeTheme = THEMES[themeRotIdx % THEMES.length] ?? THEMES[0]!;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="stage-gradient relative flex min-h-screen flex-col justify-between overflow-hidden px-6 pt-8 pb-10"
    >
      {/* Top Bar: Only right-aligned Skip button (00 // 00 top-left counter removed!) */}
      <div className="mx-auto flex w-full max-w-md items-center justify-end">
        <button
          type="button"
          onClick={completeOnboarding}
          className="press rounded-full border border-white/15 bg-background/45 px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-md hover:text-foreground"
        >
          Skip
        </button>
      </div>

      {/* Slide Stage */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-4 text-center">
        {/* ================================================================= */}
        {/* SLIDE 1: WELCOME TO THE ARCHIVE (Glowing Admin-Configurable Pic)  */}
        {/* ================================================================= */}
        {slide === 0 && (
          <div key="slide-0" className="fade-up flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              {/* Outer Breathing Multi-Layer Neon Glow Aura */}
              <div
                aria-hidden="true"
                className="album-glow-aura pointer-events-none absolute -inset-5 rounded-[2.6rem] opacity-80 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, var(--primary) 0%, var(--accent) 55%, transparent 78%)",
                }}
              />

              {/* Rotating Prismatic Conic Light Beam Frame */}
              <div className="relative h-52 w-48 overflow-hidden rounded-[2.1rem] p-[2.5px] shadow-[0_0_45px_-5px_var(--primary)]">
                <div
                  aria-hidden="true"
                  className="album-beam-active absolute -inset-[100%]"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, transparent 55deg, var(--primary) 120deg, var(--accent) 180deg, var(--highlight) 245deg, transparent 305deg, transparent 360deg)",
                  }}
                />
                <div className="relative h-full w-full overflow-hidden rounded-[1.95rem] bg-card/90 p-1 backdrop-blur-md">
                  {welcomeCoverUrl ? (
                    <img
                      src={welcomeCoverUrl}
                      alt="IVE Dive Archive Welcome"
                      className="h-full w-full rounded-[1.75rem] object-cover object-center shadow-inner"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center rounded-[1.75rem] bg-primary/15">
                      <Sparkles size={42} className="text-primary" />
                    </div>
                  )}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-t from-black/50 via-transparent to-white/10"
                  />
                </div>
              </div>
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

        {/* ================================================================= */}
        {/* SLIDE 2: SIX EDITORIAL DOSSIERS (Continuous 3D Glowing 6-Member)  */}
        {/* ================================================================= */}
        {slide === 1 && (
          <div key="slide-1" className="fade-up flex w-full flex-col items-center">
            <div className="relative flex h-56 w-full max-w-[340px] items-center justify-center">
              {/* Ambient Pulsing Stage Aura */}
              <div
                aria-hidden="true"
                className="album-glow-aura pointer-events-none absolute h-44 w-56 rounded-full opacity-75 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, var(--primary) 0%, var(--accent) 58%, transparent 80%)",
                }}
              />

              {/* Continuous 3D Rotating Deck of All 6 Members */}
              {members.map((m, idx) => {
                const rel = getCircularOffset(idx, memberRotIdx, members.length);
                const isCenter = rel === 0;
                const isWing = Math.abs(rel) === 1;
                const isBack = Math.abs(rel) === 2;

                const translateX =
                  isCenter ? 0 : isWing ? rel * 86 : isBack ? rel * 56 : 0;
                const translateY = isCenter ? -6 : isWing ? 8 : 20;
                const scale = isCenter ? 1.08 : isWing ? 0.86 : isBack ? 0.7 : 0.55;
                const rotateDeg = isCenter ? 0 : isWing ? rel * 9 : rel * 14;
                const opacity = isCenter ? 1 : isWing ? 0.82 : isBack ? 0.28 : 0;
                const zIndex = isCenter ? 30 : isWing ? 20 : isBack ? 10 : 0;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMemberRotIdx(idx)}
                    style={{
                      transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotate(${rotateDeg}deg)`,
                      opacity,
                      zIndex,
                      boxShadow: isCenter
                        ? "0 0 36px -2px var(--primary), 0 0 64px -10px var(--accent)"
                        : "0 14px 30px -10px rgba(0,0,0,0.65)",
                    }}
                    className={cn(
                      "absolute h-44 w-32 overflow-hidden rounded-2xl p-[2px] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isCenter ? "ring-1 ring-white/40" : "border border-white/20 bg-surface",
                    )}
                  >
                    {isCenter && (
                      <div
                        aria-hidden="true"
                        className="album-beam-active absolute -inset-[100%]"
                        style={{
                          background:
                            "conic-gradient(from 0deg, transparent 0deg, var(--primary) 110deg, var(--accent) 190deg, var(--highlight) 260deg, transparent 360deg)",
                        }}
                      />
                    )}
                    <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-surface">
                      <ArtworkImage
                        src={m.image?.trim() || getMemberImage(m.id)}
                        alt={m.name}
                        kind="member"
                        className="h-full w-full object-cover object-top"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <div className="absolute inset-x-1.5 bottom-1.5 rounded-lg border border-white/20 bg-black/50 px-1.5 py-1 text-center backdrop-blur-md">
                        <p className="truncate text-[10px] font-bold tracking-wide text-white">
                          {m.name}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Spotlight Member Pill */}
            {activeMember && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1 shadow-[0_0_20px_-4px_var(--primary)] backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {activeMember.name} · {activeMember.koreanName}
                </span>
              </div>
            )}

            <p className="mt-5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
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

        {/* ================================================================= */}
        {/* SLIDE 3: EVERY ERA, EVERY TRACK (Continuous 3D Glowing All-Albums)*/}
        {/* ================================================================= */}
        {slide === 2 && (
          <div key="slide-2" className="fade-up flex w-full flex-col items-center">
            <div className="relative flex h-52 w-full max-w-[340px] items-center justify-center">
              {/* Ambient Pulsing Album Aura */}
              <div
                aria-hidden="true"
                className="album-glow-aura pointer-events-none absolute h-44 w-56 rounded-full opacity-80 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, var(--primary) 0%, var(--accent) 58%, transparent 80%)",
                }}
              />

              {/* Continuous 3D Rotating Deck Across Every Album */}
              {rotatingAlbums.map((a, idx) => {
                const rel = getCircularOffset(idx, albumRotIdx, rotatingAlbums.length);
                const isCenter = rel === 0;
                const isWing = Math.abs(rel) === 1;
                const isBack = Math.abs(rel) === 2;

                if (Math.abs(rel) > 2) return null;

                const translateX = isCenter ? 0 : isWing ? rel * 92 : rel * 60;
                const translateY = isCenter ? -4 : isWing ? 10 : 22;
                const scale = isCenter ? 1.1 : isWing ? 0.85 : 0.68;
                const rotateDeg = isCenter ? 0 : isWing ? rel * 8 : rel * 13;
                const opacity = isCenter ? 1 : isWing ? 0.84 : 0.25;
                const zIndex = isCenter ? 30 : isWing ? 20 : 10;

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAlbumRotIdx(idx)}
                    style={{
                      transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotate(${rotateDeg}deg)`,
                      opacity,
                      zIndex,
                      boxShadow: isCenter
                        ? "0 0 40px -2px var(--primary), 0 0 68px -8px var(--accent)"
                        : "0 14px 30px -10px rgba(0,0,0,0.65)",
                    }}
                    className={cn(
                      "absolute h-36 w-36 overflow-hidden rounded-2xl p-[2.5px] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isCenter ? "ring-1 ring-white/40" : "border border-white/15 bg-surface",
                    )}
                  >
                    {isCenter && (
                      <div
                        aria-hidden="true"
                        className="album-beam-active absolute -inset-[100%]"
                        style={{
                          background:
                            "conic-gradient(from 0deg, transparent 0deg, var(--primary) 110deg, var(--accent) 190deg, var(--highlight) 260deg, transparent 360deg)",
                        }}
                      />
                    )}
                    <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-surface">
                      <ArtworkImage
                        src={a.cover?.trim() || getAlbumArtwork(a.id)}
                        alt={a.title}
                        kind="album"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Spotlight Era Badge */}
            {activeAlbum && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1 shadow-[0_0_20px_-4px_var(--primary)] backdrop-blur-md">
                <Disc3 size={12} className="text-primary animate-spin" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                  {activeAlbum.title} · {activeAlbum.releaseDate.slice(0, 4)}
                </span>
              </div>
            )}

            <p className="mt-5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
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

        {/* ================================================================= */}
        {/* SLIDE 4: 11 LIVING ERA THEMES (Vertical Fade + Swatch Glow Drum)  */}
        {/* ================================================================= */}
        {slide === 3 && (
          <div key="slide-3" className="fade-up flex w-full flex-col items-center">
            <div className="relative flex h-60 w-full max-w-[310px] items-center justify-center overflow-hidden">
              {/* Dynamic Era-Matched Radial Glow Aura that morphs to the centered theme's swatch */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute h-44 w-60 rounded-full opacity-75 blur-2xl transition-all duration-700"
                style={{
                  background: `radial-gradient(circle, ${activeTheme.swatch[1]} 0%, ${activeTheme.swatch[2]} 58%, transparent 80%)`,
                }}
              />

              {/* Vertical Rotating Theme Drum with Smooth Top/Bottom Fade Animation */}
              {THEMES.map((t, idx) => {
                const rel = getCircularOffset(idx, themeRotIdx, THEMES.length);
                if (Math.abs(rel) > 3) return null;

                const isCenter = rel === 0;
                const isAdjacent = Math.abs(rel) === 1;
                const isOuter = Math.abs(rel) === 2;

                const translateY = rel * 48;
                const scale = isCenter ? 1.06 : isAdjacent ? 0.91 : isOuter ? 0.78 : 0.65;
                const opacity = isCenter ? 1 : isAdjacent ? 0.5 : isOuter ? 0.16 : 0;
                const zIndex = isCenter ? 30 : isAdjacent ? 20 : 10;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeRotIdx(idx)}
                    style={{
                      transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
                      opacity,
                      zIndex,
                      borderColor: isCenter ? t.swatch[1] : "rgba(255,255,255,0.14)",
                      boxShadow: isCenter
                        ? `0 0 32px -2px ${t.swatch[1]}, 0 0 56px -10px ${t.swatch[2]}, inset 0 1px 1px rgba(255,255,255,0.35)`
                        : "none",
                    }}
                    className={cn(
                      "absolute flex w-[250px] items-center justify-between rounded-full border px-4 py-2.5 backdrop-blur-xl transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isCenter ? "bg-surface/90" : "bg-surface/55",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center -space-x-1">
                        <span
                          className="h-4 w-4 rounded-full ring-1 ring-white/30"
                          style={{
                            background: t.swatch[1],
                            boxShadow: isCenter ? `0 0 10px ${t.swatch[1]}` : "none",
                          }}
                        />
                        <span
                          className="h-3.5 w-3.5 rounded-full ring-1 ring-white/25"
                          style={{ background: t.swatch[2] }}
                        />
                      </div>
                      <span
                        className={cn(
                          "font-mono text-[11px] uppercase tracking-wider",
                          isCenter ? "font-bold text-white" : "font-medium text-foreground/80",
                        )}
                      >
                        {t.name}
                      </span>
                    </div>

                    {isCenter && (
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-white"
                        style={{
                          background: `linear-gradient(120deg, ${t.swatch[1]}, ${t.swatch[2]})`,
                        }}
                      >
                        Active Glow
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
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
