import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Database,
  Disc3,
  Edit3,
  Eye,
  FileText,
  FolderKanban,
  Layers,
  ListMusic,
  Lock,
  LogOut,
  Moon,
  Newspaper,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  clearAllStagedChanges,
  discardStagedChange,
  pushStagedChangesToFirestore,
  seedFirestoreCatalog,
  stageAlbumDelete,
  stageAlbumSave,
  stageAppConfigSave,
  stageMemberSave,
  stageNewsDelete,
  stageNewsSave,
  stageTrackDelete,
  stageTrackSave,
  useCatalog,
  useStagedCatalog,
} from "@/lib/catalog";
import { extractYouTubeId } from "@/lib/player";
import { ArtworkImage } from "@/components/ArtworkImage";
import { cn } from "@/lib/utils";
import type { Album, AlbumType, Member, NewsItem, Track, TrackLanguage } from "@/types";

type AdminTab = "albums" | "tracks" | "members" | "news" | "seed";
type AdminColorMode = "dark" | "light";

const ADMIN_THEME_KEY = "ive-dive-archive:admin-theme";

const ALBUM_TYPES: AlbumType[] = [
  "Mini Album",
  "Studio Album",
  "Single Album",
  "Digital Single",
  "Japanese EP",
  "Japanese Single",
  "Special Album",
];

