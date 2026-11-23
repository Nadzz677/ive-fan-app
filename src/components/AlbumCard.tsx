import { Link } from "@tanstack/react-router";
import type { Album } from "@/types";
import { releaseYear } from "@/lib/format";
import { albumTrackCount } from "@/data/albums";
import { ArtworkImage } from "./ArtworkImage";
import { FavoriteButton } from "./FavoriteButton";

interface AlbumCardProps {
  album: Album;
  variant?: "grid" | "rail";
}

export function AlbumCard({ album, variant = "grid" }: AlbumCardProps) {
  const isRail = variant === "rail";

  return (
    <Link
      to="/discography/$albumId"
      params={{ albumId: album.id }}
      className={`press group block ${isRail ? "w-40 shrink-0 snap-start" : ""}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-glass-border bg-surface shadow-[var(--shadow-card)]">
        <ArtworkImage
          src={album.cover}
          alt={`${album.title} album artwork`}
          kind="album"
          width={1024}
          height={1024}
          loading="lazy"
          className="transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        <div
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl"
          aria-hidden="true"
        />
        <div className="absolute right-2 top-2">
          <FavoriteButton kind="album" id={album.id} size="sm" />
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary/90">
          {releaseYear(album.releaseDate)} · {album.type}
        </p>
        <p className="font-editorial mt-0.5 truncate text-xl font-semibold leading-tight">
          {album.title}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {albumTrackCount(album)} {albumTrackCount(album) === 1 ? "track" : "tracks"}
        </p>
      </div>
    </Link>
  );
}
