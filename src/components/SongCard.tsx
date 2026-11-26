import { memo } from "react";
import { FileText, Pause, Play } from "lucide-react";
import type { Track } from "@/types";
import { trackDuration } from "@/data/albums";
import { useCatalog } from "@/lib/catalog";
import { formatDuration } from "@/lib/format";
import { usePlayerControls } from "@/lib/player";
import { ArtworkImage } from "./ArtworkImage";
import { FavoriteButton } from "./FavoriteButton";
import { EqualizerBars } from "./EqualizerBars";
import { cn } from "@/lib/utils";

export const SongCard = memo(function SongCard({
  track,
  queue,
  index,
}: {
  track: Track;
  queue?: string[];
  index?: number;
}) {
  const { currentTrack, isPlaying, playTrack, toggle } = usePlayerControls();
  const { getAlbum, getTrackArtwork } = useCatalog();
  const album = getAlbum(track.albumId);
  const isCurrent = currentTrack?.id === track.id;
  const artwork = getTrackArtwork(track);

  const handlePlay = () => {
    if (isCurrent) toggle();
    else playTrack(track.id, queue);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handlePlay}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handlePlay();
        }
      }}
      aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      className={cn(
        "press group relative flex w-full cursor-pointer select-none items-center gap-3.5 rounded-2xl px-2.5 py-2.5 transition-all duration-200",
        isCurrent
          ? "bg-primary/[0.11] ring-1 ring-inset ring-primary/35 shadow-[0_8px_28px_-12px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
          : "hover:bg-white/[0.04] active:bg-white/[0.06]",
      )}
    >
      {/* Active Left Accent Pillar */}
      {isCurrent && (
        <span
          aria-hidden="true"
          className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-primary shadow-[0_0_10px_var(--primary)]"
        />
      )}

      {/* Optional Track Index (Editorial Liner Notes Number) */}
      {typeof index === "number" && (
        <span
          className={cn(
            "w-5 shrink-0 text-center font-mono text-[11px] tabular-nums transition-colors",
            isCurrent ? "font-bold text-primary" : "text-muted-foreground/60",
          )}
        >
          {String(index).padStart(2, "0")}
        </span>
      )}

      {/* Spotify-Style Crisp Rounded-Square Collector Cover */}
      <div
        className={cn(
          "relative h-12 w-12 shrink-0 overflow-hidden rounded-[9px] border bg-surface shadow-md transition-transform duration-300 group-hover:scale-[1.02]",
          isCurrent ? "border-primary/50" : "border-white/12",
        )}
      >
        <ArtworkImage
          src={artwork}
          alt={`${track.title} artwork`}
          kind="song"
          width={96}
          height={96}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        {/* Subtle Foil Glint */}
        <div className="photocard-foil pointer-events-none absolute inset-0 opacity-40" />

        {/* Live Playing / Hover Overlay on Artwork */}
        <div
          className={cn(
            "absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-[1.5px] transition-opacity duration-200",
            isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {isCurrent ? (
            isPlaying ? (
              <EqualizerBars active className="text-primary drop-shadow" />
            ) : (
              <Play size={16} className="ml-0.5 fill-white text-white" />
            )
          ) : (
            <Play size={15} className="ml-0.5 fill-white/95 text-white/95" />
          )}
        </div>
      </div>

      {/* Editorial Track Title, Badges & Era Subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "truncate text-[14px] font-semibold tracking-tight transition-colors",
              isCurrent ? "text-primary" : "text-foreground",
            )}
          >
            {track.title}
          </p>

          {track.isTitleTrack && (
            <span className="shrink-0 rounded-full border border-primary/35 bg-primary/12 px-1.5 py-[1px] font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-primary">
              Title
            </span>
          )}

          {track.isSolo && (
            <span className="shrink-0 rounded-full border border-accent/35 bg-accent/12 px-1.5 py-[1px] font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-accent">
              Solo
            </span>
          )}

          {track.lyricsAvailable && (
            <span
              title="Lyrics available"
              className="inline-flex shrink-0 items-center rounded bg-white/[0.08] px-1 py-[1.5px] font-mono text-[8px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <FileText size={8} className="mr-0.5 text-primary/80" />
              LYR
            </span>
          )}
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="truncate font-medium text-foreground/70">{track.artist ?? "IVE"}</span>
          <span className="shrink-0 opacity-45">·</span>
          <span className="truncate">{album?.title ?? "IVE Archive"}</span>
          {track.language && track.language !== "Korean" && (
            <>
              <span className="shrink-0 opacity-45">·</span>
              <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-wider text-primary/80">
                {track.language === "Japanese"
                  ? "JP"
                  : track.language === "English"
                    ? "EN"
                    : track.language}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Column: Monospace Duration + Minimalist Heart */}
      <div
        className="flex shrink-0 items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            isCurrent ? "font-semibold text-primary" : "text-muted-foreground/75",
          )}
        >
          {isCurrent && isPlaying ? (
            <Pause size={13} className="inline text-primary" />
          ) : (
            formatDuration(trackDuration(track))
          )}
        </span>
        <FavoriteButton kind="song" id={track.id} size="sm" />
      </div>
    </div>
  );
});
