import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Disc3, Play, Settings } from "lucide-react";
import { albumTrackCount } from "@/data/albums";
import { getNewsImage } from "@/data/imageAssets";
import { DEFAULT_HERO_IMAGES, useCatalog } from "@/lib/catalog";
import { formatReleaseDate, releaseYear } from "@/lib/format";
import { usePlayerControls } from "@/lib/player";
import { sanitizeHttpsUrl } from "@/lib/url-security";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "@/components/ArtworkImage";
import { MemberCard } from "@/components/MemberCard";
import { SongCard } from "@/components/SongCard";
import { SectionHeader } from "@/components/PageHeader";
import { LatestNewsSection } from "@/components/LatestNewsSection";
import { BirthdayCountdown } from "@/components/BirthdayCountdown";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IVE: Dive Archive — Fan Music & Info App" },
      {
        name: "description",
        content:
          "A fan-made IVE archive: discography, member birthdays, latest updates, and music player in one polished mobile app.",
      },
      { property: "og:title", content: "IVE: Dive Archive" },
      {
        property: "og:description",
        content:
          "Explore IVE discography, latest updates, and songs in a polished fan-made music archive.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { playTrack } = usePlayerControls();
  const { albums, tracks, members, config, getAlbum, getTrack, getAlbumTracks } = useCatalog();
  const featuredAlbum = getAlbum(config.featuredAlbumId) ?? albums[0]!;
  const featuredTrack = getTrack(config.featuredTrackId) ?? tracks[0]!;
  const featuredTrackTotal =
    getAlbumTracks(featuredAlbum.id).length || albumTrackCount(featuredAlbum);

  const [failedHeroUrls, setFailedHeroUrls] = useState<Record<string, boolean>>({});

  const heroImages = useMemo(() => {
    const sanitizeList = (items: string[]) =>
      items
        .map((u) => sanitizeHttpsUrl(u, { allowRelative: true }))
        .filter((u): u is string => Boolean(u && !failedHeroUrls[u]));

    const configured = sanitizeList(config.heroImages ?? []);
    if (configured.length > 0) return configured;
    const defaults = sanitizeList(DEFAULT_HERO_IMAGES);
    if (defaults.length > 0) return defaults;
    const fallback = sanitizeHttpsUrl(getNewsImage("dive-global-archive"), { allowRelative: true });
    return fallback && !failedHeroUrls[fallback] ? [fallback] : [];
  }, [config.heroImages, failedHeroUrls]);

  const [heroIndex, setHeroIndex] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const swipeStartXRef = useRef<number | null>(null);
  const autoTimerResetKeyRef = useRef(0);
  const [timerTick, setTimerTick] = useState(0);

  // Keep active slide index in bounds if slide count changes
  useEffect(() => {
    if (heroIndex >= heroImages.length && heroImages.length > 0) {
      setHeroIndex(0);
    }
  }, [heroIndex, heroImages.length]);

  // Automatic 5-second rotation across Home Screen Hero Photos
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = window.setInterval(() => {
      if (swipeStartXRef.current !== null) return;
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [heroImages.length, timerTick]);

  const handleHeroPointerDown = (e: React.PointerEvent) => {
    if (heroImages.length <= 1) return;
    if ((e.target as HTMLElement).closest("button, a")) return;
    swipeStartXRef.current = e.clientX;
    setDragOffsetX(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleHeroPointerMove = (e: React.PointerEvent) => {
    if (swipeStartXRef.current === null) return;
    setDragOffsetX(e.clientX - swipeStartXRef.current);
  };

  const handleHeroPointerUp = () => {
    if (swipeStartXRef.current === null) return;
    const delta = dragOffsetX;
    swipeStartXRef.current = null;
    setDragOffsetX(0);
    if (Math.abs(delta) > 42 && heroImages.length > 1) {
      if (delta < 0) {
        setHeroIndex((prev) => (prev + 1) % heroImages.length);
      } else {
        setHeroIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
      }
      autoTimerResetKeyRef.current += 1;
      setTimerTick(autoTimerResetKeyRef.current);
    }
  };

  return (
    <div className="pb-10">
      {/* 1. Magazine Cover Hero (Swipeable + 5-Second Auto-Rotating IVE Photo Carousel) */}
      <section
        onPointerDown={handleHeroPointerDown}
        onPointerMove={handleHeroPointerMove}
        onPointerUp={handleHeroPointerUp}
        onPointerCancel={handleHeroPointerUp}
        className="relative min-h-[430px] h-[66vh] max-h-[560px] select-none overflow-hidden bg-surface touch-pan-y"
      >
        {/* Top Bar (Settings button on top-right; top-left DIVE ARCHIVE writing removed) */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-end px-5 pt-4">
          <Link
            to="/settings"
            aria-label="Settings"
            className="press grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-background/55 text-foreground/90 backdrop-blur-md"
          >
            <Settings size={16} />
          </Link>
        </div>

        {heroImages.length > 0 ? (
          <div className="relative h-full w-full">
            {heroImages.map((imgUrl, idx) => {
              const isActive = idx === heroIndex;
              return (
                <img
                  key={`${imgUrl}-${idx}`}
                  src={imgUrl}
                  alt={`IVE Archive Banner ${idx + 1}`}
                  width={1440}
                  height={1024}
                  draggable={false}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedHeroUrls((prev) => (prev[imgUrl] ? prev : { ...prev, [imgUrl]: true }))
                  }
                  style={{
                    transform: isActive
                      ? `translate3d(${dragOffsetX * 0.25}px, 0, 0) scale(1)`
                      : "translate3d(0, 0, 0) scale(1.04)",
                  }}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover object-center transition-all duration-700 ease-out",
                    isActive ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
                  )}
                />
              );
            })}
          </div>
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 20%, color-mix(in oklab, var(--primary) 30%, transparent) 0%, var(--background) 100%)",
            }}
          />
        )}

        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(to top, var(--background) 4%, color-mix(in oklab, var(--background) 62%, transparent) 38%, color-mix(in oklab, var(--background) 22%, transparent) 100%)",
          }}
          aria-hidden="true"
        />

        <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-6">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
              SIX MEMBERS · {tracks.length} TRACKS
            </p>
            {/* Interactive Slide Indicator Dots */}
            {heroImages.length > 1 && (
              <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-background/45 px-2.5 py-1 backdrop-blur-md">
                {heroImages.map((_, idx) => {
                  const active = idx === heroIndex;
                  return (
                    <button
                      key={`hero-dot-${idx}`}
                      type="button"
                      aria-label={`Show hero photo ${idx + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHeroIndex(idx);
                        autoTimerResetKeyRef.current += 1;
                        setTimerTick(autoTimerResetKeyRef.current);
                      }}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        active
                          ? "w-5 bg-primary shadow-[0_0_8px_var(--primary)]"
                          : "w-1.5 bg-foreground/35 hover:bg-foreground/60",
                      )}
                    />
                  );
                })}
              </div>
            )}
          </div>
          <h1 className="font-editorial mt-1.5 text-[3.4rem] font-semibold leading-[0.94] tracking-tight">
            IVE <span className="gradient-accent-text italic font-medium">Dive Archive</span>
          </h1>
          <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            An editorial fan archive of IVE&apos;s eras, photocards, discography, and music.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                playTrack(
                  featuredTrack.id,
                  tracks.map((t) => t.id),
                )
              }
              className="press inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold tracking-wide text-primary-foreground glow"
            >
              <Play size={14} className="fill-current" /> Play {featuredTrack.title}
            </button>
            <Link
              to="/discography"
              className="press inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-background/50 px-4 py-2.5 text-xs font-medium text-foreground backdrop-blur-md"
            >
              <Disc3 size={14} /> Archive
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Horizontal Member Photocard Strip */}
      <section className="mt-7">
        <SectionHeader
          eyebrow="PHOTOCARD COLLECTION"
          title="The Six Members"
          action={
            <Link
              to="/members"
              className="press inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          }
        />
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {members.map((member, i) => (
            <MemberCard key={member.id} member={member} compact index={i + 1} />
          ))}
        </div>
      </section>

      {/* 3. Featured Era Showcase */}
      <section className="mt-9">
        <SectionHeader
          eyebrow={`LATEST ERA // ${releaseYear(featuredAlbum.releaseDate)}`}
          title="Featured Release"
        />
        <div className="px-5">
          <Link
            to="/discography/$albumId"
            params={{ albumId: featuredAlbum.id }}
            className="press group flex items-center gap-4 pb-4 editorial-rule border-b"
          >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-glass-border bg-surface shadow-[var(--shadow-glow)]">
              <ArtworkImage
                src={featuredAlbum.cover}
                alt={`${featuredAlbum.title} album artwork`}
                kind="album"
                loading="lazy"
                width={1024}
                height={1024}
                className="transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
                {featuredAlbum.type} · {featuredTrackTotal}{" "}
                {featuredTrackTotal === 1 ? "track" : "tracks"}
              </p>
              <p className="font-editorial mt-0.5 truncate text-[1.75rem] font-semibold leading-tight group-hover:text-primary transition-colors">
                {featuredAlbum.title}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {formatReleaseDate(featuredAlbum.releaseDate)}
              </p>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {featuredAlbum.description}
              </p>
            </div>
          </Link>
          <div className="mt-3.5">
            <SongCard track={featuredTrack} />
          </div>
        </div>
      </section>

      {/* 4. Compact Editorial Birthday Ticker */}
      <section className="mt-9">
        <SectionHeader eyebrow="CALENDAR" title="Next Celebration" />
        <BirthdayCountdown />
      </section>

      {/* 5. Horizontal Swipeable Editorial News */}
      <section className="mt-9">
        <SectionHeader eyebrow="DISPATCH" title="Latest Updates" />
        <LatestNewsSection />
      </section>

      {/* 6. Minimal Architectural Quick Links */}
      <section className="mt-9 px-5">
        <div className="editorial-rule border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/music"
              className="press group flex items-center justify-between border-b editorial-rule pb-3"
            >
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
                  {tracks.length} TRACKS
                </p>
                <p className="font-editorial text-xl font-semibold group-hover:text-primary transition-colors">
                  Music Library
                </p>
              </div>
              <ArrowRight size={15} className="text-muted-foreground group-hover:text-primary" />
            </Link>
            <Link
              to="/discography"
              className="press group flex items-center justify-between border-b editorial-rule pb-3"
            >
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
                  2021 — 2026
                </p>
                <p className="font-editorial text-xl font-semibold group-hover:text-primary transition-colors">
                  Full Archive
                </p>
              </div>
              <ArrowRight size={15} className="text-muted-foreground group-hover:text-primary" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
