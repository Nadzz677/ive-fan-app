import { Disc3 } from "lucide-react";
import { extractYouTubeId, resolveDirectAudioUrl } from "@/lib/player";
import { cn } from "@/lib/utils";
import type { Album, Member, NewsItem, Track } from "@/types";
import { APEX_COLORS, type AdminTheme } from "./apex-theme";
import { SparklineKpiCard } from "./SparklineKpiCard";
import { WorldReachMap } from "./WorldReachMap";

interface AdminDashboardOverviewProps {
  albums: Album[];
  tracks: Track[];
  members: Member[];
  news: NewsItem[];
  pendingCount: number;
  isLight: boolean;
  theme: AdminTheme;
  onNavigateTab: (tab: "albums" | "tracks" | "members" | "news" | "seed") => void;
  onInspectAlbum: (album: Album) => void;
}

/**
 * Small Apex-style zigzag upward trend icon (`↗`) rendered next to each metric in the Orders/Global tables.
 */
function ZigzagTrendIcon({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="12"
      viewBox="0 0 20 12"
      fill="none"
      className="inline-block shrink-0"
      aria-hidden="true"
    >
      <path
        d="M1.5 10.5L7 5.5L11 8.5L18.5 1.5M18.5 1.5H13.5M18.5 1.5V6.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminDashboardOverview({
  albums,
  tracks,
  members,
  news,
  pendingCount,
  isLight,
  theme,
  onNavigateTab,
  onInspectAlbum,
}: AdminDashboardOverviewProps) {
  // Computed live catalog metrics
  const totalTracks = Math.max(1, tracks.length);
  const totalAlbums = Math.max(1, albums.length);

  const tracksWithAudio = tracks.filter((t) =>
    Boolean(extractYouTubeId(t.youtubeUrl) || resolveDirectAudioUrl(t.audioUrl)),
  ).length;
  const directAudioTracks = tracks.filter((t) =>
    Boolean(resolveDirectAudioUrl(t.audioUrl)),
  ).length;
  const tracksWithLyrics = tracks.filter((t) => Boolean(t.lyricsAvailable)).length;
  const albumsWithCover = albums.filter((a) => Boolean(a.cover?.trim())).length;

  const audioPct = Math.round((tracksWithAudio / totalTracks) * 100);
  const lyricsPct = Math.round((tracksWithLyrics / totalTracks) * 100);
  const artworkPct = Math.round((albumsWithCover / totalAlbums) * 100);
  const syncHealthPct =
    pendingCount === 0 ? 100 : Math.max(55, 100 - pendingCount * 6);

  // Language breakdown counts for the "Catalog Breakdown" (Orders-style) vertical bar chart
  const krTracksCount = tracks.filter((t) => (t.language ?? "Korean") === "Korean").length;
  const jpTracksCount = tracks.filter((t) => t.language === "Japanese").length;
  const enTracksCount = tracks.filter((t) => t.language === "English").length;
  const titleTracksCount = tracks.filter((t) => Boolean(t.isTitleTrack)).length;

  const krAlbumsCount = albums.filter((a) => (a.language ?? "Korean") === "Korean").length;
  const jpAlbumsCount = albums.filter((a) => a.language === "Japanese").length;

  const tickerColors = [
    APEX_COLORS.green,
    APEX_COLORS.yellow,
    APEX_COLORS.pink,
    APEX_COLORS.blue,
  ];

  // Chronological releases (up to 12) for the bottom "Releases & Audio Stream Timeline" combo chart
  const chronoAlbums = [...albums]
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .slice(-11);

  const maxAlbumTrackCount = Math.max(
    12,
    ...chronoAlbums.map((a) => Math.max(a.trackCount || 0, 2)),
  );

  // Build smooth pink spline curve points over the 11 release columns in the bottom combo chart
  const timelineColumns = chronoAlbums.map((album, idx) => {
    const albumTracks = tracks.filter((t) => t.albumId === album.id);
    const count = albumTracks.length || album.trackCount || 2;
    const linked = albumTracks.filter((t) =>
      Boolean(extractYouTubeId(t.youtubeUrl) || resolveDirectAudioUrl(t.audioUrl)),
    ).length;
    // Aesthetic wave height blending linked audio ratio + era momentum (matches Apex's flowing pink curve)
    const waveRatio = Math.min(
      0.92,
      Math.max(
        0.25,
        0.38 +
          0.24 * Math.sin(idx * 1.15) +
          (linked / Math.max(1, count)) * 0.25,
      ),
    );
    return {
      album,
      shortLabel:
        album.title.length > 11 ? `${album.title.slice(0, 10)}…` : album.title,
      count,
      linked,
      waveRatio,
    };
  });

  const chartW = 920;
  const chartH = 220;
  const padX = 52;
  const usableW = chartW - padX * 2;
  const colStep =
    timelineColumns.length > 1 ? usableW / (timelineColumns.length - 1) : usableW;

  const lineCoords = timelineColumns.map((col, idx) => ({
    x: padX + idx * colStep,
    y: chartH - 36 - col.waveRatio * (chartH - 72),
  }));

  let comboLineD = "";
  if (lineCoords.length > 0) {
    comboLineD = `M ${lineCoords[0]!.x.toFixed(1)},${lineCoords[0]!.y.toFixed(1)}`;
    for (let i = 0; i < lineCoords.length - 1; i++) {
      const c = lineCoords[i]!;
      const n = lineCoords[i + 1]!;
      const cpx1 = c.x + (n.x - c.x) * 0.45;
      const cpx2 = c.x + (n.x - c.x) * 0.55;
      comboLineD += ` C ${cpx1.toFixed(1)},${c.y.toFixed(1)} ${cpx2.toFixed(1)},${n.y.toFixed(1)} ${n.x.toFixed(1)},${n.y.toFixed(1)}`;
    }
  }

  const barChartItems = [
    {
      label: "Korean",
      count: krTracksCount,
      color: APEX_COLORS.pink,
      pct: Math.min(100, Math.max(24, Math.round((krTracksCount / totalTracks) * 115))),
    },
    {
      label: "Japanese",
      count: jpTracksCount,
      color: APEX_COLORS.blue,
      pct: Math.min(100, Math.max(38, Math.round((jpTracksCount / totalTracks) * 260))),
    },
    {
      label: "Title Songs",
      count: titleTracksCount,
      color: APEX_COLORS.green,
      pct: Math.min(100, Math.max(32, Math.round((titleTracksCount / totalTracks) * 240))),
    },
    {
      label: "English",
      count: enTracksCount,
      color: APEX_COLORS.yellow,
      pct: Math.min(100, Math.max(24, Math.round((enTracksCount / totalTracks) * 320))),
    },
  ];

  return (
    <div className="space-y-5">
      {/* ROW 1: APEX HORIZONTAL COLORED PILL TICKER STRIP */}
      <div
        className={cn(
          "flex items-center gap-6 overflow-x-auto rounded-lg border px-4 py-2.5 no-scrollbar",
          theme.panelBg,
        )}
      >
        {albums.slice(0, 9).map((album, idx) => {
          const badgeColor = tickerColors[idx % tickerColors.length]!;
          return (
            <button
              key={album.id}
              type="button"
              onClick={() => {
                onInspectAlbum(album);
                onNavigateTab("albums");
              }}
              className="group flex shrink-0 items-center gap-2.5 text-left transition-opacity hover:opacity-90"
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white shadow-sm"
                style={{ backgroundColor: badgeColor }}
              >
                <Disc3 size={14} />
              </span>
              <span className="whitespace-nowrap text-xs font-medium">
                <span className={theme.subText}>{album.title}</span>{" "}
                <span className={cn("font-semibold", theme.headingText)}>
                  {album.trackCount} tracks
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ROW 2: 4 APEX SPARKLINE KPI CARDS */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SparklineKpiCard
          valueText={`${audioPct}%`}
          label="Audio Ready"
          subtitle={`Increase in Coverage · ${tracksWithAudio}/${tracks.length} songs`}
          color={APEX_COLORS.blue}
          gradientId="apex-kpi-blue"
          points={[18, 34, 24, 52, 38, 72, 92, 96]}
          panelClass={theme.panelBg}
          headingClass={theme.headingText}
          subTextClass={theme.subText}
          onClick={() => onNavigateTab("tracks")}
        />
        <SparklineKpiCard
          valueText={`${lyricsPct}%`}
          label="Lyrics Index"
          subtitle={`Increase in Average · ${tracksWithLyrics} tracks`}
          color={APEX_COLORS.purple}
          gradientId="apex-kpi-purple"
          points={[15, 32, 22, 48, 35, 68, 88, 94]}
          panelClass={theme.panelBg}
          headingClass={theme.headingText}
          subTextClass={theme.subText}
          onClick={() => onNavigateTab("tracks")}
        />
        <SparklineKpiCard
          valueText={`${artworkPct}%`}
          label="Releases"
          subtitle={`Increase in Catalog · ${albums.length} albums`}
          color={APEX_COLORS.pink}
          gradientId="apex-kpi-pink"
          points={[16, 30, 21, 46, 34, 65, 86, 95]}
          panelClass={theme.panelBg}
          headingClass={theme.headingText}
          subTextClass={theme.subText}
          onClick={() => onNavigateTab("albums")}
        />
        <SparklineKpiCard
          valueText={`${syncHealthPct}%`}
          label="Firestore Sync"
          subtitle={
            pendingCount === 0
              ? "All collections live in production"
              : `${pendingCount} staged change${pendingCount === 1 ? "" : "s"} in queue`
          }
          color={APEX_COLORS.yellow}
          gradientId="apex-kpi-yellow"
          points={[14, 28, 19, 44, 32, 62, 84, 92]}
          panelClass={theme.panelBg}
          headingClass={theme.headingText}
          subTextClass={theme.subText}
          onClick={() => onNavigateTab("seed")}
        />
      </div>

      {/* ROW 3: 2-COLUMN SPLIT — LEFT "CATALOG BREAKDOWN" (BARS) & RIGHT "GLOBAL REACH" (MAP) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left Card: Catalog Breakdown (Matches Apex "Orders" panel) */}
        <div className={cn("rounded-lg border p-5", theme.panelBg)}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className={cn("text-sm font-semibold", theme.headingText)}>
              Catalog Breakdown
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("tracks")}
              className="text-[11px] font-medium text-[#ff3565] hover:underline"
            >
              Manage Songs →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-12">
            {/* Left 5 Cols: 4-Row Bordered Stat Box */}
            <div
              className={cn(
                "divide-y rounded border sm:col-span-5",
                theme.borderClass,
                theme.dividerClass,
              )}
            >
              {[
                {
                  val: `${tracks.length} Songs`,
                  label: "Master Index",
                  color: APEX_COLORS.pink,
                  tab: "tracks" as const,
                },
                {
                  val: `${albums.length} Albums`,
                  label: "Discography",
                  color: APEX_COLORS.blue,
                  tab: "albums" as const,
                },
                {
                  val: `${tracksWithAudio} Linked`,
                  label: "Active Audio",
                  color: APEX_COLORS.green,
                  tab: "tracks" as const,
                },
                {
                  val: `${news.length} Updates`,
                  label: "News & Events",
                  color: APEX_COLORS.yellow,
                  tab: "news" as const,
                },
              ].map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => onNavigateTab(row.tab)}
                  className={cn(
                    "flex w-full flex-col px-3.5 py-2.5 text-left transition-colors",
                    theme.rowHover,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px]"
                      style={{ color: row.color }}
                      aria-hidden="true"
                    >
                      ▸
                    </span>
                    <span className={cn("text-sm font-semibold", theme.headingText)}>
                      {row.val}
                    </span>
                    <ZigzagTrendIcon color={row.color} />
                  </div>
                  <span className={cn("pl-3.5 text-[11px]", theme.subText)}>
                    {row.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Right 7 Cols: 4 Vertical Colored Bars with Dashed Grid Lines */}
            <div className="flex flex-col justify-end sm:col-span-7">
              <div className="relative flex h-[205px] items-end justify-around px-2 pt-4 pb-2">
                {barChartItems.map((bar) => (
                  <div
                    key={bar.label}
                    className="relative flex h-full flex-1 flex-col items-center justify-end"
                  >
                    {/* Vertical dashed separator line on the right of each column */}
                    <div
                      className={cn(
                        "pointer-events-none absolute top-0 right-0 bottom-6 border-r border-dashed",
                        isLight ? "border-[#d8dff5]" : "border-[#323f88]/70",
                      )}
                    />
                    <span className={cn("mb-1.5 text-[10px] font-semibold", theme.subText)}>
                      {bar.count}
                    </span>
                    <div className="flex h-[145px] w-full items-end justify-center">
                      <div
                        className="w-7 rounded-t-xs transition-all duration-300 sm:w-8"
                        style={{
                          height: `${bar.pct}%`,
                          backgroundColor: bar.color,
                          boxShadow: `0 6px 18px -4px ${bar.color}80`,
                        }}
                      />
                    </div>
                    <span className={cn("mt-2.5 text-[11px]", theme.subText)}>
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Global Reach (Matches Apex "Global" panel with World Map) */}
        <div className={cn("rounded-lg border p-5", theme.panelBg)}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className={cn("text-sm font-semibold", theme.headingText)}>
              Global Reach
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("members")}
              className="text-[11px] font-medium text-[#1992ff] hover:underline"
            >
              Member Dossiers →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            {/* Left 5 Cols: 4-Row Bordered Stat Box */}
            <div
              className={cn(
                "divide-y rounded border sm:col-span-5",
                theme.borderClass,
                theme.dividerClass,
              )}
            >
              {[
                {
                  val: `${krAlbumsCount} Releases`,
                  label: "South Korea (KR)",
                  color: APEX_COLORS.pink,
                  tab: "albums" as const,
                },
                {
                  val: `${jpAlbumsCount} Releases`,
                  label: "Japan (JP)",
                  color: APEX_COLORS.blue,
                  tab: "albums" as const,
                },
                {
                  val: `${directAudioTracks} Direct HD`,
                  label: "0ms Cloud Audio",
                  color: APEX_COLORS.green,
                  tab: "tracks" as const,
                },
                {
                  val: `${members.length} Members`,
                  label: "IVE Official Roster",
                  color: APEX_COLORS.yellow,
                  tab: "members" as const,
                },
              ].map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => onNavigateTab(row.tab)}
                  className={cn(
                    "flex w-full flex-col px-3.5 py-2.5 text-left transition-colors",
                    theme.rowHover,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px]"
                      style={{ color: row.color }}
                      aria-hidden="true"
                    >
                      ▸
                    </span>
                    <span className={cn("text-sm font-semibold", theme.headingText)}>
                      {row.val}
                    </span>
                    <ZigzagTrendIcon color={row.color} />
                  </div>
                  <span className={cn("pl-3.5 text-[11px]", theme.subText)}>
                    {row.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Right 7 Cols: Interactive Two-Tone World Map with Glowing Beacons */}
            <div className="sm:col-span-7">
              <WorldReachMap isLight={isLight} />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: FULL-WIDTH BOTTOM COMBO CHART (Matches Apex "Sales & Income" Blue Bars + Pink Wave) */}
      <div className={cn("rounded-lg border p-5", theme.panelBg)}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className={cn("text-sm font-semibold", theme.headingText)}>
              Releases &amp; Audio Stream Timeline
            </h2>
            <p className={cn("text-[11px]", theme.subText)}>
              Click any release column below to open that era directly in the Album Inspector
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-xs"
                style={{ backgroundColor: APEX_COLORS.blue }}
              />
              <span className={theme.subText}>Tracks per Era</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: APEX_COLORS.pink }}
              />
              <span className={theme.subText}>Audio &amp; Stream Velocity</span>
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="h-[225px] min-w-[640px] w-full select-none"
            aria-label="Releases and audio stream timeline chart"
          >
            {/* Dashed vertical grid lines + Sky-Blue bars + clickable era labels */}
            {timelineColumns.map((col, idx) => {
              const cx = padX + idx * colStep;
              const barH = Math.max(
                24,
                Math.round((col.count / maxAlbumTrackCount) * 118),
              );
              const barY = chartH - 32 - barH;
              return (
                <g
                  key={col.album.id}
                  className="cursor-pointer group"
                  onClick={() => {
                    onInspectAlbum(col.album);
                    onNavigateTab("albums");
                  }}
                >
                  {/* Vertical dashed grid line from top to bottom axis */}
                  <line
                    x1={cx}
                    y1={14}
                    x2={cx}
                    y2={chartH - 32}
                    stroke={isLight ? "#d6def5" : "#313e85"}
                    strokeWidth="1"
                    strokeDasharray="3 4"
                  />
                  {/* Blue vertical bar */}
                  <rect
                    x={cx - 11}
                    y={barY}
                    width={22}
                    height={barH}
                    rx={2}
                    fill={APEX_COLORS.blue}
                    className="transition-opacity group-hover:opacity-85"
                  />
                  {/* Era title label along bottom */}
                  <text
                    x={cx}
                    y={chartH - 12}
                    textAnchor="middle"
                    fill={isLight ? "#5e689e" : "#9aa5d9"}
                    fontSize="10"
                    fontWeight="500"
                  >
                    {col.shortLabel}
                  </text>
                </g>
              );
            })}

            {/* Overarching smooth Hot-Pink curve (matches Apex Sales & Income pink wave) */}
            {comboLineD && (
              <path
                d={comboLineD}
                fill="none"
                stroke={APEX_COLORS.pink}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