const LANGUAGES: TrackLanguage[] = ["Korean", "Japanese", "English", "Instrumental"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDurationMmSs(seconds?: number) {
  const total = seconds ?? 180;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function AdminStudioView() {
  const {
    isAdmin,
    email,
    signInAdmin,
    signOutAdmin,
    isCloudEnabled,
    setPreviewingFanApp,
  } = useAuth();
  const { albums, tracks, members, news, config, getAlbumTracks } = useCatalog();
  const { changes, pendingCount } = useStagedCatalog();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<AdminTab>("albums");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Admin Light / Dark theme state (persisted in localStorage)
  const [colorMode, setColorMode] = useState<AdminColorMode>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const saved = window.localStorage.getItem(ADMIN_THEME_KEY);
      return saved === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  const isLight = colorMode === "light";

  const toggleColorMode = () => {
    setColorMode((prev) => {
      const nextMode: AdminColorMode = prev === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(ADMIN_THEME_KEY, nextMode);
      } catch {
        /* ignore */
      }
      return nextMode;
    });
  };

  // Admin Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Album Editor form (supports both Add New & Edit Existing)
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumType, setAlbumType] = useState<AlbumType>("Mini Album");
  const [albumDate, setAlbumDate] = useState(new Date().toISOString().slice(0, 10));
  const [albumLang, setAlbumLang] = useState<"Korean" | "Japanese" | "English" | "Multi">("Korean");
  const [albumCover, setAlbumCover] = useState("");
  const [albumDesc, setAlbumDesc] = useState("");

  // Track Editor form (supports both Add New & Edit Existing + YouTube / Audio Link)
  const [selectedAlbumId, setSelectedAlbumId] = useState(albums[0]?.id ?? "looks-can-kill");
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackDurationSec, setTrackDurationSec] = useState("185");
  const [trackLang, setTrackLang] = useState<TrackLanguage>("Korean");
  const [trackIsTitle, setTrackIsTitle] = useState(false);
  const [trackSoloMember, setTrackSoloMember] = useState("");
  const [trackYoutubeUrl, setTrackYoutubeUrl] = useState("");
  const [trackAudioUrl, setTrackAudioUrl] = useState("");
  const [trackLyricsKr, setTrackLyricsKr] = useState("");
  const [trackLyricsRom, setTrackLyricsRom] = useState("");

  // Member Editor form
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? "yujin");
  const [memberName, setMemberName] = useState("");
  const [memberKoreanName, setMemberKoreanName] = useState("");
  const [memberFullName, setMemberFullName] = useState("");
  const [memberPosition, setMemberPosition] = useState("");
  const [memberBirthday, setMemberBirthday] = useState("");
  const [memberNationality, setMemberNationality] = useState("");
  const [memberImage, setMemberImage] = useState("");
  const [memberTagline, setMemberTagline] = useState("");
  const [memberBio, setMemberBio] = useState("");
  const [memberJourney, setMemberJourney] = useState("");
  const [memberFactsText, setMemberFactsText] = useState("");

  // News Editor form
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsCategory, setNewsCategory] = useState<NewsItem["category"]>("Release");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsDate, setNewsDate] = useState(new Date().toISOString().slice(0, 10));
  const [newsSummary, setNewsSummary] = useState("");
  const [newsDetailsText, setNewsDetailsText] = useState("");
  const [newsImage, setNewsImage] = useState("");
  const [newsAlbumId, setNewsAlbumId] = useState("");

  // Populate member form whenever selectedMemberId changes
  useEffect(() => {
    const m = members.find((item) => item.id === selectedMemberId);
    if (!m) return;
    setMemberName(m.name);
    setMemberKoreanName(m.koreanName);
    setMemberFullName(m.fullName ?? "");
    setMemberPosition(m.position);
    setMemberBirthday(m.birthday ?? "");
    setMemberNationality(m.nationality ?? "");
    setMemberImage(m.image ?? "");
    setMemberTagline(m.tagline);
    setMemberBio(m.bio);
    setMemberJourney(m.journey ?? "");
    setMemberFactsText((m.facts ?? []).join("\n"));
  }, [selectedMemberId, members]);

  const refreshCatalog = async () => {
    await queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setBusy(true);
    try {
      await signInAdmin(loginEmail, loginPassword);
      setLoginPassword("");
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const resetAlbumForm = () => {
    setEditingAlbumId(null);
    setAlbumTitle("");
    setAlbumCover("");
    setAlbumDesc("");
  };

  const loadAlbumIntoForm = (album: Album) => {
    setEditingAlbumId(album.id);
    setAlbumTitle(album.title);
    setAlbumType(album.type);
    setAlbumDate(album.releaseDate);
    setAlbumLang(album.language ?? "Korean");
    setAlbumCover(album.cover);
    setAlbumDesc(album.description);
  };

  const handleStageAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingAlbumId ?? slugify(albumTitle);
    if (!id) return;
    const existing = albums.find((a) => a.id === id);

    const album: Album = {
      id,
      title: albumTitle.trim(),
      type: albumType,
      releaseDate: albumDate,
      language: albumLang,
      cover: albumCover.trim(),
      description: albumDesc.trim() || `${albumType} by IVE.`,
      trackIds: existing?.trackIds ?? [],
      trackCount: existing?.trackCount ?? 0,
    };

    stageAlbumSave(album);
    resetAlbumForm();
    setSelectedAlbumId(id);
    setStatus(`Staged album "${album.title}". Click "Push Live Changes" when ready.`);
  };

  const resetTrackForm = () => {
    setEditingTrackId(null);
    setTrackTitle("");
    setTrackDurationSec("185");
    setTrackYoutubeUrl("");
    setTrackAudioUrl("");
    setTrackLyricsKr("");
    setTrackLyricsRom("");
    setTrackIsTitle(false);
    setTrackSoloMember("");
  };

  const loadTrackIntoForm = (track: Track) => {
    setEditingTrackId(track.id);
    setSelectedAlbumId(track.albumId);
    setTrackTitle(track.title);
    setTrackDurationSec(String(track.duration ?? 180));
    setTrackLang(track.language ?? "Korean");
    setTrackIsTitle(Boolean(track.isTitleTrack));
    setTrackSoloMember(track.isSolo && track.member ? track.member : "");
    setTrackYoutubeUrl(track.youtubeUrl ?? "");
    setTrackAudioUrl(track.audioUrl ?? "");
    setTrackLyricsKr(track.lyricsKorean ?? "");
    setTrackLyricsRom(track.lyricsRomanized ?? "");
  };

  const handleStageTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTitle.trim() || !selectedAlbumId) return;
    const parentAlbum = albums.find((a) => a.id === selectedAlbumId);
    const existingTracks = getAlbumTracks(selectedAlbumId);
    const id =
      editingTrackId ??
      `${selectedAlbumId}-${existingTracks.length + 1}-${slugify(trackTitle).slice(0, 12)}`;
    const parsedDuration = Math.max(30, parseInt(trackDurationSec, 10) || 180);
    const soloMemberObj = trackSoloMember
      ? members.find((m) => m.id === trackSoloMember)
      : undefined;
    const hasLyrics = Boolean(trackLyricsKr.trim() || trackLyricsRom.trim());

    const track: Track = {
      id,
      title: trackTitle.trim(),
      artist: soloMemberObj ? soloMemberObj.name : "IVE",
      albumId: selectedAlbumId,
      releaseIds: [selectedAlbumId],
      duration: parsedDuration,
      isTitleTrack: trackIsTitle,
      language: trackLang,
      version: soloMemberObj ? "Solo" : "Original",
      ...(soloMemberObj ? { isSolo: true, member: soloMemberObj.id } : {}),
      ...(trackYoutubeUrl.trim() ? { youtubeUrl: trackYoutubeUrl.trim() } : {}),
      ...(trackAudioUrl.trim() ? { audioUrl: trackAudioUrl.trim() } : {}),
      ...(hasLyrics
        ? {
            lyricsAvailable: true,
            ...(trackLyricsKr.trim() ? { lyricsKorean: trackLyricsKr.trim() } : {}),
            ...(trackLyricsRom.trim() ? { lyricsRomanized: trackLyricsRom.trim() } : {}),
          }
        : {}),
    };

    stageTrackSave(track, parentAlbum);
    resetTrackForm();
    setStatus(`Staged song "${track.title}". Click "Push Live Changes" when ready.`);
  };

  const handleStageMember = (e: React.FormEvent) => {
    e.preventDefault();
    const base = members.find((m) => m.id === selectedMemberId);
    if (!base) return;

    const facts = memberFactsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const birthYearFromDate = memberBirthday
      ? parseInt(memberBirthday.slice(0, 4), 10) || base.birthYear
      : base.birthYear;

    const updated: Member = {
      ...base,
      name: memberName.trim() || base.name,
      koreanName: memberKoreanName.trim() || base.koreanName,
      position: memberPosition.trim() || base.position,
      birthYear: birthYearFromDate,
      tagline: memberTagline.trim() || base.tagline,
      bio: memberBio.trim() || base.bio,
      image: memberImage.trim(),
      ...(memberFullName.trim() ? { fullName: memberFullName.trim() } : {}),
      ...(memberBirthday.trim() ? { birthday: memberBirthday.trim() } : {}),
      ...(memberNationality.trim() ? { nationality: memberNationality.trim() } : {}),
      ...(memberJourney.trim() ? { journey: memberJourney.trim() } : {}),
      ...(facts.length > 0 ? { facts } : {}),
    };

    stageMemberSave(updated);
    setStatus(`Staged profile edits for ${updated.name}. Click "Push Live Changes" when ready.`);
  };

  const resetNewsForm = () => {
    setEditingNewsId(null);
    setNewsTitle("");
    setNewsSummary("");
    setNewsDetailsText("");
    setNewsImage("");
    setNewsAlbumId("");
  };

  const loadNewsIntoForm = (item: NewsItem) => {
    setEditingNewsId(item.id);
    setNewsCategory(item.category);
    setNewsTitle(item.title);
    setNewsDate(item.date);
    setNewsSummary(item.summary);
    setNewsDetailsText((item.details ?? []).join("\n"));
    setNewsImage(item.image ?? "");
    setNewsAlbumId(item.albumId ?? "");
  };

  const handleStageNews = (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingNewsId ?? (slugify(newsTitle) || `news-${Date.now()}`);
    if (!newsTitle.trim()) return;

    const details = newsDetailsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const item: NewsItem = {
      id,
      category: newsCategory,
      title: newsTitle.trim(),
      date: newsDate,
      summary: newsSummary.trim(),
      ...(details.length > 0 ? { details } : {}),
      ...(newsImage.trim() ? { image: newsImage.trim() } : {}),
      ...(newsAlbumId ? { albumId: newsAlbumId } : {}),
    };

    stageNewsSave(item);
    resetNewsForm();
    setStatus(`Staged news "${item.title}". Click "Push Live Changes" when ready.`);
  };

  const handleStageFeatured = (nextAlbumId: string, nextTrackId?: string) => {
    const albumTracks = getAlbumTracks(nextAlbumId);
    const chosenTrack = nextTrackId ?? albumTracks[0]?.id ?? config.featuredTrackId;
    stageAppConfigSave({
      featuredAlbumId: nextAlbumId,
      featuredTrackId: chosenTrack,
    });
    setStatus(`Staged Featured Era "${nextAlbumId}". Click "Push Live Changes" when ready.`);
  };

  const handlePushLive = async () => {
    if (pendingCount === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const committed = await pushStagedChangesToFirestore();
      await refreshCatalog();
      setStatus(`Pushed ${committed} change${committed === 1 ? "" : "s"} live to Firestore!`);
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Failed to push live changes.");
    } finally {
      setBusy(false);
    }
  };

  const handleSeed = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await seedFirestoreCatalog();
      await refreshCatalog();
      setStatus(
        `Seeded ${res.albums} albums, ${res.tracks} tracks, ${res.news} news & ${res.members} members live to Firestore.`,
      );
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Seeding failed.");
    } finally {
      setBusy(false);
    }
  };

  // Dynamic Light / Dark Enterprise SaaS Palette Tokens
  const shellBg = isLight ? "bg-slate-50 text-slate-900" : "bg-[#090b10] text-slate-100";
  const chromeBg = isLight
    ? "bg-white border-slate-200/90"
    : "bg-[#0d1017] border-slate-800/80";
  const chromeHeaderBg = isLight
    ? "bg-white/95 border-slate-200/90"
    : "bg-[#0d1017]/95 border-slate-800/80";
  const panelBg = isLight
    ? "bg-white border-slate-200/90 shadow-xs"
    : "bg-[#11151f] border-slate-800/90";
  const subPanelBg = isLight
    ? "bg-slate-50 border-slate-200"
    : "bg-[#0b0d13] border-slate-800";
  const dividerClass = isLight ? "divide-slate-200/80" : "divide-slate-800/70";
  const borderClass = isLight ? "border-slate-200" : "border-slate-800";
  const headingText = isLight ? "text-slate-900" : "text-white";
  const subText = isLight ? "text-slate-500" : "text-slate-400";
  const mutedMonoText = isLight ? "text-slate-400" : "text-slate-500";
  const rowHover = isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/35";
  const secondaryBtn = isLight
    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300"
    : "border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700";

  const inputClass = cn(
    "w-full rounded-lg border px-3 py-2 text-xs outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30",
    isLight
      ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
      : "border-slate-800 bg-[#0b0d13] text-slate-100 placeholder:text-slate-500",
  );
  const labelClass = cn(
    "mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-wider",
    isLight ? "text-slate-500" : "text-slate-400",
  );

  const activeFeaturedAlbum = albums.find((a) => a.id === config.featuredAlbumId) ?? albums[0];
  const activeFeaturedTrack = tracks.find((t) => t.id === config.featuredTrackId) ?? tracks[0];
  const currentAlbumForTracks = albums.find((a) => a.id === selectedAlbumId) ?? albums[0];
  const selectedAlbumTracks = getAlbumTracks(selectedAlbumId);
  const parsedYoutubeIdPreview = extractYouTubeId(trackYoutubeUrl);
  const tracksWithAudioCount = tracks.filter(
    (t) => Boolean(extractYouTubeId(t.youtubeUrl) || t.audioUrl),
  ).length;

  const navItems: {
    id: AdminTab;
    label: string;
    group: "CONTENT" | "SYSTEM";
    count?: number;
    icon: typeof Disc3;
  }[] = [
    { id: "albums", label: "Discography Albums", group: "CONTENT", count: albums.length, icon: Disc3 },
    { id: "tracks", label: "Songs & Audio", group: "CONTENT", count: tracks.length, icon: ListMusic },
    { id: "members", label: "Member Dossiers", group: "CONTENT", count: members.length, icon: Users },
    { id: "news", label: "News Dispatches", group: "CONTENT", count: news.length, icon: Newspaper },
    { id: "seed", label: "Database & Seeding", group: "SYSTEM", icon: Database },
  ];

  const activeNavMeta = navItems.find((item) => item.id === tab) ?? navItems[0]!;

  // ---------------------------------------------------------------------------
  // 1. UNAUTHENTICATED VIEW: Enterprise Admin Sign-In Gate
  // ---------------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div
        className={cn(
          "flex min-h-screen flex-col justify-between transition-colors selection:bg-indigo-500 selection:text-white",
          shellBg,
        )}
      >
        {/* Top System Bar */}
        <header className={cn("flex items-center justify-between border-b px-6 py-3.5", chromeBg)}>
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Layers size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold tracking-tight", headingText)}>
                  Dive Archive CMS
                </span>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium",
                    isLight
                      ? "border-slate-200 bg-slate-100 text-slate-600"
                      : "border-slate-700 bg-slate-800/90 text-slate-300",
                  )}
                >
                  v5.5 · ADMIN
                </span>
              </div>
              <p className={cn("font-mono text-[10px]", subText)}>
                Firestore Content Management &amp; Live Audio Sync Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleColorMode}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                secondaryBtn,
              )}
            >
              {isLight ? (
                <>
                  <Moon size={14} className="text-indigo-600" /> Dark
                </>
              ) : (
                <>
                  <Sun size={14} className="text-amber-400" /> Light
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPreviewingFanApp(true)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors",
                secondaryBtn,
              )}
            >
              <Eye size={14} className="text-indigo-500" />
              Preview Fan App
            </button>
          </div>
        </header>

        {/* Center Sign-In Card */}
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
          <div className={cn("rounded-xl border p-7 shadow-xl", panelBg)}>
            <div className={cn("mb-6 flex items-center justify-between border-b pb-4", borderClass)}>
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-500">
                  <Lock size={16} />
                </div>
                <div>
                  <h1 className={cn("text-base font-semibold", headingText)}>
                    Administrator Sign-In
                  </h1>
                  <p className={cn("font-mono text-[11px]", subText)}>
                    Project: ive-dive-archive
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium",
                  isCloudEnabled
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "border border-amber-500/30 bg-amber-500/10 text-amber-500",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isCloudEnabled ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
                {isCloudEnabled ? "FIRESTORE ONLINE" : "CONNECTING"}
              </span>
            </div>

            {!isCloudEnabled ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-300">
                Connecting to Firebase project... Verify that <code>.env</code> contains your
                <code>VITE_FIREBASE_*</code> credentials.
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelClass}>Administrator Email</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@ivedivearchive.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={inputClass}
                  />
                </div>

                {loginError && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
                >
                  <ShieldCheck size={15} />
                  {busy ? "Authenticating..." : "Authenticate & Open Console"}
                </button>
              </form>
            )}
          </div>
        </main>

        <footer
          className={cn(
            "border-t px-6 py-3 text-center font-mono text-[11px]",
            chromeBg,
            mutedMonoText,
          )}
        >
          IVE: DIVE ARCHIVE BACK-OFFICE CMS · AUTHORIZED ACCESS ONLY
        </footer>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATED VIEW: Full SaaS CMS Workspace (Light & Dark Mode)
  // ---------------------------------------------------------------------------
  return (
    <div
      className={cn(
        "flex min-h-screen font-sans transition-colors selection:bg-indigo-500 selection:text-white",
        shellBg,
      )}
    >
      {/* LEFT PERSISTENT SIDEBAR */}
      <aside
        className={cn(
          "sticky top-0 flex h-screen w-64 shrink-0 flex-col justify-between border-r",
          chromeBg,
        )}
      >
        <div>
          {/* Brand Header */}
          <div className={cn("flex items-center gap-3 border-b px-5 py-4", borderClass)}>
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Layers size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={cn("truncate text-sm font-semibold", headingText)}>Dive Archive</p>
                <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-indigo-500">
                  CMS
                </span>
              </div>
              <p className={cn("truncate font-mono text-[10px]", subText)}>
                Production Firestore
              </p>
            </div>
          </div>

          {/* Navigation Groups */}
          <div className="px-3 py-4">
            <p className={cn("px-2.5 pb-2 font-mono text-[10px] font-semibold uppercase tracking-wider", mutedMonoText)}>
              Content Collections
            </p>
            <nav className="space-y-1">
              {navItems
                .filter((i) => i.group === "CONTENT")
                .map(({ id, label, count, icon: Icon }) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                        active
                          ? isLight
                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
                            : "bg-indigo-600/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30"
                          : isLight
                            ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon
                          size={15}
                          className={
                            active
                              ? isLight
                                ? "text-indigo-600"
                                : "text-indigo-400"
                              : "text-slate-400"
                          }
                        />
                        {label}
                      </span>
                      {typeof count === "number" && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[10px]",
                            active
                              ? isLight
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-indigo-500/20 text-indigo-200"
                              : isLight
                                ? "bg-slate-100 text-slate-600"
                                : "bg-slate-800 text-slate-400",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
            </nav>

            <p className={cn("mt-6 px-2.5 pb-2 font-mono text-[10px] font-semibold uppercase tracking-wider", mutedMonoText)}>
              System Operations
            </p>
            <nav className="space-y-1">
              {navItems
                .filter((i) => i.group === "SYSTEM")
                .map(({ id, label, icon: Icon }) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                        active
                          ? isLight
                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200"
                            : "bg-indigo-600/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30"
                          : isLight
                            ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon
                          size={15}
                          className={
                            active
                              ? isLight
                                ? "text-indigo-600"
                                : "text-indigo-400"
                              : "text-slate-400"
                          }
                        />
                        {label}
                      </span>
                    </button>
                  );
                })}
            </nav>
          </div>
        </div>

        {/* Bottom Admin Session Footer */}
        <div
          className={cn(
            "border-t p-3.5",
            isLight ? "border-slate-200 bg-slate-50/80" : "border-slate-800/80 bg-[#0a0c12]",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className={cn("truncate text-xs font-medium", headingText)}>
                  {email || "Administrator"}
                </p>
              </div>
              <p className={cn("mt-0.5 font-mono text-[10px]", mutedMonoText)}>
                Role: Super Admin
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOutAdmin()}
              title="Sign out of Admin CMS"
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                secondaryBtn,
              )}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT SHELL */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP COMMAND & DEPLOYMENT HEADER */}
        <header
          className={cn(
            "sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3.5 backdrop-blur-md",
            chromeHeaderBg,
          )}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("font-mono", mutedMonoText)}>CMS</span>
            <ChevronRight size={13} className={mutedMonoText} />
            <span className={cn("font-mono", subText)}>{activeNavMeta.group}</span>
            <ChevronRight size={13} className={mutedMonoText} />
            <span className={cn("font-semibold", headingText)}>{activeNavMeta.label}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Light / Dark Theme Switch */}
            <button
              type="button"
              onClick={toggleColorMode}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                secondaryBtn,
              )}
            >
              {isLight ? (
                <>
                  <Moon size={14} className="text-indigo-600" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-amber-400" />
                  <span>Light Mode</span>
                </>
              )}
            </button>

            {/* Live Preview Toggle */}
            <button
              type="button"
              onClick={() => setPreviewingFanApp(true)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors",
                secondaryBtn,
              )}
            >
              <Eye size={14} className="text-indigo-500" />
              Preview Fan App
              {pendingCount > 0 && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-600 dark:text-amber-300">
                  {pendingCount} draft
                </span>
              )}
            </button>

            {/* Discard All Staged Button */}
            {pendingCount > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={clearAllStagedChanges}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:border-rose-500/50 hover:text-rose-500",
                  secondaryBtn,
                )}
              >
                <RotateCcw size={13} />
                Discard ({pendingCount})
              </button>
            )}

            {/* Primary Deployment Button */}
            <button
              type="button"
              disabled={busy || pendingCount === 0}
              onClick={() => void handlePushLive()}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                pendingCount > 0
                  ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-500"
                  : isLight
                    ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                    : "cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500",
              )}
            >
              <Rocket size={14} />
              {busy ? "Deploying to Firestore..." : `Push Live Changes (${pendingCount})`}
            </button>
          </div>
        </header>

        {/* WORKSPACE BODY */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-6 p-6">
          {/* KPI OVERVIEW STRIP */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={cn("rounded-xl border p-4", panelBg)}>
              <div className="flex items-center justify-between">
                <span className={cn("font-mono text-[10px] font-semibold uppercase tracking-wider", subText)}>
                  Discography Catalog
                </span>
                <Disc3 size={15} className="text-indigo-500" />
              </div>
              <p className={cn("mt-2 text-2xl font-bold tracking-tight", headingText)}>
                {albums.length}{" "}
                <span className={cn("text-xs font-normal", subText)}>releases</span>
              </p>
              <p className={cn("mt-1 font-mono text-[11px]", mutedMonoText)}>
                {news.length} news dispatches · {members.length} members
              </p>
            </div>

            <div className={cn("rounded-xl border p-4", panelBg)}>
              <div className="flex items-center justify-between">
                <span className={cn("font-mono text-[10px] font-semibold uppercase tracking-wider", subText)}>
                  Audio &amp; YouTube Index
                </span>
                <Volume2 size={15} className="text-indigo-500" />
              </div>
              <p className={cn("mt-2 text-2xl font-bold tracking-tight", headingText)}>
                {tracks.length} <span className={cn("text-xs font-normal", subText)}>tracks</span>
              </p>
              <p className={cn("mt-1 font-mono text-[11px]", mutedMonoText)}>
                {tracksWithAudioCount} with YouTube audio ·{" "}
                {tracks.filter((t) => t.lyricsAvailable).length} with lyrics
              </p>
            </div>

            <div className={cn("rounded-xl border p-4", panelBg)}>
              <div className="flex items-center justify-between">
                <span className={cn("font-mono text-[10px] font-semibold uppercase tracking-wider", subText)}>
                  Active Featured Spotlight
                </span>
                <Star size={15} className="text-amber-500" />
              </div>
              <p className={cn("mt-2 truncate text-base font-semibold", headingText)}>
                {activeFeaturedAlbum?.title ?? "None"}
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-indigo-500">
                Song: {activeFeaturedTrack?.title ?? "None"}
              </p>
            </div>

            <div
              className={cn(
                "rounded-xl border p-4 transition-colors",
                pendingCount > 0
                  ? "border-amber-500/40 bg-amber-500/10"
                  : panelBg,
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold uppercase tracking-wider",
                    pendingCount > 0 ? "text-amber-600 dark:text-amber-300" : subText,
                  )}
                >
                  Staged Deployment Queue
                </span>
                <Activity
                  size={15}
                  className={pendingCount > 0 ? "text-amber-500" : "text-emerald-500"}
                />
              </div>
              <p className={cn("mt-2 text-2xl font-bold tracking-tight", headingText)}>
                {pendingCount}{" "}
                <span className={cn("text-xs font-normal", subText)}>
                  {pendingCount === 1 ? "pending change" : "pending changes"}
                </span>
              </p>
              <p className={cn("mt-1 font-mono text-[11px]", subText)}>
                {pendingCount > 0
                  ? "Ready to batch commit to Firestore"
                  : "All collections synced with production"}
              </p>
            </div>
          </div>

          {/* STAGED CHANGES QUEUE DRAWER (WHEN PENDING > 0) */}
          {changes.length > 0 && (
            <div
              className={cn(
                "rounded-xl border p-4",
                isLight
                  ? "border-amber-300 bg-amber-50/90"
                  : "border-amber-500/30 bg-[#14131c]",
              )}
            >
              <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b pb-3", borderClass)}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  <h2
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      isLight ? "text-amber-900" : "text-amber-200",
                    )}
                  >
                    Staged Changes Queue ({changes.length})
                  </h2>
                  <span className={cn("text-xs", subText)}>
                    — Review or discard individual operations before pushing live
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {changes.map((c) => (
                  <div
                    key={c.key}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs",
                      subPanelBg,
                    )}
                  >
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                        c.action === "delete"
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-300"
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300",
                      )}
                    >
                      {c.action === "delete" ? "DELETE" : "UPSERT"}
                    </span>
                    <span className={cn("max-w-[240px] truncate", headingText)}>{c.label}</span>
                    <button
                      type="button"
                      onClick={() => discardStagedChange(c)}
                      aria-label={`Discard ${c.label}`}
                      className={cn("ml-1 rounded p-0.5 hover:text-rose-500", subText)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STATUS TOAST BANNER */}
          {status && (
            <div className="flex items-center justify-between rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-700 dark:text-indigo-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="shrink-0 text-indigo-500" />
                <span className="font-medium">{status}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatus(null)}
                className="text-indigo-500 hover:opacity-80"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 1: DISCOGRAPHY ALBUMS (2-Column Master-Detail Table + Form)   */}
          {/* ================================================================= */}
          {tab === "albums" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left 7 Cols: Structured Data Table */}
              <div className="lg:col-span-7">
                <div className={cn("overflow-hidden rounded-xl border", panelBg)}>
                  <div className={cn("flex items-center justify-between border-b px-5 py-3.5", borderClass)}>
                    <div>
                      <h2 className={cn("text-sm font-semibold", headingText)}>
                        Discography Releases ({albums.length})
                      </h2>
                      <p className={cn("text-xs", subText)}>
                        Click Edit to load a release into the inspector, or star to set Featured
                        Era.
                      </p>
                    </div>
                  </div>

                  <div className={cn("divide-y", dividerClass)}>
                    {albums.map((a) => {
                      const isFeatured = config.featuredAlbumId === a.id;
                      const isEditing = editingAlbumId === a.id;
                      return (
                        <div
                          key={a.id}
                          className={cn(
                            "flex items-center justify-between gap-4 px-5 py-3 transition-colors",
                            isEditing ? "bg-indigo-500/10" : rowHover,
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3.5">
                            <div className={cn("h-11 w-11 shrink-0 overflow-hidden rounded-lg border", borderClass)}>
                              <ArtworkImage
                                src={a.cover}
                                alt={a.title}
                                kind="album"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={cn("truncate text-sm font-semibold", headingText)}>
                                  {a.title}
                                </p>
                                {isFeatured && (
                                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-amber-600 dark:text-amber-300">
                                    ★ Featured Era
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5 font-mono text-[10px]",
                                    isLight
                                      ? "bg-slate-100 text-slate-600"
                                      : "bg-slate-800 text-slate-300",
                                  )}
                                >
                                  {a.type}
                                </span>
                              </div>
                              <div className={cn("mt-0.5 flex items-center gap-2 font-mono text-[11px]", subText)}>
                                <span>{a.releaseDate}</span>
                                <span>·</span>
                                <span>{a.language ?? "Korean"}</span>
                                <span>·</span>
                                <span>{a.trackCount} tracks</span>
                                <span>·</span>
                                <span className={cn("truncate", mutedMonoText)}>id: {a.id}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => loadAlbumIntoForm(a)}
                              title={`Edit ${a.title}`}
                              className={cn(
                                "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                                isEditing
                                  ? "border-indigo-500 bg-indigo-600 text-white"
                                  : secondaryBtn,
                              )}
                            >
                              <Edit3 size={12} />
                              Edit
                            </button>
                            {!isFeatured && (
                              <button
                                type="button"
                                onClick={() => handleStageFeatured(a.id)}
                                title={`Set ${a.title} as Featured Era`}
                                className={cn(
                                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-amber-500/50 hover:text-amber-500",
                                  secondaryBtn,
                                )}
                              >
                                <Star size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                stageAlbumDelete(a.id);
                                setStatus(`Staged deletion of album "${a.title}".`);
                              }}
                              title={`Delete ${a.title}`}
                              className={cn(
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-500",
                                secondaryBtn,
                              )}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Sticky Album Inspector Form */}
              <div className="lg:col-span-5">
                <form
                  onSubmit={handleStageAlbum}
                  className={cn("sticky top-20 space-y-4 rounded-xl border p-5", panelBg)}
                >
                  <div className={cn("flex items-center justify-between border-b pb-3.5", borderClass)}>
                    <div className="flex items-center gap-2">
                      <FolderKanban size={16} className="text-indigo-500" />
                      <div>
                        <h3 className={cn("text-sm font-semibold", headingText)}>
                          {editingAlbumId ? "Edit Album Record" : "Create New Album"}
                        </h3>
                        <p className={cn("font-mono text-[10px]", subText)}>
                          {editingAlbumId
                            ? `Document ID: ${editingAlbumId}`
                            : "Auto-generates slug ID from title"}
                        </p>
                      </div>
                    </div>
                    {editingAlbumId && (
                      <button
                        type="button"
                        onClick={resetAlbumForm}
                        className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium", secondaryBtn)}
                      >
                        Reset to New
                      </button>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Album Title *</label>
                    <input
                      required
                      value={albumTitle}
                      onChange={(e) => setAlbumTitle(e.target.value)}
                      placeholder="e.g. IVE NEXT ERA"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Format / Type</label>
                      <select
                        value={albumType}
                        onChange={(e) => setAlbumType(e.target.value as AlbumType)}
                        className={inputClass}
                      >
                        {ALBUM_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Release Date *</label>
                      <input
                        type="date"
                        required
                        value={albumDate}
                        onChange={(e) => setAlbumDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Primary Language</label>
                      <select
                        value={albumLang}
                        onChange={(e) =>
                          setAlbumLang(
                            e.target.value as "Korean" | "Japanese" | "English" | "Multi",
                          )
                        }
                        className={inputClass}
                      >
                        <option value="Korean">Korean</option>
                        <option value="Japanese">Japanese</option>
                        <option value="English">English</option>
                        <option value="Multi">Multi</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Cover Artwork URL</label>
                      <input
                        value={albumCover}
                        onChange={(e) => setAlbumCover(e.target.value)}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {albumCover.trim() && (
                    <div className={cn("flex items-center gap-3 rounded-lg border p-2.5", subPanelBg)}>
                      <div className={cn("h-12 w-12 shrink-0 overflow-hidden rounded border", borderClass)}>
                        <ArtworkImage
                          src={albumCover}
                          alt="Cover preview"
                          kind="album"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] font-semibold uppercase text-emerald-500">
                          Artwork Preview Ready
                        </p>
                        <p className={cn("truncate font-mono text-[10px]", subText)}>
                          {albumCover}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Editorial Description</label>
                    <textarea
                      rows={3}
                      value={albumDesc}
                      onChange={(e) => setAlbumDesc(e.target.value)}
                      placeholder="Concise summary of the album concept and era..."
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                  >
                    <Plus size={14} />
                    {editingAlbumId ? "Stage Album Update" : "Stage New Album"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: SONGS, YOUTUBE AUDIO & LYRICS                              */}
          {/* ================================================================= */}
          {tab === "tracks" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left 7 Cols: Album Selector + Tracklist Table */}
              <div className="space-y-4 lg:col-span-7">
                <div className={cn("rounded-xl border p-4", panelBg)}>
                  <label className={labelClass}>Filter Tracklist by Release</label>
                  <div className="flex items-center gap-3">
                    {currentAlbumForTracks && (
                      <div className={cn("h-10 w-10 shrink-0 overflow-hidden rounded-lg border", borderClass)}>
                        <ArtworkImage
                          src={currentAlbumForTracks.cover}
                          alt={currentAlbumForTracks.title}
                          kind="album"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <select
                      value={selectedAlbumId}
                      onChange={(e) => setSelectedAlbumId(e.target.value)}
                      className={cn(inputClass, "font-medium")}
                    >
                      {albums.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} ({a.releaseDate.slice(0, 4)}) — {getAlbumTracks(a.id).length}{" "}
                          tracks
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={cn("overflow-hidden rounded-xl border", panelBg)}>
                  <div className={cn("flex items-center justify-between border-b px-5 py-3.5", borderClass)}>
                    <div>
                      <h2 className={cn("text-sm font-semibold", headingText)}>
                        {currentAlbumForTracks?.title ?? "Album"} Tracklist (
                        {selectedAlbumTracks.length})
                      </h2>
                      <p className={cn("text-xs", subText)}>
                        Attach YouTube links for real audio streaming, or edit track metadata and
                        lyrics.
                      </p>
                    </div>
                  </div>

                  {selectedAlbumTracks.length === 0 ? (
                    <div className={cn("p-8 text-center text-xs", subText)}>
                      No tracks linked to this release yet. Use the form on the right to add one.
                    </div>
                  ) : (
                    <div className={cn("divide-y", dividerClass)}>
                      {selectedAlbumTracks.map((t, idx) => {
                        const isFeaturedSong = config.featuredTrackId === t.id;
                        const isEditing = editingTrackId === t.id;
                        const ytId = extractYouTubeId(t.youtubeUrl);
                        const hasAudio = Boolean(ytId || t.audioUrl);
                        return (
                          <div
                            key={t.id}
                            className={cn(
                              "flex items-center justify-between gap-4 px-5 py-3 transition-colors",
                              isEditing ? "bg-indigo-500/10" : rowHover,
                            )}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3.5">
                              <span className={cn("w-6 shrink-0 font-mono text-xs font-semibold", mutedMonoText)}>
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className={cn("truncate text-sm font-semibold", headingText)}>
                                    {t.title}
                                  </p>
                                  {hasAudio && (
                                    <span className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-rose-600 dark:text-rose-300">
                                      <Play size={8} className="fill-current" />
                                      {ytId ? `YT: ${ytId}` : "Audio Linked"}
                                    </span>
                                  )}
                                  {t.isTitleTrack && (
                                    <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-indigo-600 dark:text-indigo-300">
                                      Title
                                    </span>
                                  )}
                                  {t.isSolo && (
                                    <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-purple-600 dark:text-purple-300">
                                      Solo · {t.artist}
                                    </span>
                                  )}
                                  {t.lyricsAvailable && (
                                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-emerald-600 dark:text-emerald-300">
                                      Lyrics
                                    </span>
                                  )}
                                  {isFeaturedSong && (
                                    <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-amber-600 dark:text-amber-300">
                                      ★ Featured Song
                                    </span>
                                  )}
                                </div>
                                <p className={cn("mt-0.5 font-mono text-[11px]", subText)}>
                                  {formatDurationMmSs(t.duration)} ({t.duration ?? 180}s) ·{" "}
                                  {t.language ?? "Korean"} · id: {t.id}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => loadTrackIntoForm(t)}
                                className={cn(
                                  "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                                  isEditing
                                    ? "border-indigo-500 bg-indigo-600 text-white"
                                    : secondaryBtn,
                                )}
                              >
                                <Edit3 size={12} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStageFeatured(t.albumId, t.id)}
                                title={`Set ${t.title} as Featured Song`}
                                className={cn(
                                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-amber-500/50 hover:text-amber-500",
                                  secondaryBtn,
                                )}
                              >
                                <Star size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const parent = albums.find((a) => a.id === t.albumId);
                                  stageTrackDelete(t, parent);
                                  setStatus(`Staged deletion of song "${t.title}".`);
                                }}
                                title={`Delete ${t.title}`}
                                className={cn(
                                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-500",
                                  secondaryBtn,
                                )}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 5 Cols: Sticky Song, YouTube Link & Lyrics Inspector Form */}
              <div className="lg:col-span-5">
                <form
                  onSubmit={handleStageTrack}
                  className={cn("sticky top-20 space-y-4 rounded-xl border p-5", panelBg)}
                >
                  <div className={cn("flex items-center justify-between border-b pb-3.5", borderClass)}>
                    <div className="flex items-center gap-2">
                      <ListMusic size={16} className="text-indigo-500" />
                      <div>
                        <h3 className={cn("text-sm font-semibold", headingText)}>
                          {editingTrackId ? "Edit Track, Audio & Lyrics" : "Add Track to Release"}
                        </h3>
                        <p className={cn("font-mono text-[10px]", subText)}>
                          {editingTrackId
                            ? `Track ID: ${editingTrackId}`
                            : `Target Album: ${currentAlbumForTracks?.title ?? selectedAlbumId}`}
                        </p>
                      </div>
                    </div>
                    {editingTrackId && (
                      <button
                        type="button"
                        onClick={resetTrackForm}
                        className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium", secondaryBtn)}
                      >
                        Reset to New
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Parent Album *</label>
                      <select
                        value={selectedAlbumId}
                        onChange={(e) => setSelectedAlbumId(e.target.value)}
                        className={inputClass}
                      >
                        {albums.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title} ({a.releaseDate.slice(0, 4)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Song Title *</label>
                      <input
                        required
                        value={trackTitle}
                        onChange={(e) => setTrackTitle(e.target.value)}
                        placeholder="e.g. LOVE DIVE"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* YouTube Link / Real Audio Stream Box */}
                  <div className={cn("space-y-3 rounded-lg border p-3.5", subPanelBg)}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                        <Volume2 size={13} /> Real Song Playback Source
                      </span>
                      {parsedYoutubeIdPreview && (
                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                          ✓ YouTube ID: {parsedYoutubeIdPreview}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>
                        YouTube URL or 11-Char Video ID (Recommended)
                      </label>
                      <input
                        value={trackYoutubeUrl}
                        onChange={(e) => setTrackYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=Y8JFxS1HlDo or youtu.be/..."
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Direct Audio Stream URL (Optional .mp3 / .m4a fallback)
                      </label>
                      <input
                        value={trackAudioUrl}
                        onChange={(e) => setTrackAudioUrl(e.target.value)}
                        placeholder="https://.../track.mp3 (optional)"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Duration (Seconds)</label>
                      <input
                        type="number"
                        min={30}
                        value={trackDurationSec}
                        onChange={(e) => setTrackDurationSec(e.target.value)}
                        placeholder="185"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Language</label>
                      <select
                        value={trackLang}
                        onChange={(e) => setTrackLang(e.target.value as TrackLanguage)}
                        className={inputClass}
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Artist / Solo Assignment</label>
                      <select
                        value={trackSoloMember}
                        onChange={(e) => setTrackSoloMember(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Group Release (IVE)</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            Solo: {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Release Flag</label>
                      <label
                        className={cn(
                          "flex h-[34px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs",
                          subPanelBg,
                          headingText,
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={trackIsTitle}
                          onChange={(e) => setTrackIsTitle(e.target.checked)}
                          className="accent-indigo-500"
                        />
                        Mark as Title Track
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Original Lyrics (Korean / Japanese / English)
                    </label>
                    <textarea
                      rows={3}
                      value={trackLyricsKr}
                      onChange={(e) => setTrackLyricsKr(e.target.value)}
                      placeholder="Paste original script lyrics here..."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Romanized Lyrics</label>
                    <textarea
                      rows={3}
                      value={trackLyricsRom}
                      onChange={(e) => setTrackLyricsRom(e.target.value)}
                      placeholder="Paste romanized pronunciation lyrics here..."
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                  >
                    <Plus size={14} />
                    {editingTrackId ? "Stage Song Update" : "Stage New Song"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: MEMBERS DOSSIER EDITOR (2-Column Roster + Full Form)       */}
          {/* ================================================================= */}
          {tab === "members" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left 4 Cols: Member Roster Selection List */}
              <div className="lg:col-span-4">
                <div className={cn("overflow-hidden rounded-xl border", panelBg)}>
                  <div className={cn("border-b px-5 py-3.5", borderClass)}>
                    <h2 className={cn("text-sm font-semibold", headingText)}>
                      IVE Member Roster ({members.length})
                    </h2>
                    <p className={cn("text-xs", subText)}>
                      Select a member to inspect and edit their profile dossier.
                    </p>
                  </div>
                  <div className={cn("divide-y", dividerClass)}>
                    {members.map((m, idx) => {
                      const active = selectedMemberId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMemberId(m.id)}
                          className={cn(
                            "flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors",
                            active
                              ? "bg-indigo-500/15 ring-1 ring-inset ring-indigo-500/30"
                              : rowHover,
                          )}
                        >
                          <div className={cn("h-12 w-12 shrink-0 overflow-hidden rounded-lg border", borderClass)}>
                            <ArtworkImage
                              src={m.image}
                              alt={m.name}
                              kind="member"
                              className="h-full w-full object-cover object-top"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className={cn("text-sm font-semibold", headingText)}>
                                {m.name}{" "}
                                <span className={cn("font-normal", subText)}>{m.koreanName}</span>
                              </p>
                              <span className={cn("font-mono text-[10px]", mutedMonoText)}>
                                0{idx + 1}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-indigo-500">{m.position}</p>
                            <p className={cn("mt-0.5 font-mono text-[10px]", mutedMonoText)}>
                              {m.birthday ?? `b. ${m.birthYear}`} · {(m.facts ?? []).length} archive
                              notes
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right 8 Cols: Comprehensive Member Dossier Form */}
              <div className="lg:col-span-8">
                <form
                  onSubmit={handleStageMember}
                  className={cn("space-y-4 rounded-xl border p-6", panelBg)}
                >
                  <div className={cn("flex flex-wrap items-center justify-between gap-4 border-b pb-4", borderClass)}>
                    <div className="flex items-center gap-3.5">
                      <div className={cn("h-14 w-14 shrink-0 overflow-hidden rounded-xl border", borderClass)}>
                        <ArtworkImage
                          src={memberImage}
                          alt={memberName}
                          kind="member"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={cn("text-base font-semibold", headingText)}>
                            {memberName || "Member"} Profile Dossier
                          </h3>
                          <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-500">
                            ID: {selectedMemberId}
                          </span>
                        </div>
                        <p className={cn("text-xs", subText)}>
                          Changes update the Photocard Gallery, Member Detail Page, and Birthday
                          Countdown ticker.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>Stage Name *</label>
                      <input
                        required
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Korean Name *</label>
                      <input
                        required
                        value={memberKoreanName}
                        onChange={(e) => setMemberKoreanName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Full Birth Name</label>
                      <input
                        value={memberFullName}
                        onChange={(e) => setMemberFullName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>Position / Role *</label>
                      <input
                        required
                        value={memberPosition}
                        onChange={(e) => setMemberPosition(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Birthday (YYYY-MM-DD)</label>
                      <input
                        type="date"
                        value={memberBirthday}
                        onChange={(e) => setMemberBirthday(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Nationality</label>
                      <input
                        value={memberNationality}
                        onChange={(e) => setMemberNationality(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Portrait Photocard Image URL</label>
                      <input
                        value={memberImage}
                        onChange={(e) => setMemberImage(e.target.value)}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Editorial Pull-Quote Tagline *</label>
                      <input
                        required
                        value={memberTagline}
                        onChange={(e) => setMemberTagline(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Editorial Biography *</label>
                    <textarea
                      rows={3}
                      required
                      value={memberBio}
                      onChange={(e) => setMemberBio(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>IVE Journey &amp; Era Milestones</label>
                    <textarea
                      rows={3}
                      value={memberJourney}
                      onChange={(e) => setMemberJourney(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Numbered Archive Notes / Facts (One fact per line)
                    </label>
                    <textarea
                      rows={4}
                      value={memberFactsText}
                      onChange={(e) => setMemberFactsText(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                    >
                      <Plus size={14} />
                      Stage Profile Changes for {memberName}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: NEWS DISPATCHES (2-Column Master-Detail Table + Form)      */}
          {/* ================================================================= */}
          {tab === "news" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left 7 Cols: News Dispatches List */}
              <div className="lg:col-span-7">
                <div className={cn("overflow-hidden rounded-xl border", panelBg)}>
                  <div className={cn("border-b px-5 py-3.5", borderClass)}>
                    <h2 className={cn("text-sm font-semibold", headingText)}>
                      Published News Dispatches ({news.length})
                    </h2>
                    <p className={cn("text-xs", subText)}>
                      Manage editorial updates displayed on the Home screen carousel.
                    </p>
                  </div>

                  <div className={cn("divide-y", dividerClass)}>
                    {news.map((item) => {
                      const isEditing = editingNewsId === item.id;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-start justify-between gap-4 px-5 py-3.5 transition-colors",
                            isEditing ? "bg-indigo-500/10" : rowHover,
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-indigo-600 dark:text-indigo-300">
                                {item.category}
                              </span>
                              <span className={cn("font-mono text-[11px]", subText)}>
                                {item.date}
                              </span>
                              {item.albumId && (
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5 font-mono text-[10px]",
                                    isLight
                                      ? "bg-slate-100 text-slate-600"
                                      : "bg-slate-800 text-slate-300",
                                  )}
                                >
                                  Album: {item.albumId}
                                </span>
                              )}
                            </div>
                            <p className={cn("mt-1.5 text-sm font-semibold", headingText)}>
                              {item.title}
                            </p>
                            <p className={cn("mt-1 line-clamp-2 text-xs leading-relaxed", subText)}>
                              {item.summary}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => loadNewsIntoForm(item)}
                              className={cn(
                                "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                                isEditing
                                  ? "border-indigo-500 bg-indigo-600 text-white"
                                  : secondaryBtn,
                              )}
                            >
                              <Edit3 size={12} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                stageNewsDelete(item.id);
                                setStatus(`Staged deletion of news "${item.title}".`);
                              }}
                              title={`Delete ${item.title}`}
                              className={cn(
                                "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-500",
                                secondaryBtn,
                              )}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: News Inspector Form */}
              <div className="lg:col-span-5">
                <form
                  onSubmit={handleStageNews}
                  className={cn("sticky top-20 space-y-4 rounded-xl border p-5", panelBg)}
                >
                  <div className={cn("flex items-center justify-between border-b pb-3.5", borderClass)}>
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-indigo-500" />
                      <div>
                        <h3 className={cn("text-sm font-semibold", headingText)}>
                          {editingNewsId ? "Edit News Dispatch" : "Create News Dispatch"}
                        </h3>
                        <p className={cn("font-mono text-[10px]", subText)}>
                          {editingNewsId
                            ? `Dispatch ID: ${editingNewsId}`
                            : "Publish a new update card to the Home feed"}
                        </p>
                      </div>
                    </div>
                    {editingNewsId && (
                      <button
                        type="button"
                        onClick={resetNewsForm}
                        className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium", secondaryBtn)}
                      >
                        Reset to New
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Category</label>
                      <select
                        value={newsCategory}
                        onChange={(e) => setNewsCategory(e.target.value as NewsItem["category"])}
                        className={inputClass}
                      >
                        <option value="Release">Release</option>
                        <option value="Tour & Live">Tour &amp; Live</option>
                        <option value="Announcement">Announcement</option>
                        <option value="Performance">Performance</option>
                        <option value="Official">Official</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Dispatch Date *</label>
                      <input
                        type="date"
                        required
                        value={newsDate}
                        onChange={(e) => setNewsDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Headline *</label>
                    <input
                      required
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      placeholder="e.g. IVE Announces 2026 World Tour Encore"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Editorial Summary *</label>
                    <textarea
                      required
                      rows={2}
                      value={newsSummary}
                      onChange={(e) => setNewsSummary(e.target.value)}
                      placeholder="Concise summary shown on the news card..."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Article Bullet Highlights (One paragraph/bullet per line)
                    </label>
                    <textarea
                      rows={3}
                      value={newsDetailsText}
                      onChange={(e) => setNewsDetailsText(e.target.value)}
                      placeholder="Detailed points shown when a user expands the news modal..."
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Banner Image URL</label>
                      <input
                        value={newsImage}
                        onChange={(e) => setNewsImage(e.target.value)}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Linked Release (Optional)</label>
                      <select
                        value={newsAlbumId}
                        onChange={(e) => setNewsAlbumId(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">No linked album</option>
                        {albums.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
                  >
                    <Plus size={14} />
                    {editingNewsId ? "Stage News Update" : "Stage New Dispatch"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: DATABASE & SEEDING OPERATIONS                              */}
          {/* ================================================================= */}
          {tab === "seed" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className={cn("rounded-xl border p-6", panelBg)}>
                  <div className="flex items-start gap-3.5">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-500">
                      <Database size={18} />
                    </div>
                    <div>
                      <h2 className={cn("text-base font-semibold", headingText)}>
                        Firestore Master Catalog Seeding
                      </h2>
                      <p className={cn("mt-1 text-xs leading-relaxed", subText)}>
                        Synchronize or restore the baseline IVE catalog from the verified local
                        bundled dataset directly into your Cloud Firestore collections (
                        <code>albums</code>, <code>tracks</code>, <code>members</code>,{" "}
                        <code>news</code>, and <code>appConfig/home</code>).
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className={cn("rounded-lg border p-3", subPanelBg)}>
                      <p className={cn("font-mono text-[10px] uppercase", mutedMonoText)}>Albums</p>
                      <p className={cn("mt-1 text-lg font-bold", headingText)}>{albums.length}</p>
                    </div>
                    <div className={cn("rounded-lg border p-3", subPanelBg)}>
                      <p className={cn("font-mono text-[10px] uppercase", mutedMonoText)}>Tracks</p>
                      <p className={cn("mt-1 text-lg font-bold", headingText)}>{tracks.length}</p>
                    </div>
                    <div className={cn("rounded-lg border p-3", subPanelBg)}>
                      <p className={cn("font-mono text-[10px] uppercase", mutedMonoText)}>Members</p>
                      <p className={cn("mt-1 text-lg font-bold", headingText)}>{members.length}</p>
                    </div>
                    <div className={cn("rounded-lg border p-3", subPanelBg)}>
                      <p className={cn("font-mono text-[10px] uppercase", mutedMonoText)}>News Items</p>
                      <p className={cn("mt-1 text-lg font-bold", headingText)}>{news.length}</p>
                    </div>
                  </div>

                  <div className={cn("mt-6 border-t pt-5", borderClass)}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSeed()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      {busy ? "Seeding Firestore Collections..." : "Seed Complete Archive to Firestore"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className={cn("rounded-xl border p-6", panelBg)}>
                  <h3 className={cn("text-sm font-semibold", headingText)}>
                    Deployment &amp; Audio Architecture
                  </h3>
                  <ul className={cn("mt-3 space-y-2.5 text-xs leading-relaxed", subText)}>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                      <span>
                        <strong>YouTube Audio Streaming:</strong> Paste any YouTube link into a song
                        record under <em>Songs &amp; Audio</em> to enable real music playback
                        synced with the glowing curly progress bar.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span>
                        <strong>Atomic Batch Push:</strong> Clicking{" "}
                        <em>Push Live Changes</em> commits all queued operations to Firestore in a
                        single batch transaction.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span>
                        <strong>Instant Mobile Sync:</strong> Connected Android devices receive the
                        updated YouTube song links and catalog changes immediately.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
