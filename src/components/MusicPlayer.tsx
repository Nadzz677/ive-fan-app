import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Pause, Play, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { trackDuration } from "@/data/albums";
import { useCatalog } from "@/lib/catalog";
import { usePlayer } from "@/lib/player";
import { STUDIO_ROUTE_PATH } from "@/lib/studio-route";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "./ArtworkImage";
import { CurvedProgress } from "./CurvedProgress";
import { FavoriteButton } from "./FavoriteButton";

const SWIPE_THRESHOLD = 45;

export function MusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    effectiveDuration,
    shuffle,
    expanded,
    toggle,
    next,
    previous,
    seek,
    toggleShuffle,
    setExpanded,
  } = usePlayer();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [dragX, setDragX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  // Delay disabling pointer-events after expanding so mobile's synthesized `click` event
  // hits this container (and gets swallowed) instead of passing through to cards underneath!
  const [allowPointerThrough, setAllowPointerThrough] = useState(false);

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const lastExpandToggleRef = useRef<number>(0);

  useEffect(() => {
    if (expanded) {
      const id = window.setTimeout(() => setAllowPointerThrough(true), 320);
      return () => window.clearTimeout(id);
    }
    setAllowPointerThrough(false);
    return undefined;
  }, [expanded]);

  const { getAlbum, getTrackArtwork } = useCatalog();

  if (!currentTrack || pathname.startsWith(STUDIO_ROUTE_PATH)) return null;

  const album = getAlbum(currentTrack.albumId);
  const total = effectiveDuration || trackDuration(currentTrack);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, [role="slider"], input, a')) {
      return;
    }
    if (e.button !== 0 && e.pointerType === "mouse") return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    didSwipeRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startX.current === null || startY.current === null) return;
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;

    if (!swiping && Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      setSwiping(true);
      didSwipeRef.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    if (swiping) {
      e.stopPropagation();
      setDragX(deltaX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (startX.current === null) return;

    if (swiping) {
      if (dragX > SWIPE_THRESHOLD) {
        next();
      } else if (dragX < -SWIPE_THRESHOLD) {
        previous();
      }
    }

    startX.current = null;
    startY.current = null;
    setSwiping(false);
    setDragX(0);
  };

  const handleSurfaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }

    const target = e.target as HTMLElement | null;
    if (target?.closest('button, [role="slider"], input, a')) {
      return;
    }

    lastExpandToggleRef.current = Date.now();
    setExpanded(true);
  };

  const visualTranslate = Math.max(-50, Math.min(50, dragX * 0.35));

  return (
    <div
      className="fixed inset-x-0 bottom-[4.35rem] z-40 px-3.5 transition-opacity duration-200"
      style={{
        opacity: expanded ? 0 : 1,
        pointerEvents: expanded && allowPointerThrough ? "none" : "auto",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleSurfaceClick}
        style={{
          transform: `translateX(${visualTranslate}px)`,
          transition: swiping ? "none" : "transform 0.28s var(--ease-spring)",
        }}
        className={cn(
          "glass-panel relative mx-auto max-w-md cursor-pointer select-none overflow-hidden rounded-[14px] px-2.5 pb-0.5 pt-1.5 touch-pan-y transition-shadow",
          swiping && "ring-1 ring-primary/50 shadow-lg",
        )}
      >
        {/* Subtle internal ambient aura behind the Spotify-style bar */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 -bottom-2 h-6 opacity-35 blur-xl"
          style={{
            background:
              "linear-gradient(90deg, var(--primary) 0%, oklch(0.76 0.23 330) 45%, var(--accent) 80%, var(--highlight) 100%)",
          }}
        />

        <div className="relative flex items-center gap-2.5">
          {/* Spotify-style rounded-square album cover */}
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[6px] border border-white/15 bg-surface shadow-md">
            <ArtworkImage
              src={getTrackArtwork(currentTrack)}
              alt={`${currentTrack.title} artwork`}
              kind="song"
              loading="lazy"
              width={72}
              height={72}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Compact Spotify-style Title • Artist/Album */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-bold tracking-tight text-foreground">
                {currentTrack.title}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">•</span>
              <span className="truncate text-[11px] font-medium text-muted-foreground">
                {currentTrack.artist ?? "IVE"}
              </span>
            </div>
            <span className="block truncate font-mono text-[9px] uppercase tracking-wider text-primary/90">
              {album?.title ?? "IVE Archive"}
            </span>
          </div>

          {/* Right Controls: Shuffle, Favorite, Prev, Play/Pause, Next */}
          <div
            className="flex shrink-0 items-center gap-0.5"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
              aria-pressed={shuffle}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggleShuffle();
              }}
              className={cn(
                "press relative grid h-7 w-7 place-items-center rounded-full transition-colors",
                shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Shuffle size={13} />
              {shuffle && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />}
            </button>

            <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <FavoriteButton kind="song" id={currentTrack.id} size="sm" />
            </div>

            <button
              type="button"
              aria-label="Previous track"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                previous();
              }}
              className="press grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <SkipBack size={14} />
            </button>

            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (expanded || Date.now() - lastExpandToggleRef.current < 320) return;
                toggle();
              }}
              className="press grid h-8 w-8 place-items-center rounded-full text-foreground hover:text-primary"
            >
              {isPlaying ? (
                <Pause size={17} className="fill-current" />
              ) : (
                <Play size={17} className="ml-0.5 fill-current" />
              )}
            </button>

            <button
              type="button"
              aria-label="Next track"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="press grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <SkipForward size={14} />
            </button>
          </div>
        </div>

        {/* Flush Curly Glowing Aura Progress Seam between Mini Player and BottomNav */}
        <div
          className="relative -mx-1 mt-0.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CurvedProgress progress={progress} total={total} onSeek={seek} variant="docked" />
        </div>
      </div>
    </div>
  );
}
