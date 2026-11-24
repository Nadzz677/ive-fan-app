import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  FileText,
  Image as ImageIcon,
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
  const [viewMode, setViewMode] = useState<"artwork" | "lyrics">("artwork");
  const [lyricLang, setLyricLang] = useState<"korean" | "romanized">("korean");
  // Post-close shield prevents touch release / synthesized click from hitting background cards while closing
  const [closingShield, setClosingShield] = useState(false);
  const startY = useRef<number | null>(null);
  const lastCloseAtRef = useRef<number>(0);

  useEffect(() => {
    if (!expanded) {
      setDrag(0);
    }
  }, [expanded]);

  const { getAlbum, getTrackArtwork } = useCatalog();

  if (!currentTrack) return null;

  const album = getAlbum(currentTrack.albumId);
  const total = effectiveDuration || trackDuration(currentTrack);

  const close = () => {
    lastCloseAtRef.current = Date.now();
    setClosingShield(true);
    setDrag(0);
    setExpanded(false);
    window.setTimeout(() => setClosingShield(false), 300);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!expanded) return;
    if ((e.target as HTMLElement).closest("button, a, input, [role='button']")) {
      return;
    }
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!expanded || startY.current === null) return;
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
  const activeLyrics =
    lyricLang === "korean" ? currentTrack.lyricsKorean : currentTrack.lyricsRomanized;

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
          transition: dragging
            ? "none"
            : "transform 0.36s var(--ease-spring), opacity 0.26s ease",
        }}
        className="relative h-full w-full overflow-hidden overscroll-contain will-change-transform"
      >
      <div className="stage-gradient absolute inset-0" aria-hidden="true" />
      <div className="relative flex h-full flex-col overflow-y-auto overscroll-contain px-5 pb-8 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

            {/* View Mode Switcher: Artwork / Lyrics */}
            <div
              className="flex items-center gap-1 rounded-full border border-glass-border bg-glass/60 p-0.5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("artwork");
                }}
                className={cn(
                  "press flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all",
                  viewMode === "artwork"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ImageIcon size={12} />
                <span>Artwork</span>
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("lyrics");
                }}
                className={cn(
                  "press flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all",
                  viewMode === "lyrics"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FileText size={12} />
                <span>Lyrics</span>
              </button>
            </div>

            <FavoriteButton kind="song" id={currentTrack.id} size="md" />
          </div>
        </div>

        <div className="mx-auto mt-2 flex w-full max-w-sm flex-1 flex-col justify-between">
          {/* Main Visual Display: Glowing Artwork OR Lyrics Panel */}
          {viewMode === "artwork" ? (
            <div className="relative my-auto flex flex-col items-center">
              {/* Outer Luminous Ambient Aura (Pulses gently with music) */}
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
              <div className="relative aspect-square w-full max-w-[320px] overflow-hidden rounded-[2.2rem] p-[2.5px] shadow-2xl">
                {/* Rotating conic light beam traveling around the perimeter */}
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
          ) : (
            /* Lyrics View with glowing frame and language toggle */
            <div className="relative mx-auto my-auto flex h-[320px] w-full max-w-[320px] flex-col">
              <div
                className="pointer-events-none absolute inset-0 -m-2 rounded-[2.4rem] opacity-40 blur-xl"
                style={{
                  background:
                    "radial-gradient(circle, var(--primary) 0%, var(--accent) 60%, transparent 80%)",
                }}
              />

              <div className="glass-panel relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-glass-border p-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-glass-border pb-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles size={13} />
                    <span>Lyrics</span>
                  </span>

                  {currentTrack.lyricsAvailable && (
                    <div className="flex items-center gap-1 rounded-full border border-glass-border bg-surface/80 p-0.5">
                      <button
                        type="button"
                        onClick={() => setLyricLang("korean")}
                        className={cn(
                          "press rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-colors",
                          lyricLang === "korean"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {currentTrack.language === "Japanese" ? "Japanese" : "Korean"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLyricLang("romanized")}
                        className={cn(
                          "press rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-colors",
                          lyricLang === "romanized"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Romanized
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto py-3 text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {currentTrack.lyricsAvailable && activeLyrics ? (
                    <p className="select-text whitespace-pre-line text-sm font-medium leading-relaxed text-foreground/90">
                      {activeLyrics}
                    </p>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                      <FileText size={28} className="mb-2 text-muted-foreground/60" />
                      <p className="text-xs font-semibold text-foreground">
                        Lyrics aren&apos;t available yet
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Official lyrics will be added as releases update.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Track Metadata & Clean Display */}
          <div className="mt-4">
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

          {/* Curved Progress Bar */}
          <div className="mt-4">
            <CurvedProgress progress={progress} total={total} onSeek={seek} variant="expanded" />
            <div className="mt-1.5 flex justify-between text-[11px] font-medium tabular-nums text-muted-foreground">
              <span>{formatDuration(progress)}</span>
              <span>{formatDuration(total)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div
            className="mt-4 flex items-center justify-between"
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
                <span className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
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
                // Prevent ghost click right after minimizing
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

          {/* End Session */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              stopListening();
            }}
            className="press mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-glass-border bg-glass/40 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Square size={13} /> End session
          </button>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Swipe down or tap top arrow to minimize · playback continues
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
