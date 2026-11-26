import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Disc3, Heart, ListMusic, Users } from "lucide-react";
import { useCatalog } from "@/lib/catalog";
import { useFavorites } from "@/lib/favorites";
import { AlbumCard } from "@/components/AlbumCard";
import { MemberCard } from "@/components/MemberCard";
import { SongCard } from "@/components/SongCard";
import { EmptyState, PageHeader, SectionHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Your IVE Favorites — Dive Archive" },
      {
        name: "description",
        content: "Your saved IVE songs, albums and members, kept on this device.",
      },
      { property: "og:title", content: "Your IVE Favorites — Dive Archive" },
      {
        property: "og:description",
        content: "Favorite songs, albums and members saved locally in the archive.",
      },
    ],
  }),
  component: FavoritesPage,
});

type Tab = "all" | "songs" | "albums" | "members";

const tabs: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "songs", label: "Songs" },
  { id: "albums", label: "Albums" },
  { id: "members", label: "Members" },
];

function BrowseButton({
  to,
  label,
}: {
  to: "/music" | "/discography" | "/members";
  label: string;
}) {
  return (
    <Link
      to={to}
      className="press inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground glow"
    >
      {label}
    </Link>
  );
}

function FavoritesPage() {
  const { favorites } = useFavorites();
  const { getAlbum, getTrack, getMember } = useCatalog();
  const [tab, setTab] = useState<Tab>("all");

  const songs = favorites.song.map(getTrack).filter((t) => !!t);
  const savedAlbums = favorites.album.map(getAlbum).filter((a) => !!a);
  const savedMembers = favorites.member.map(getMember).filter((m) => !!m);
  const totalSaved = songs.length + savedAlbums.length + savedMembers.length;

  const showSongs = tab === "songs" || (tab === "all" && songs.length > 0);
  const showAlbums = tab === "albums" || (tab === "all" && savedAlbums.length > 0);
  const showMembers = tab === "members" || (tab === "all" && savedMembers.length > 0);

  return (
    <div className="pb-6">
      <PageHeader
        title="Favorites"
        subtitle="Your curated IVE songs, albums, and biases — synced to your library."
      />

      <div className="mb-6 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cn(
              "press min-h-9 shrink-0 rounded-full px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
              tab === id
                ? "bg-primary text-primary-foreground glow"
                : "border border-glass-border bg-surface/60 text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {totalSaved === 0 && (
        <EmptyState
          icon={<Heart size={22} />}
          title="No favorites yet"
          description="Tap the heart on any song, album, or member photocard to collect them here."
          action={
            <Link
              to="/music"
              className="press inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground glow"
            >
              <ListMusic size={14} /> Browse music
            </Link>
          }
        />
      )}

      {totalSaved > 0 && showSongs && (
        <section className="mb-9">
          <SectionHeader eyebrow={`${songs.length} TRACKS`} title="Saved Songs" />
          {songs.length > 0 ? (
            <div className="px-3">
              <div className="editorial-rule divide-y divide-white/[0.06] border-t pt-1">
                {songs.map((track, idx) => (
                  <div key={track.id} className="py-0.5">
                    <SongCard track={track} queue={songs.map((t) => t.id)} index={idx + 1} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<ListMusic size={20} />}
              title="No favorite songs"
              description="Heart a track in the Music tab to build your personal setlist."
              action={<BrowseButton to="/music" label="Browse music" />}
            />
          )}
        </section>
      )}

      {totalSaved > 0 && showAlbums && (
        <section className="mb-9">
          <SectionHeader eyebrow={`${savedAlbums.length} RELEASES`} title="Saved Albums" />
          {savedAlbums.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 px-5 sm:grid-cols-3">
              {savedAlbums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Disc3 size={20} />}
              title="No favorite albums"
              description="Save a release from the Discography archive."
              action={<BrowseButton to="/discography" label="Browse archive" />}
            />
          )}
        </section>
      )}

      {totalSaved > 0 && showMembers && (
        <section className="mb-9">
          <SectionHeader eyebrow={`${savedMembers.length} PHOTOCARDS`} title="Saved Members" />
          {savedMembers.length > 0 ? (
            <div className="grid grid-cols-2 gap-3.5 px-5 sm:grid-cols-3">
              {savedMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users size={20} />}
              title="No favorite members"
              description="Pick your bias from the Members photocard gallery."
              action={<BrowseButton to="/members" label="Browse members" />}
            />
          )}
        </section>
      )}
    </div>
  );
}
