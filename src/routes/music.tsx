import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Clock, Heart, ListMusic } from "lucide-react";
import { useCatalog } from "@/lib/catalog";
import { useFavorites } from "@/lib/favorites";
import { clearRecentlyPlayed, useRecentlyPlayed } from "@/lib/recently-played";
import { SongCard } from "@/components/SongCard";
import { EmptyState, PageHeader, SectionHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "IVE Music Library — Dive Archive" },
      {
        name: "description",
        content:
          "Browse, search and filter every IVE track in the archive with the built-in player.",
      },
      { property: "og:title", content: "IVE Music Library — Dive Archive" },
      {
        property: "og:description",
        content: "Song library with artwork, favorites, recently played and a persistent player.",
      },
    ],
  }),
  component: MusicPage,
});

type Mode = "all" | "titles" | "solos" | "favorites" | "recent";
type LangFilter = "all" | "Korean" | "Japanese" | "English";

const modes: { id: Mode; label: string }[] = [
  { id: "all", label: "All songs" },
  { id: "titles", label: "Title tracks" },
  { id: "solos", label: "Member solos" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recently played" },
];

const langFilters: { id: LangFilter; label: string }[] = [
  { id: "all", label: "All languages" },
  { id: "Korean", label: "🇰🇷 Korean" },
  { id: "Japanese", label: "🇯🇵 Japanese" },
  { id: "English", label: "🌐 English" },
];

function MusicPage() {
  const { albums, tracks, getTrack } = useCatalog();
  const [mode, setMode] = useState<Mode>("all");
  const [langFilter, setLangFilter] = useState<LangFilter>("all");
  const [albumFilter, setAlbumFilter] = useState<string>("all");
  const { favorites } = useFavorites();
  const recentIds = useRecentlyPlayed();

  const recentTracks = useMemo(() => recentIds.map(getTrack).filter((t) => !!t), [recentIds, getTrack]);

  const visible = useMemo(() => {
    let list =
      mode === "favorites"
        ? favorites.song.map(getTrack).filter((t) => !!t)
        : mode === "recent"
          ? recentTracks
          : mode === "titles"
            ? tracks.filter((t) => t.isTitleTrack)
            : mode === "solos"
              ? tracks.filter((t) => t.isSolo)
              : tracks;

    if (mode === "all" || mode === "titles" || mode === "solos") {
      if (langFilter !== "all") {
        list = list.filter((t) => t.language === langFilter);
      }
      if (albumFilter !== "all") {
        list = list.filter((t) => t.albumId === albumFilter || t.releaseIds.includes(albumFilter));
      }
    }

    return list;
  }, [mode, langFilter, albumFilter, favorites.song, recentTracks, tracks, getTrack]);

  const queue = useMemo(() => visible.map((t) => t.id), [visible]);

  return (
    <div>
      <PageHeader
        title="Music"
        subtitle="Tap any track to stream full eras, member solos, and synchronized lyrics."
      />

      <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {modes.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            aria-pressed={mode === id}
            className={cn(
              "press min-h-10 shrink-0 rounded-full px-4 text-xs font-semibold transition-colors",
              mode === id
                ? "bg-primary text-primary-foreground glow"
                : "glass-panel text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "all" && (
        <>
          {/* Language filter pills */}
          <div className="mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {langFilters.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLangFilter(opt.id)}
                aria-pressed={langFilter === opt.id}
                className={cn(
                  "press min-h-8 shrink-0 rounded-full px-3 text-[11px] font-semibold transition-colors",
                  langFilter === opt.id
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "glass-panel text-muted-foreground/90 border border-transparent",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Album filter pills */}
          <div className="mt-1.5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ id: "all", title: "Every album" }, ...albums].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setAlbumFilter(option.id)}
                aria-pressed={albumFilter === option.id}
                className={cn(
                  "press min-h-8 shrink-0 rounded-full border px-3 text-[11px] font-medium transition-colors",
                  albumFilter === option.id
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-glass-border bg-glass text-muted-foreground",
                )}
              >
                {option.title}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === "recent" && recentTracks.length > 0 && (
        <div className="mt-4">
          <SectionHeader
            title="Recently played"
            action={
              <button
                type="button"
                onClick={clearRecentlyPlayed}
                className="press min-h-9 rounded-full px-3 text-[11px] font-semibold text-muted-foreground"
              >
                Clear
              </button>
            }
          />
        </div>
      )}

      <div className="mt-4 px-3">
        <div className="editorial-rule divide-y divide-white/[0.06] border-t pt-1">
          {visible.map((track, idx) => (
            <div key={track.id} className="py-0.5">
              <SongCard track={track} queue={queue} index={idx + 1} />
            </div>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <div className="mt-2">
          {mode === "favorites" ? (
            <EmptyState
              icon={<Heart size={22} />}
              title="No favorite songs yet"
              description="Tap the heart on a track and it will collect here."
              action={
                <button
                  type="button"
                  onClick={() => setMode("all")}
                  className="press inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground glow"
                >
                  Browse all songs
                </button>
              }
            />
          ) : mode === "recent" ? (
            <EmptyState
              icon={<Clock size={22} />}
              title="Nothing played yet"
              description="Play a song and your listening history shows up here."
              action={
                <button
                  type="button"
                  onClick={() => setMode("all")}
                  className="press inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground glow"
                >
                  Browse all songs
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<ListMusic size={22} />}
              title="No songs in this album yet"
              description="Pick another album filter to keep listening."
            />
          )}
        </div>
      )}
    </div>
  );
}
