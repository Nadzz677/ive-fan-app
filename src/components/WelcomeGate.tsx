import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Disc3, Palette, Rocket, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DEFAULT_HERO_IMAGES, useCatalog, useStagedCatalog } from "@/lib/catalog";
import { STUDIO_ROUTE_PATH } from "@/lib/studio-route";
import { THEMES } from "@/lib/theme";
import { getAlbumArtwork, getMemberImage } from "@/data/imageAssets";
import { ArtworkImage } from "./ArtworkImage";
import { cn } from "@/lib/utils";

const SLIDE_COUNT = 4;

/**
 * Returns the continuous signed circular distance (`-total/2 .. +total/2`) from continuous `phase` to `itemIdx`.
 */
function getContinuousOffset(itemIdx: number, phase: number, total: number): number {
  if (total <= 0) return 0;
  let diff = (((itemIdx - phase) % total) + total) % total;
  if (diff > total / 2) diff -= total;
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
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  const [slide, setSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Continuous 60fps nonstop elapsed clock (in seconds) for buttery non-stop rotations!
  const [elapsedSec, setElapsedSec] = useState(0);

  const welcomeCoverUrl = useMemo(() => {
    return (
      config.welcomeImage?.trim() || config.heroImages?.[0]?.trim() || DEFAULT_HERO_IMAGES[0] || ""
    );
  }, [config.welcomeImage, config.heroImages]);

  const rotatingAlbums = useMemo(() => {
    const withCovers = albums.filter((a) => Boolean(a.cover?.trim() || getAlbumArtwork(a.id)));
    return withCovers.length > 0 ? withCovers : albums;
  }, [albums]);

  const isWelcomeVisible = !hasCompletedOnboarding;

  // Nonstop 60fps requestAnimationFrame clock (zero stepping, zero pausing!)
  useEffect(() => {
    if (!isWelcomeVisible) return;
    let frameId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      setElapsedSec((now - startTime) / 1000);
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isWelcomeVisible]);

  // Render the Fan App once onboarding is completed (with a live preview return bar if opened from the Studio console).
  if (hasCompletedOnboarding) {
    if (!isNative && isPreviewingFanApp) {
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
                onClick={() => {
                  setPreviewingFanApp(false);
                  void navigate({ to: STUDIO_ROUTE_PATH });
                }}
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

  // Continuous nonstop floating phases (zero stopping!)
  const memberPhase = elapsedSec * 0.42;
  const albumPhase = elapsedSec * 0.52;
  const themePhase = elapsedSec * 0.62;

  const nearestMemberIdx =
    ((Math.round(memberPhase) % Math.max(1, members.length)) + Math.max(1, members.length)) %
    Math.max(1, members.length);
  const nearestAlbumIdx =
    ((Math.round(albumPhase) % Math.max(1, rotatingAlbums.length)) +
      Math.max(1, rotatingAlbums.length)) %
    Math.max(1, rotatingAlbums.length);
  const nearestThemeIdx =
    ((Math.round(themePhase) % THEMES.length) + THEMES.length) % THEMES.length;

  const activeMember = members[nearestMemberIdx] ?? members[0];
  const activeAlbum = rotatingAlbums[nearestAlbumIdx] ?? rotatingAlbums[0];
  const activeTheme = THEMES[nearestThemeIdx] ?? THEMES[0]!;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="stage-gradient relative flex min-h-screen flex-col justify-between overflow-hidden px-6 pt-8 pb-10"
    >
      {/* Top Bar: Only right-aligned Skip button */}
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
                className="album-glow-aura pointer-events-none absolute -inset-7 rounded-full opacity-80 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, var(--primary) 0%, var(--accent) 52%, transparent 74%)",
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
        {/* SLIDE 2: SIX EDITORIAL DOSSIERS (Nonstop 60fps 3D Glowing Orbit)  */}
        {/* ================================================================= */}
        {slide === 1 && (
          <div key="slide-1" className="fade-up flex w-full flex-col items-center">
            <div className="relative flex h-56 w-full max-w-[340px] items-center justify-center">
              {/* Unclipped Soft Ambient Stage Glow */}
              <div
                aria-hidden="true"
                className="album-glow-aura pointer-events-none absolute h-52 w-64 rounded-full opacity-75 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, var(--primary) 0%, var(--accent) 55%, transparent 76%)",
                }}
              />

              {/* Nonstop Continuous 3D Elliptical Orbit of All 6 Members */}
              {members.map((m, idx) => {
                const count = Math.max(1, members.length);
                const rel = getContinuousOffset(idx, memberPhase, count);
                const theta = (rel / count) * Math.PI * 2;
                const depth = Math.cos(theta); // +1 front spotlight, -1 back
                const frontNorm = (depth + 1) / 2; // 0..1

                const translateX = Math.sin(theta) * 116;
                const translateY = (1 - frontNorm) * 16 - 4;
                const scale = 0.66 + frontNorm * 0.44;
                const rotateDeg = Math.sin(theta) * 9;
                const opacity = 0.22 + Math.pow(frontNorm, 1.45) * 0.78;
                const zIndex = Math.round(frontNorm * 30);
                const glowStrength = Math.pow(Math.max(0, (depth - 0.45) / 0.55), 1.6);

                return (
                  <div
                    key={m.id}
                    style={{
                      transform: `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotate(${rotateDeg.toFixed(2)}deg)`,
                      opacity,
                      zIndex,
                      boxShadow:
                        glowStrength > 0.05
                          ? `0 0 ${(38 * glowStrength).toFixed(1)}px -2px var(--primary), 0 0 ${(64 * glowStrength).toFixed(1)}px -8px var(--accent)`
                          : "0 12px 26px -10px rgba(0,0,0,0.65)",
                    }}
                    className={cn(
                      "pointer-events-none absolute h-44 w-32 overflow-hidden rounded-2xl p-[2px] will-change-transform",
                      glowStrength > 0.35
                        ? "ring-1 ring-white/45"
                        : "border border-white/15 bg-surface",
                    )}
                  >
                    {glowStrength > 0.2 && (
                      <div
                        aria-hidden="true"
                        style={{
                          opacity: glowStrength,
                          background:
                            "conic-gradient(from 0deg, transparent 0deg, var(--primary) 110deg, var(--accent) 190deg, var(--highlight) 260deg, transparent 360deg)",
                        }}
                        className="album-beam-active absolute -inset-[100%]"
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
                  </div>
                );
              })}
            </div>

            {/* Active Spotlight Member Pill */}
            {activeMember && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1 shadow-[0_0_20px_-4px_var(--primary)] backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
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
        {/* SLIDE 3: EVERY ERA, EVERY TRACK (Nonstop 60fps 3D Glowing Orbit)  */}
        {/* ================================================================= */}
        {slide === 2 && (
          <div key="slide-2" className="fade-up flex w-full flex-col items-center">
            <div className="relative flex h-52 w-full max-w-[340px] items-center justify-center">
              {/* Unclipped Soft Ambient Album Aura */}
              <div
                aria-hidden="true"
                className="album-glow-aura pointer-events-none absolute h-48 w-64 rounded-full opacity-80 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, var(--primary) 0%, var(--accent) 55%, transparent 76%)",
                }}
              />

              {/* Nonstop Continuous 3D Curved Flow Across Every Album */}
              {rotatingAlbums.map((a, idx) => {
                const rel = getContinuousOffset(idx, albumPhase, rotatingAlbums.length);
                if (Math.abs(rel) > 2.65) return null;

                const t = rel / 2.65; // -1 .. +1
                const frontness = Math.max(0, Math.cos(t * Math.PI * 0.5)); // 1 at center, 0 at edges
                const translateX = Math.sin(t * Math.PI * 0.65) * 142;
                const translateY = (1 - frontness) * 18 - 4;
                const scale = 0.62 + frontness * 0.5;
                const rotateDeg = t * 13;
                const opacity = Math.pow(frontness, 1.35);
                const zIndex = Math.round(frontness * 30);
                const glowStrength = Math.pow(Math.max(0, (frontness - 0.55) / 0.45), 1.6);

                return (
                  <div
                    key={a.id}
                    style={{
                      transform: `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotate(${rotateDeg.toFixed(2)}deg)`,
                      opacity,
                      zIndex,
                      boxShadow:
                        glowStrength > 0.05
                          ? `0 0 ${(42 * glowStrength).toFixed(1)}px -2px var(--primary), 0 0 ${(68 * glowStrength).toFixed(1)}px -8px var(--accent)`
                          : "0 12px 28px -10px rgba(0,0,0,0.65)",
                    }}
                    className={cn(
                      "pointer-events-none absolute h-36 w-36 overflow-hidden rounded-2xl p-[2.5px] will-change-transform",
                      glowStrength > 0.35
                        ? "ring-1 ring-white/45"
                        : "border border-white/15 bg-surface",
                    )}
                  >
                    {glowStrength > 0.2 && (
                      <div
                        aria-hidden="true"
                        style={{
                          opacity: glowStrength,
                          background:
                            "conic-gradient(from 0deg, transparent 0deg, var(--primary) 110deg, var(--accent) 190deg, var(--highlight) 260deg, transparent 360deg)",
                        }}
                        className="album-beam-active absolute -inset-[100%]"
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
                  </div>
                );
              })}
            </div>

            {/* Active Spotlight Era Badge */}
            {activeAlbum && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1 shadow-[0_0_20px_-4px_var(--primary)] backdrop-blur-md">
                <Disc3 size={12} className="animate-spin text-primary" />
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
        {/* SLIDE 4: 11 LIVING ERA THEMES (Nonstop Vertical Fade Stream,      */}
        {/*          ZERO Rectangular Clip Box!)                              */}
        {/* ================================================================= */}
        {slide === 3 && (
          <div key="slide-3" className="fade-up flex w-full flex-col items-center">
            {/* IMPORTANT: No `overflow-hidden` here so the radial glow feathers organically with ZERO visible rectangle! */}
            <div className="relative flex h-60 w-full max-w-[320px] items-center justify-center">
              {/* Free-Floating Radial Swatch Glow Aura (feathers seamlessly into the page background) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-10 rounded-full opacity-55 blur-3xl transition-colors duration-700"
                style={{
                  background: `radial-gradient(circle, ${activeTheme.swatch[1]} 0%, color-mix(in oklab, ${activeTheme.swatch[2]} 45%, transparent) 42%, transparent 70%)`,
                }}
              />

              {/* Nonstop Continuous Vertical Flowing Theme Pills */}
              {THEMES.map((t, idx) => {
                const rel = getContinuousOffset(idx, themePhase, THEMES.length);
                if (Math.abs(rel) > 2.55) return null;

                const translateY = rel * 48;
                const centerFactor = Math.max(0, 1 - Math.abs(rel) / 2.55); // 1 at dead center, 0 at top/bottom edges
                const scale = 0.78 + Math.pow(centerFactor, 1.25) * 0.28;
                const opacity = Math.pow(centerFactor, 1.75);
                const zIndex = Math.round(centerFactor * 30);
                const glowStrength = Math.pow(Math.max(0, 1 - Math.abs(rel) / 0.8), 1.6);

                return (
                  <div
                    key={t.id}
                    style={{
                      transform: `translate3d(0, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`,
                      opacity,
                      zIndex,
                      borderColor: glowStrength > 0.25 ? t.swatch[1] : "rgba(255,255,255,0.14)",
                      boxShadow:
                        glowStrength > 0.08
                          ? `0 0 ${(32 * glowStrength).toFixed(1)}px -2px ${t.swatch[1]}, 0 0 ${(52 * glowStrength).toFixed(1)}px -10px ${t.swatch[2]}, inset 0 1px 1px rgba(255,255,255,0.35)`
                          : "none",
                    }}
                    className={cn(
                      "pointer-events-none absolute flex w-[252px] items-center justify-between rounded-full border px-4 py-2.5 backdrop-blur-xl will-change-transform",
                      glowStrength > 0.35 ? "bg-surface/90" : "bg-surface/50",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center -space-x-1">
                        <span
                          className="h-4 w-4 rounded-full ring-1 ring-white/30"
                          style={{
                            background: t.swatch[1],
                            boxShadow: glowStrength > 0.3 ? `0 0 10px ${t.swatch[1]}` : "none",
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
                          glowStrength > 0.35
                            ? "font-bold text-white"
                            : "font-medium text-foreground/80",
                        )}
                      >
                        {t.name}
                      </span>
                    </div>

                    {glowStrength > 0.35 && (
                      <span
                        style={{
                          opacity: glowStrength,
                          background: `linear-gradient(120deg, ${t.swatch[1]}, ${t.swatch[2]})`,
                        }}
                        className="rounded-full px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-white"
                      >
                        Active Glow
                      </span>
                    )}
                  </div>
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
              Switch between official album-matched color palettes with our 3-beat Prism Depth Bloom
              animation.
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
