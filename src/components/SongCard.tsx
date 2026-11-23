import { Pause, Play } from "lucide-react";
import type { Track } from "@/types";
import { trackDuration } from "@/data/albums";
import { useCatalog } from "@/lib/catalog";
import { formatDuration } from "@/lib/format";
import { usePlayer } from "@/lib/player";
import { ArtworkImage } from "./ArtworkImage";
import { FavoriteButton } from "./FavoriteButton";
import { EqualizerBars } from "./EqualizerBars";
import { cn } from "@/lib/utils";

export function SongCard({ track, queue }: { track: Track; queue?: string[] }) {
  const { currentTrack, isPlaying, playTrack, toggle } = usePlayer();
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
      className={cn(
        "glass-panel press flex items-center gap-3 rounded-2xl p-2.5 transition-colors",
        isCurrent && "border-primary/50",
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface border border-glass-border">
        <ArtworkImage
          src={artwork}
          alt={`${track.title} artwork`}
          kind="song"
          width={1024}
          height={1024}
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
          <p className={cn("truncate text-sm font-semibold", isCurrent && "text-primary")}>
            {track.title}
          </p>
          {isCurrent && <EqualizerBars active={isPlaying} className="shrink-0 text-primary" />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {track.language && track.language !== "Korean" && (
            <span className="rounded bg-glass-border px-1.5 py-0.2 text-[9px] font-medium text-muted-foreground">
              {track.language}
            </span>
          )}
          <p className="truncate text-[11px] text-muted-foreground">
            {album?.title} · {formatDuration(trackDuration(track))}
          </p>
        </div>
      </div>
      <FavoriteButton kind="song" id={track.id} size="sm" />
      <button
        type="button"
        onClick={handlePlay}
        aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground glow"
      >
        {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
    </div>
  );
}
