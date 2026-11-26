import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  FileText,
  Languages,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Square,
} from "lucide-react";
import { trackDuration } from "@/data/albums";
import { useCatalog } from "@/lib/catalog";
import { formatDuration } from "@/lib/format";
import { usePlayer } from "@/lib/player";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "./ArtworkImage";
import { FavoriteButton } from "./FavoriteButton";
import { CurvedProgress } from "./CurvedProgress";

const DISMISS_THRESHOLD = 110;

export function ExpandedPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    effectiveDuration,
    hasRealAudio,
    audioSourceKind,
    shuffle,
    repeat,
    expanded,
    toggle,
    next,
    previous,
    seek,
    toggleShuffle,
    cycleRepeat,
    stopListening,
    setExpanded,
  } = usePlayer();

  const [drag, setDrag] = useState(0);
  const [lyricLang, setLyricLang] = useState<"original" | "romanized">("original");
  const [lyricsFullscreen, setLyricsFullscreen] = useState(false);
  // Post-close shield prevents touch release / synthesized click from hitting background cards while closing
  const [closingShield, setClosingShield] = useState(false);
  const startY = useRef<number | null>(null);
  const lastCloseAtRef = useRef<number>(0);

  useEffect(() => {
    if (!expanded) {
      setDrag(0);
      setLyricsFullscreen(false);
    }
  }, [expanded]);

  // Allow Android hardware Back button to exit Fullscreen Lyrics back into Expanded Player
  useEffect(() => {
    if (!expanded || !lyricsFullscreen) return;
    const handleBack = (e: Event) => {
      e.preventDefault();
      setLyricsFullscreen(false);
    };
    window.addEventListener("ive:android-back", handleBack);
    return () => window.removeEventListener("ive:android-back", handleBack);
  }, [expanded, lyricsFullscreen]);

  const { getAlbum, getTrackArtwork } = useCatalog();

  const originalLyrics = currentTrack?.lyricsKorean?.trim() ?? "";
  const romanizedLyrics = currentTrack?.lyricsRomanized?.trim() ?? "";
  const hasAnyLyrics = Boolean(originalLyrics || romanizedLyrics);

  // If the active tab is empty on a track that only has one of the two fields, fall back gracefully
  const activeLyrics = useMemo(() => {
    if (lyricLang === "original") {
      return originalLyrics || romanizedLyrics;
    }
    return romanizedLyrics || originalLyrics;
  }, [lyricLang, originalLyrics, romanizedLyrics]);

  const lyricLines = useMemo(() => {
    if (!activeLyrics) return [];
    return activeLyrics.split(/\r?\n/);
  }, [activeLyrics]);

  const previewLines = useMemo(() => {
    return lyricLines.filter((line) => line.trim().length > 0).slice(0, 6);
  }, [lyricLines]);

  if (!currentTrack) return null;

  const album = getAlbum(currentTrack.albumId);
  const total = effectiveDuration || trackDuration(currentTrack);
  const originalScriptLabel =
    currentTrack.language === "Japanese"
      ? "Original (JP)"
      : currentTrack.language === "English"
        ? "Original (EN)"
        : "Original (KR)";

  const close = () => {
    lastCloseAtRef.current = Date.now();
    setClosingShield(true);
    setDrag(0);
    setLyricsFullscreen(false);
    setExpanded(false);
    window.setTimeout(() => setClosingShield(false), 300);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!expanded || lyricsFullscreen) return;
    if ((e.target as HTMLElement).closest("button, a, input, [role='button']")) {
      return;
    }
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!expanded || lyricsFullscreen || startY.current === null) return;
    const delta = e.clientY - startY.current;
    setDrag(delta > 0 ? delta : 0);
  };

  const onPointerUp = () => {
    if (startY.current === null) return;
    startY.current = null;
    if (drag > DISMISS_THRESHOLD) close();
    else setDrag(0);
  };

  const dragging = startY.current !== null;

  return (
    <div
      aria-hidden={!expanded}
      style={{
        pointerEvents: expanded || closingShield ? "auto" : "none",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      <div
        role="dialog"
        aria-modal={expanded}
        aria-label="Now playing"
        style={{
          transform: expanded
            ? `translate3d(0, ${drag}px, 0) scale(${Math.max(0.92, 1 - drag / 1600)})`
            : "translate3d(0, 104%, 0) scale(0.96)",
          opacity: expanded ? Math.max(0.35, 1 - drag / 700) : 0,
          transition: dragging ? "none" : "transform 0.36s var(--ease-spring), opacity 0.26s ease",
        }}
        className="relative h-full w-full overflow-hidden overscroll-contain will-change-transform"
      >
        <div className="stage-gradient absolute inset-0" aria-hidden="true" />

        {/* MAIN SCROLLABLE EXPANDED PLAYER BODY */}
        <div className="relative flex h-full flex-col overflow-y-auto overscroll-contain px-5 pt-3 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Drag handle / header */}
          <div
            className="shrink-0 select-none pb-2"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="mx-auto h-1.5 w-12 cursor-grab rounded-full bg-foreground/25" />
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  close();
                }}
                aria-label="Minimize player"
                className="press glass-panel grid h-10 w-10 place-items-center rounded-full"
              >
                <ChevronDown size={20} />
              </button>

              {/* Center Playing From Release Header (Spotify style) */}
              <div className="min-w-0 px-3 text-center">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Playing from Release
                </p>
                <p className="truncate text-xs font-bold text-foreground">
                  {album?.title ?? "IVE Archive"}
                </p>
              </div>

              <FavoriteButton kind="song" id={currentTrack.id} size="md" />
            </div>
          </div>

          <div className="mx-auto mt-2 flex w-full max-w-sm flex-1 flex-col">
            {/* 1. Glowing Album Artwork Square */}
            <div className="relative flex flex-col items-center">
              {/* Outer Luminous Ambient Aura */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 -m-3 rounded-[2.8rem] opacity-70 blur-2xl transition-all duration-700",
                  isPlaying && expanded ? "album-glow-aura" : "scale-95 opacity-30 blur-xl",
                )}
                style={{
                  background:
                    "radial-gradient(circle, var(--primary) 0%, var(--accent) 55%, transparent 75%)",
                }}
              />

              {/* Perimeter Light Beam Shell */}
              <div className="relative aspect-square w-full max-w-[300px] overflow-hidden rounded-[2.2rem] p-[2.5px] shadow-2xl">
                <div
                  className={cn(
                    "absolute -inset-[100%] transition-opacity duration-500",
                    isPlaying && expanded ? "album-beam-active" : "album-beam-paused",
                  )}
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, transparent 60deg, var(--primary) 120deg, var(--accent) 180deg, var(--highlight) 240deg, transparent 300deg, transparent 360deg)",
                  }}
                />

                {/* Inner Card Frame */}
                <div className="relative h-full w-full overflow-hidden rounded-[2.05rem] bg-card/90 p-1.5 backdrop-blur-md">
                  <div className="h-full w-full overflow-hidden rounded-[1.75rem]">
                    <ArtworkImage
                      src={getTrackArtwork(currentTrack)}
                      alt={`${currentTrack.title} album artwork`}
                      kind="song"
                      width={1024}
                      height={1024}
                      fallbackIconSize={46}
                      showEmptyLabel
                      className="rounded-[1.75rem] shadow-inner transition-transform duration-500"
                      containerClassName="rounded-[1.75rem] border border-glass-border bg-card/60"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Track Metadata */}
            <div className="mt-5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-2xl font-bold leading-tight">
                      {currentTrack.title}
                    </h2>
                    {hasRealAudio && (
                      <span className="shrink-0 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-primary">
                        {audioSourceKind === "direct" ? "⚡ Direct HD Audio" : "● Live Audio"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {currentTrack.artist ?? "IVE"} · {album?.title}
                    {currentTrack.language && currentTrack.language !== "Korean" && (
                      <span className="ml-1.5 opacity-75">({currentTrack.language})</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Curved Progress Bar */}
            <div className="mt-4">
              <CurvedProgress progress={progress} total={total} onSeek={seek} variant="expanded" />
              <div className="mt-1.5 flex justify-between text-[11px] font-medium tabular-nums text-muted-foreground">
                <span>{formatDuration(progress)}</span>
                <span>{formatDuration(total)}</span>
              </div>
            </div>

            {/* 4. Playback Transport Controls */}
            <div
              className="mt-3 flex items-center justify-between"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={toggleShuffle}
                aria-label="Shuffle"
                aria-pressed={shuffle}
                className={cn(
                  "press relative grid h-11 w-11 place-items-center rounded-full transition-colors",
                  shuffle
                    ? "bg-primary/20 font-bold text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Shuffle size={18} />
                {shuffle && (
                  <span className="absolute right-2 bottom-2 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
              <button
                type="button"
                onClick={previous}
                aria-label="Previous track"
                className="press grid h-12 w-12 place-items-center rounded-full text-foreground transition-colors hover:text-primary"
              >
                <SkipBack size={26} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (Date.now() - lastCloseAtRef.current < 350) return;
                  toggle();
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="press grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg glow"
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next track"
                className="press grid h-12 w-12 place-items-center rounded-full text-foreground transition-colors hover:text-primary"
              >
                <SkipForward size={26} />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                aria-label={`Repeat: ${repeat}`}
                className={cn(
                  "press grid h-11 w-11 place-items-center rounded-full transition-colors",
                  repeat !== "off"
                    ? "bg-primary/20 font-bold text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
              </button>
            </div>

            {/* 5. SPOTIFY-STYLE GLASSMORPHISM INLINE LYRICS CARD (Below Controls, Before End Session) */}
            <div className="relative mt-6" onPointerDown={(e) => e.stopPropagation()}>
              {/* Soft outer ambient prism aura behind the glass card */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1.5 rounded-[2rem] opacity-45 blur-xl transition-opacity duration-500"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklab, var(--primary) 65%, transparent), color-mix(in oklab, var(--accent) 55%, transparent))",
                }}
              />

              {/* Multi-layered Frosted Crystal Glass Card */}
              <div
                className="relative overflow-hidden rounded-[1.75rem] border border-white/20 p-4 backdrop-blur-2xl backdrop-saturate-150 transition-all"
                style={{
                  background:
                    "linear-gradient(145deg, color-mix(in oklab, var(--primary) 26%, rgba(255,255,255,0.12)) 0%, color-mix(in oklab, var(--card) 74%, rgba(12,12,24,0.52)) 52%, color-mix(in oklab, var(--accent) 24%, rgba(255,255,255,0.08)) 100%)",
                  boxShadow:
                    "inset 0 1px 1px rgba(255, 255, 255, 0.32), inset 0 -1px 1px rgba(255, 255, 255, 0.08), 0 22px 48px -16px rgba(0, 0, 0, 0.65)",
                }}
              >
                {/* Specular glass light orbs */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-35 blur-2xl"
                  style={{ background: "var(--primary)" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full opacity-30 blur-2xl"
                  style={{ background: "var(--accent)" }}
                />

                {/* Top Header Row: "Lyrics" Title + 2-Part Original/Romanized Glass Switcher + Expand Button */}
                <div className="relative z-10 flex items-center justify-between gap-2 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="grid h-6 w-6 place-items-center rounded-full border border-white/20 bg-white/10 text-primary backdrop-blur-md">
                      <Sparkles size={12} />
                    </span>
                    <span className="text-sm font-bold tracking-tight text-foreground">Lyrics</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* 2-Part Glassmorphic Language Switcher: Original vs Romanized */}
                    <div className="flex items-center rounded-full border border-white/20 bg-black/25 p-0.5 backdrop-blur-xl">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLyricLang("original");
                        }}
                        className={cn(
                          "press rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition-all",
                          lyricLang === "original"
                            ? "bg-primary text-primary-foreground shadow-[0_2px_10px_var(--primary)]"
                            : "text-foreground/75 hover:text-foreground",
                        )}
                      >
                        {originalScriptLabel}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLyricLang("romanized");
                        }}
                        className={cn(
                          "press rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition-all",
                          lyricLang === "romanized"
                            ? "bg-primary text-primary-foreground shadow-[0_2px_10px_var(--primary)]"
                            : "text-foreground/75 hover:text-foreground",
                        )}
                      >
                        Romanized
                      </button>
                    </div>

                    {/* Spotify-Style Circular Frosted Glass Expand Button (⤢) */}
                    {hasAnyLyrics && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLyricsFullscreen(true);
                        }}
                        aria-label="Expand full lyrics"
                        title="Expand full lyrics"
                        className="press grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/25 bg-white/15 text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-white/25"
                      >
                        <Maximize2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Lyrics Preview Body (Tapping expands fullscreen lyrics!) */}
                {hasAnyLyrics && previewLines.length > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLyricsFullscreen(true);
                    }}
                    className="group relative z-10 block w-full text-left"
                  >
                    <div className="max-h-[175px] space-y-2 overflow-hidden pr-1">
                      {previewLines.map((line, index) => (
                        <p
                          key={`${currentTrack.id}-prev-${index}`}
                          className={cn(
                            "text-[16px] font-bold leading-[1.42] tracking-tight transition-opacity",
                            index === 0
                              ? "text-foreground"
                              : index <= 3
                                ? "text-foreground/90"
                                : "text-foreground/70",
                          )}
                        >
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Frosted bottom fade + "Expand full lyrics" pill */}
                    <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2.5">
                      <span className="text-[11px] font-medium text-foreground/75">
                        {lyricLang === "original"
                          ? "Showing Original Lyrics"
                          : "Showing Romanized Lyrics"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-semibold text-foreground backdrop-blur-md transition-transform group-hover:scale-[1.02]">
                        <Maximize2 size={11} />
                        Expand Lyrics
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="relative z-10 flex flex-col items-center justify-center py-6 text-center">
                    <FileText size={24} className="mb-1.5 text-foreground/60" />
                    <p className="text-xs font-semibold text-foreground">
                      Lyrics aren&apos;t available yet
                    </p>
                    <p className="mt-0.5 text-[11px] text-foreground/70">
                      Add Original &amp; Romanized lyrics in the Admin Studio to view them here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 6. End Session Button */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                stopListening();
              }}
              className="press mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-glass-border bg-glass/40 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Square size={13} /> End session
            </button>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Swipe down or tap top arrow to minimize · playback continues
            </p>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* FULLSCREEN GLASSMORPHIC SPOTIFY LYRICS OVERLAY (00:05–00:13 in video) */}
        {/* ===================================================================== */}
        {lyricsFullscreen && (
          <div
            role="dialog"
            aria-label={`${currentTrack.title} full lyrics`}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 z-30 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Layered Glassmorphism Backdrop with Album Cover Blur & Theme Orbs */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-3xl backdrop-saturate-150" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-45"
              style={{
                background:
                  "radial-gradient(circle at 20% 15%, color-mix(in oklab, var(--primary) 58%, transparent) 0%, transparent 55%), radial-gradient(circle at 82% 80%, color-mix(in oklab, var(--accent) 52%, transparent) 0%, transparent 60%)",
              }}
            />

            {/* Top Sticky Fullscreen Header (Collapse Button + Song Title & Artist + Minimize Icon) */}
            <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLyricsFullscreen(false);
                }}
                aria-label="Collapse full lyrics"
                className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-white/20"
              >
                <ChevronDown size={20} />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-sm font-bold text-foreground">{currentTrack.title}</p>
                <p className="truncate text-xs text-foreground/75">
                  {currentTrack.artist ?? "IVE"} · {album?.title}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLyricsFullscreen(false);
                }}
                aria-label="Exit fullscreen lyrics"
                className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-white/20"
              >
                <Minimize2 size={16} />
              </button>
            </div>

            {/* Center Frosted Glass Scrollable Full Lyrics Frame */}
            <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-4 py-1">
              <div
                className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/20 backdrop-blur-2xl backdrop-saturate-150"
                style={{
                  background:
                    "linear-gradient(155deg, color-mix(in oklab, var(--primary) 22%, rgba(255,255,255,0.12)) 0%, color-mix(in oklab, var(--card) 68%, rgba(10,10,20,0.48)) 55%, color-mix(in oklab, var(--accent) 20%, rgba(255,255,255,0.08)) 100%)",
                  boxShadow:
                    "inset 0 1px 1px rgba(255, 255, 255, 0.3), 0 24px 56px -16px rgba(0, 0, 0, 0.65)",
                }}
              >
                <div className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-6 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {lyricLines.map((line, idx) =>
                    line.trim().length === 0 ? (
                      <div key={`gap-${idx}`} className="h-3" aria-hidden="true" />
                    ) : (
                      <p
                        key={`full-${idx}`}
                        className="select-text text-[20px] font-bold leading-[1.46] tracking-tight text-foreground/95 transition-colors hover:text-white sm:text-[22px]"
                      >
                        {line}
                      </p>
                    ),
                  )}
                  <div className="pt-4 pb-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                      IVE: Dive Archive ·{" "}
                      {lyricLang === "original" ? originalScriptLabel : "Romanized"} Lyrics
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Frosted Glass Transport Dock (2-Part Original/Romanized Switcher + Scrubber + Play/Pause) */}
            <div className="relative z-10 mx-auto w-full max-w-md shrink-0 px-5 pt-3 pb-7">
              {/* Row 1: Spotify-Style Bottom "Translate" / 2-Part Glassmorphic Pill Bar */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 p-1 shadow-md backdrop-blur-2xl">
                  <span className="flex items-center gap-1 pl-2.5 pr-1 text-[11px] font-semibold text-foreground/80">
                    <Languages size={13} className="text-primary" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setLyricLang("original")}
                    className={cn(
                      "press rounded-full px-3 py-1 text-xs font-bold transition-all",
                      lyricLang === "original"
                        ? "bg-primary text-primary-foreground shadow-[0_2px_12px_var(--primary)]"
                        : "text-foreground/75 hover:text-foreground",
                    )}
                  >
                    {originalScriptLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLyricLang("romanized")}
                    className={cn(
                      "press rounded-full px-3 py-1 text-xs font-bold transition-all",
                      lyricLang === "romanized"
                        ? "bg-primary text-primary-foreground shadow-[0_2px_12px_var(--primary)]"
                        : "text-foreground/75 hover:text-foreground",
                    )}
                  >
                    Romanized
                  </button>
                </div>

                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-foreground/75 backdrop-blur-xl">
                  {lyricLines.filter((l) => l.trim().length > 0).length} lines
                </span>
              </div>

              {/* Row 2: Scrubber + Elapsed / Total Time */}
              <div>
                <CurvedProgress
                  progress={progress}
                  total={total}
                  onSeek={seek}
                  variant="expanded"
                />
                <div className="mt-1 flex justify-between text-[11px] font-medium tabular-nums text-foreground/75">
                  <span>{formatDuration(progress)}</span>
                  <span>{formatDuration(total)}</span>
                </div>
              </div>

              {/* Row 3: Centered Transport Controls */}
              <div className="mt-2 flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={previous}
                  aria-label="Previous track"
                  className="press grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 text-foreground backdrop-blur-xl transition-colors hover:bg-white/20"
                >
                  <SkipBack size={20} />
                </button>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="press grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl glow"
                >
                  {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next track"
                  className="press grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 text-foreground backdrop-blur-xl transition-colors hover:bg-white/20"
                >
                  <SkipForward size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
