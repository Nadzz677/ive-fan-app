import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { albumTrackCount } from "@/data/albums";
import { useAlbums } from "@/lib/catalog";
import { formatReleaseDate, releaseYear } from "@/lib/format";
import { AlbumCard } from "@/components/AlbumCard";
import { ArtworkImage } from "@/components/ArtworkImage";
import { PageHeader } from "@/components/PageHeader";
import type { Album } from "@/types";

export const Route = createFileRoute("/discography/")({
  head: () => ({
    meta: [
      { title: "IVE Discography — Dive Archive" },
      {
        name: "description",
        content: "Browse IVE singles and albums with artwork, release dates and track counts.",
      },
      { property: "og:title", content: "IVE Discography — Dive Archive" },
      {
        property: "og:description",
        content: "Every IVE release in the archive, newest first.",
      },
    ],
  }),
  component: DiscographyPage,
});

function DiscographyPage() {
  const { data: recentAlbums } = useAlbums();

  const latest = recentAlbums[0];
  const groupedByYear = useMemo(() => {
    const map = new Map<string, Album[]>();
    for (const album of recentAlbums) {
      const yr = releaseYear(album.releaseDate);
      const list = map.get(yr);
      if (list) list.push(album);
      else map.set(yr, [album]);
    }
    return Array.from(map.entries());
  }, [recentAlbums]);

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow={`DISCOGRAPHY // ${recentAlbums.length} RELEASES`}
        title="Archive"
        subtitle="Every verified Korean, Japanese, and global release — organized by year."
      />

      {/* Latest Era Spotlight */}
      {latest && (
        <section className="mb-8 px-5">
          <Link
            to="/discography/$albumId"
            params={{ albumId: latest.id }}
            className="press group relative flex items-center gap-4 rounded-3xl border border-glass-border bg-surface/70 p-3.5 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
          >
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-glass-border bg-surface shadow-[var(--shadow-glow)]">
              <ArtworkImage
                src={latest.cover}
                alt={`${latest.title} album artwork`}
                kind="album"
                width={512}
                height={512}
                className="transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">
                LATEST RELEASE · {latest.type}
              </span>
              <h2 className="font-editorial mt-0.5 truncate text-2xl font-semibold leading-tight group-hover:text-primary transition-colors">
                {latest.title}
              </h2>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {formatReleaseDate(latest.releaseDate)} · {albumTrackCount(latest)} tracks
              </p>
            </div>
            <ArrowUpRight
              size={16}
              className="shrink-0 text-muted-foreground group-hover:text-primary"
            />
          </Link>
        </section>
      )}

      {/* Year-Grouped Shelves */}
      <div className="space-y-9 px-5">
        {groupedByYear.map(([year, list]) => (
          <section key={year}>
            <div className="editorial-rule mb-4 flex items-baseline justify-between border-b pb-2">
              <h2 className="font-editorial text-3xl font-semibold leading-none">{year}</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {list.length} {list.length === 1 ? "release" : "releases"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
