import { useRef, useState } from "react";
import { Pause, Play, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { trackDuration } from "@/data/albums";
import { useCatalog } from "@/lib/catalog";
import { usePlayer } from "@/lib/player";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "./ArtworkImage";
import { CurvedProgress } from "./CurvedProgress";

const SWIPE_THRESHOLD = 45;

export function MusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    shuffle,
    expanded,
    toggle,
    next,
    previous,
    seek,
    toggleShuffle,
    setExpanded,
  } = usePlayer();

  const [dragX, setDragX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const moved = useRef(false);

  const { getAlbum, getTrackArtwork } = useCatalog();

  if (!currentTrack) return null;

  const album = getAlbum(currentTrack.albumId);
  const total = trackDuration(currentTrack);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent dragging or tap triggers if user clicked on any interactive control
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, [role="slider"], input, a')) {
      return;
    }
    // Only track if left mouse button or touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    moved.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startX.current === null || startY.current === null) return;
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;

    // Detect intentional horizontal drag vs vertical page scroll
    if (!swiping && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      setSwiping(true);
      moved.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    if (swiping) {
      setDragX(deltaX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (startX.current === null) return;

    if (swiping) {
      if (dragX > SWIPE_THRESHOLD) {
        // Swipe Right -> Next track
        next();
      } else if (dragX < -SWIPE_THRESHOLD) {
        // Swipe Left -> Previous track
        previous();
      }
    } else if (!moved.current) {
      // Direct tap on player surface opens full-screen player
      setExpanded(true);
    }

    startX.current = null;
    startY.current = null;
    setSwiping(false);
    setDragX(0);
    moved.current = false;
  };

  const visualTranslate = Math.max(-50, Math.min(50, dragX * 0.35));

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-40 px-3 transition-opacity duration-200"
      style={{ opacity: expanded ? 0 : 1, pointerEvents: expanded ? "none" : undefined }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${visualTranslate}px)`,
          transition: swiping ? "none" : "transform 0.28s var(--ease-spring)",
        }}
        className={cn(
          "glass-panel fade-up mx-auto max-w-lg overflow-hidden rounded-2xl p-2 cursor-pointer touch-pan-y select-none transition-shadow",
          swiping && "ring-1 ring-primary/40 shadow-lg",
        )}
      >
        <div className="flex items-center gap-2">
          {/* Album artwork */}
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-surface border border-glass-border">
            <ArtworkImage
              src={getTrackArtwork(currentTrack)}
              alt={`${currentTrack.title} artwork`}
              kind="song"
              loading="lazy"
              width={80}
              height={80}
            />
          </div>

          {/* Track info - tap opens player */}
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold leading-tight">
              {currentTrack.title}
            </span>
            <span className="block truncate text-[10px] leading-tight text-muted-foreground">
              IVE · {album?.title}
            </span>
          </div>

          {/* Controls: Shuffle, Prev, Play/Pause, Next */}
          <div
            className="flex shrink-0 items-center gap-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Shuffle toggle button */}
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
                "press relative grid h-8 w-8 place-items-center rounded-full transition-colors",
                shuffle
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Shuffle size={14} />
              {shuffle && (
                <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>

            {/* Previous track */}
            <button
              type="button"
              aria-label="Previous track"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                previous();
              }}
              className="press grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <SkipBack size={15} />
            </button>

            {/* Play / Pause */}
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              className="press grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground glow"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>

            {/* Next track */}
            <button
              type="button"
              aria-label="Next track"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="press grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <SkipForward size={15} />
            </button>
          </div>
        </div>

        {/* Curved Progress Track */}
        <div
          className="mt-1 px-0.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CurvedProgress progress={progress} total={total} onSeek={seek} variant="compact" />
        </div>
      </div>
    </div>
  );
}
