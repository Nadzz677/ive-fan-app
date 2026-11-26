import { createFileRoute, notFound } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { albumTrackCount, getAlbum, hasPartialTracklist } from "@/data/albums";
import { useCatalog } from "@/lib/catalog";
import { formatDuration, formatReleaseDate } from "@/lib/format";
import { usePlayer } from "@/lib/player";
import { ArtworkImage } from "@/components/ArtworkImage";
import { FavoriteButton } from "@/components/FavoriteButton";
import { BackLink } from "@/components/BackLink";
import { EqualizerBars } from "@/components/EqualizerBars";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/discography/$albumId")({
  head: ({ params }) => {
    const album = getAlbum(params.albumId);
    const title = album ? `${album.title} — IVE: Dive Archive` : "Album — IVE: Dive Archive";
    const description = album?.description ?? "IVE release details.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: AlbumDetail,
});

function AlbumDetail() {
  const { albumId } = Route.useParams();
  const { getAlbum: getLiveAlbumById, getAlbumTracks } = useCatalog();
  const album = getLiveAlbumById(albumId);
  if (!album) throw notFound();
  const tracks = getAlbumTracks(album.id);
  const { playTrack, currentTrack, isPlaying, toggle } = usePlayer();
  const queue = tracks.map((t) => t.id);

  return (
    <div className="pb-10">
      <div className="relative px-5 pt-5">
        <BackLink to="/discography" label="Archive" />

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="aspect-square w-full max-w-[260px] overflow-hidden rounded-3xl border border-glass-border bg-surface shadow-[var(--shadow-glow)]">
            <ArtworkImage
              src={album.cover}
              alt={`${album.title} album artwork`}
              kind="album"
              width={1024}
              height={1024}
              fallbackIconSize={56}
              showEmptyLabel
            />
          </div>

          <p className="mt-5 font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-primary">
            {album.type} · {album.language ?? "IVE"}
          </p>
          <h1 className="font-editorial mt-1.5 text-[2.6rem] font-semibold leading-[1.02]">
            {album.title}
          </h1>
          <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
            {formatReleaseDate(album.releaseDate)} · {albumTrackCount(album)}{" "}
            {albumTrackCount(album) === 1 ? "track" : "tracks"}
          </p>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {album.description}
          </p>

          <div className="mt-5 flex items-center gap-2.5">
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (queue[0]) playTrack(queue[0], queue);
                }}
                className="press inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold tracking-wide text-primary-foreground glow"
              >
                <Play size={14} className="fill-current" /> Play Album
              </button>
            )}
            <FavoriteButton kind="album" id={album.id} size="md" />
          </div>
        </div>
      </div>

      {/* Liner-Notes Hairline Tracklist */}
      <div className="fade-up mt-8 px-5">
        <div className="editorial-rule mb-1 flex items-center justify-between border-b pb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
            Tracklist
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Duration
          </span>
        </div>

        <ul className="divide-y divide-white/[0.08]">
          {tracks.map((track, i) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <li key={track.id}>
                <div className="press flex items-center gap-3 py-3">
                  <button
                    type="button"
                    onClick={() => (isCurrent ? toggle() : playTrack(track.id, queue))}
                    aria-label={`Play ${track.title}`}
                    className="w-6 shrink-0 text-center font-mono text-[11px] text-muted-foreground"
                  >
                    {isCurrent ? (
                      <EqualizerBars active={isPlaying} className="mx-auto text-primary" />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => (isCurrent ? toggle() : playTrack(track.id, queue))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        isCurrent ? "text-primary" : "text-foreground",
                      )}
                    >
                      {track.title}
                    </p>
                    {track.isTitleTrack && (
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                        Title Track
                      </p>
                    )}
                  </button>

                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {track.duration ? formatDuration(track.duration) : "--:--"}
                  </span>

                  <FavoriteButton kind="song" id={track.id} size="sm" />

                  <button
                    type="button"
                    onClick={() => (isCurrent ? toggle() : playTrack(track.id, queue))}
                    aria-label={
                      isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`
                    }
                    className={cn(
                      "press grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors",
                      isCurrent
                        ? "bg-primary text-primary-foreground glow"
                        : "border border-glass-border bg-surface/80 text-foreground hover:border-primary/50",
                    )}
                  >
                    {isCurrent && isPlaying ? (
                      <Pause size={13} />
                    ) : (
                      <Play size={13} className="ml-0.5" />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {hasPartialTracklist(album) && (
        <p className="mt-4 px-5 font-mono text-[10px] text-muted-foreground">
          Partial tracklist — {tracks.length} of {albumTrackCount(album)} tracks listed.
        </p>
      )}
    </div>
  );
}
