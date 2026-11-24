import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Database,
  Disc3,
  Edit3,
  Eye,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListMusic,
  Lock,
  LogOut,
  Menu,
  Moon,
  Newspaper,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Unlink,
  Upload,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { AdminDashboardOverview } from "@/components/admin/AdminDashboardOverview";
import { getAdminTheme } from "@/components/admin/apex-theme";
import { useAuth } from "@/lib/auth";
import {
  isItunesPreviewUrl,
  uploadTrackAudioToStorage,
} from "@/lib/audio-sources";
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
import { extractYouTubeId, resolveDirectAudioUrl } from "@/lib/player";
import { ArtworkImage } from "@/components/ArtworkImage";
import { cn } from "@/lib/utils";
import type { Album, AlbumType, Member, NewsItem, Track, TrackLanguage } from "@/types";

type AdminTab = "dashboard" | "albums" | "tracks" | "members" | "news" | "seed";
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

  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

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
  const [trackViewFilter, setTrackViewFilter] = useState<string>("ALL");
  const [trackAudioStatusFilter, setTrackAudioStatusFilter] = useState<"all" | "linked" | "missing">(
    "all",
  );
  const [trackSearchQuery, setTrackSearchQuery] = useState("");
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
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const candidateId =
      editingTrackId ??
      `${selectedAlbumId}-${slugify(trackTitle || file.name.replace(/\.[^.]+$/, "")).slice(0, 16)}`;

    setUploadingAudio(true);
    setUploadProgress(0);
    setStatus(null);
    try {
      const { downloadUrl, durationSeconds } = await uploadTrackAudioToStorage(
        candidateId,
        file,
        (pct) => setUploadProgress(pct),
      );
      setTrackAudioUrl(downloadUrl);
      if (durationSeconds && durationSeconds >= 10) {
        setTrackDurationSec(String(durationSeconds));
      }
      setStatus(
        `Uploaded "${file.name}" to Firebase Storage CDN (${durationSeconds ? `${durationSeconds}s` : "ready"}). Click "Stage Song" to save!`,
      );
    } catch (err: unknown) {
      setStatus(
        err instanceof Error
          ? `Upload error: ${err.message}`
          : "Failed to upload audio file to Firebase Storage.",
      );
    } finally {
      setUploadingAudio(false);
      e.target.value = "";
    }
  };

  const handleUnlinkTrackAudio = (track: Track) => {
    const parentAlbum = albums.find((a) => a.id === track.albumId);
    const cleaned: Track = { ...track };
    delete cleaned.audioUrl;
    stageTrackSave(cleaned, parentAlbum);
    if (editingTrackId === track.id) {
      setTrackAudioUrl("");
    }
    setStatus(
      `Staged audio unlink for "${track.title}". Click "Push Live Changes" to permanently remove it from Firestore.`,
    );
  };

  const handleUnlinkAllItunesPreviews = () => {
    const itunesLinked = tracks.filter((t) => isItunesPreviewUrl(t.audioUrl));
    if (itunesLinked.length === 0) {
      setStatus("No 30-second iTunes preview links found in your catalog.");
      return;
    }
    for (const t of itunesLinked) {
      const parentAlbum = albums.find((a) => a.id === t.albumId);
      const cleaned: Track = { ...t };
      delete cleaned.audioUrl;
      stageTrackSave(cleaned, parentAlbum);
    }
    if (isItunesPreviewUrl(trackAudioUrl)) {
      setTrackAudioUrl("");
    }
    setStatus(
      `Staged unlinking of ${itunesLinked.length} 30-second iTunes preview track${itunesLinked.length === 1 ? "" : "s"}! Click "Push Live Changes" to apply.`,
    );
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

  // Apex Royal Indigo-Navy & Pink-Rose Palette Tokens (Dark & Light)
  const theme = getAdminTheme(isLight);
  const {
    shellBg,
    chromeBg,
    chromeHeaderBg,
    panelBg,
    subPanelBg,
    dividerClass,
    borderClass,
    headingText,
    subText,
    mutedMonoText,
    rowHover,
    secondaryBtn,
    primaryBtn,
    activeRowBg,
    badgeNeutral,
    inputClass,
    labelClass,
  } = theme;

  const currentAlbumForTracks = albums.find((a) => a.id === selectedAlbumId) ?? albums[0];
  const baseDisplayedTracks =
    trackViewFilter === "ALL" ? tracks : getAlbumTracks(trackViewFilter);
  const selectedAlbumTracks = baseDisplayedTracks.filter((t) => {
    const hasLink = Boolean(extractYouTubeId(t.youtubeUrl) || resolveDirectAudioUrl(t.audioUrl));
    if (trackAudioStatusFilter === "linked" && !hasLink) return false;
    if (trackAudioStatusFilter === "missing" && hasLink) return false;
    if (trackSearchQuery.trim()) {
      const q = trackSearchQuery.toLowerCase().trim();
      const parentTitle = albums.find((a) => a.id === t.albumId)?.title.toLowerCase() ?? "";
      return (
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        parentTitle.includes(q)
      );
    }
    return true;
  });
  const parsedYoutubeIdPreview = extractYouTubeId(trackYoutubeUrl);
  const parsedDirectAudioPreview = resolveDirectAudioUrl(trackAudioUrl);
  const isSpotifyLinkWarning = trackAudioUrl.toLowerCase().includes("spotify.com");
  const itunesPreviewTracksCount = tracks.filter((t) => isItunesPreviewUrl(t.audioUrl)).length;
  const tracksWithAudioCount = tracks.filter(
    (t) => Boolean(extractYouTubeId(t.youtubeUrl) || resolveDirectAudioUrl(t.audioUrl)),
  ).length;

  const navItems: {
    id: AdminTab;
    label: string;
    subtitle: string;
    group: "CONTENT" | "SYSTEM";
    count?: number;
    icon: typeof Disc3;
  }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      subtitle:
        "A collection of analytics showing your catalog, audio streams, and Firestore sync data.",
      group: "CONTENT",
      icon: LayoutDashboard,
    },
    {
      id: "albums",
      label: "Discography Albums",
      subtitle: "Manage era releases, cover artwork, release dates, and Featured Era spotlight.",
      group: "CONTENT",
      count: albums.length,
      icon: Disc3,
    },
    {
      id: "tracks",
      label: "Songs & Audio",
      subtitle:
        "Upload full-length .MP3/.M4A tracks, link direct cloud or YouTube audio, and sync lyrics.",
      group: "CONTENT",
      count: tracks.length,
      icon: ListMusic,
    },
    {
      id: "members",
      label: "Member Dossiers",
      subtitle: "Edit official member profiles, photocards, biographies, and archive facts.",
      group: "CONTENT",
      count: members.length,
      icon: Users,
    },
    {
      id: "news",
      label: "News Dispatches",
      subtitle: "Publish comeback announcements, tour schedules, and editorial updates.",
      group: "CONTENT",
      count: news.length,
      icon: Newspaper,
    },
    {
      id: "seed",
      label: "Database & Seeding",
      subtitle: "Synchronize baseline catalog collections and inspect Cloud Firestore status.",
      group: "SYSTEM",
      icon: Database,
    },
  ];

  const activeNavMeta = navItems.find((item) => item.id === tab) ?? navItems[0]!;

  // Global top-bar search across Albums, Songs, Members, and News
  const globalSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    const results: {
      key: string;
      kind: "Album" | "Song" | "Member" | "News";
      title: string;
      sub: string;
      onSelect: () => void;
    }[] = [];

    for (const a of albums) {
      if (a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)) {
        results.push({
          key: `album-${a.id}`,
          kind: "Album",
          title: a.title,
          sub: `${a.type} · ${a.releaseDate}`,
          onSelect: () => {
            loadAlbumIntoForm(a);
            setTab("albums");
            setGlobalSearch("");
          },
        });
      }
      if (results.length >= 8) return results;
    }

    for (const t of tracks) {
      if (t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)) {
        const albumTitle = albums.find((a) => a.id === t.albumId)?.title ?? t.albumId;
        results.push({
          key: `track-${t.id}`,
          kind: "Song",
          title: t.title,
          sub: `${albumTitle} · ${formatDurationMmSs(t.duration)}`,
          onSelect: () => {
            loadTrackIntoForm(t);
            setTab("tracks");
            setGlobalSearch("");
          },
        });
      }
      if (results.length >= 8) return results;
    }

    for (const m of members) {
      if (
        m.name.toLowerCase().includes(q) ||
        m.koreanName.toLowerCase().includes(q) ||
        m.position.toLowerCase().includes(q)
      ) {
        results.push({
          key: `member-${m.id}`,
          kind: "Member",
          title: `${m.name} (${m.koreanName})`,
          sub: m.position,
          onSelect: () => {
            setSelectedMemberId(m.id);
            setTab("members");
            setGlobalSearch("");
          },
        });
      }
      if (results.length >= 8) return results;
    }

    for (const n of news) {
      if (n.title.toLowerCase().includes(q) || n.category.toLowerCase().includes(q)) {
        results.push({
          key: `news-${n.id}`,
          kind: "News",
          title: n.title,
          sub: `${n.category} · ${n.date}`,
          onSelect: () => {
            loadNewsIntoForm(n);
            setTab("news");
            setGlobalSearch("");
          },
        });
      }
      if (results.length >= 8) return results;
    }

    return results;
  }, [globalSearch, albums, tracks, members, news]);

  const adminDisplayName = email ? email.split("@")[0] : "Daniel Carney";
  const adminInitials = (adminDisplayName || "DA").slice(0, 2).toUpperCase();

  // ---------------------------------------------------------------------------
  // 1. UNAUTHENTICATED VIEW: Apex Admin Sign-In Gate
  // ---------------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div
        className={cn(
          "flex min-h-screen flex-col justify-between transition-colors selection:bg-[#ff3565] selection:text-white",
          shellBg,
        )}
      >
        {/* Top System Bar */}
        <header className={cn("flex items-center justify-between border-b px-6 py-3.5", chromeBg)}>
          <div className="flex items-center gap-3">
            {/* Apex 3D Pink Triangle Prism Logo */}
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#ff3d71] to-[#ff2662] text-white shadow-[0_6px_16px_-3px_rgba(255,45,104,0.6)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 20h20L12 2zm0 5.8L17.6 18H6.4L12 7.8z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("text-base font-bold tracking-tight", headingText)}>
                  Dive Archive
                </span>
                <span className="rounded bg-[#ff3565]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#ff3565]">
                  APEX CMS
                </span>
              </div>
              <p className={cn("text-[11px]", subText)}>
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
                  <Moon size={14} className="text-[#ff3565]" /> Dark
                </>
              ) : (
                <>
                  <Sun size={14} className="text-[#f5c43d]" /> Light
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
              <Eye size={14} className="text-[#1992ff]" />
              Preview Fan App
            </button>
          </div>
        </header>

        {/* Center Sign-In Card */}
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
          <div className={cn("rounded-xl border p-7", panelBg)}>
            <div className={cn("mb-6 flex items-center justify-between border-b pb-4", borderClass)}>
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#ff3d71] to-[#ff2662] text-white shadow-md">
                  <Lock size={16} />
                </div>
                <div>
                  <h1 className={cn("text-base font-semibold", headingText)}>
                    Administrator Sign-In
                  </h1>
                  <p className={cn("text-[11px]", subText)}>
                    Project: ive-dive-archive
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium",
                  isCloudEnabled
                    ? "border border-[#13c276]/30 bg-[#13c276]/15 text-[#13c276]"
                    : "border border-[#f5c43d]/30 bg-[#f5c43d]/15 text-[#f5c43d]",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isCloudEnabled ? "bg-[#13c276]" : "bg-[#f5c43d]",
                  )}
                />
                {isCloudEnabled ? "FIRESTORE ONLINE" : "CONNECTING"}
              </span>
            </div>

            {!isCloudEnabled ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-500">
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
                  <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className={cn(
                    "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all disabled:opacity-50",
                    primaryBtn,
                  )}
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
  // 2. AUTHENTICATED VIEW: Full Apex Analytics & CMS Workspace
  // ---------------------------------------------------------------------------
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col font-sans transition-colors selection:bg-[#ff3565] selection:text-white",
        shellBg,
      )}
    >
      {/* FULL-WIDTH TOP APEX NAVBAR (Logo + Pink Menu Toggle + Global Search + Badges + Avatar) */}
      <header
        className={cn(
          "sticky top-0 z-40 flex h-16 w-full items-center justify-between gap-4 border-b px-5 backdrop-blur-md",
          chromeHeaderBg,
        )}
      >
        {/* Left: Apex Brand + Pink Hamburger Collapse Button + Search Bar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setTab("dashboard")}
            className="flex items-center gap-2.5 pr-2 text-left"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ff3d71] to-[#ff2662] text-white shadow-[0_6px_16px_-3px_rgba(255,45,104,0.65)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 20h20L12 2zm0 5.8L17.6 18H6.4L12 7.8z" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div className="hidden sm:block">
                <span className={cn("text-lg font-bold tracking-tight", headingText)}>
                  Dive<span className="text-[#ff3565]">.</span>Archive
                </span>
              </div>
            )}
          </button>

          {/* Pink Rounded Square Menu Toggle (matches Apex pink ☰ button) */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform active:scale-95",
              primaryBtn,
            )}
          >
            <Menu size={16} />
          </button>

          {/* Global Search Input with Live Dropdown */}
          <div className="relative hidden md:block">
            <div
              className={cn(
                "flex w-64 items-center gap-2 rounded-md border px-3 py-1.5 lg:w-72",
                isLight
                  ? "border-[#d5dcf4] bg-[#f4f6fd]"
                  : "border-[#2c3778] bg-[#161c42]",
              )}
            >
              <Search size={14} className={subText} />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search albums, songs, members..."
                className={cn(
                  "w-full bg-transparent text-xs outline-none",
                  headingText,
                  isLight ? "placeholder:text-[#8992c2]" : "placeholder:text-[#6f7bb6]",
                )}
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch("")}
                  className={subText}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {globalSearchResults.length > 0 && (
              <div
                className={cn(
                  "absolute top-full left-0 z-50 mt-1.5 w-80 overflow-hidden rounded-lg border shadow-2xl",
                  panelBg,
                )}
              >
                <div className={cn("divide-y", dividerClass)}>
                  {globalSearchResults.map((res) => (
                    <button
                      key={res.key}
                      type="button"
                      onClick={res.onSelect}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs transition-colors",
                        rowHover,
                      )}
                    >
                      <div className="min-w-0">
                        <p className={cn("truncate font-semibold", headingText)}>
                          {res.title}
                        </p>
                        <p className={cn("truncate text-[10px]", subText)}>{res.sub}</p>
                      </div>
                      <span className="shrink-0 rounded bg-[#ff3565]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#ff3565]">
                        {res.kind}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Apex Circular Badge Icons + Push Live + Admin Profile Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Mode Circular Button */}
          <button
            type="button"
            onClick={toggleColorMode}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            className={cn(
              "relative grid h-9 w-9 place-items-center rounded-full border transition-colors",
              secondaryBtn,
            )}
          >
            {isLight ? (
              <Moon size={15} className="text-[#ff3565]" />
            ) : (
              <Sun size={15} className="text-[#f5c43d]" />
            )}
          </button>

          {/* Audio Linked Count Circular Badge (matches Apex green badge icon) */}
          <button
            type="button"
            onClick={() => setTab("tracks")}
            title={`${tracksWithAudioCount} songs linked with audio`}
            className={cn(
              "relative grid h-9 w-9 place-items-center rounded-full border transition-colors",
              secondaryBtn,
            )}
          >
            <Volume2 size={15} />
            <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#13c276] px-1 text-[9px] font-bold text-white shadow-xs">
              {tracksWithAudioCount}
            </span>
          </button>

          {/* Staged Changes Circular Badge (matches Apex pink badge icon) */}
          <button
            type="button"
            onClick={() => {
              if (pendingCount > 0) {
                void handlePushLive();
              } else {
                setTab("seed");
              }
            }}
            title={
              pendingCount > 0
                ? `${pendingCount} staged changes ready to push live`
                : "0 staged changes"
            }
            className={cn(
              "relative grid h-9 w-9 place-items-center rounded-full border transition-colors",
              secondaryBtn,
            )}
          >
            <Rocket size={15} />
            <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff3565] px-1 text-[9px] font-bold text-white shadow-xs">
              {pendingCount}
            </span>
          </button>

          {/* Preview Fan App Button */}
          <button
            type="button"
            onClick={() => setPreviewingFanApp(true)}
            className={cn(
              "hidden items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:inline-flex",
              secondaryBtn,
            )}
          >
            <Eye size={14} className="text-[#1992ff]" />
            <span>Preview App</span>
          </button>

          {/* Discard All Staged Button */}
          {pendingCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={clearAllStagedChanges}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors hover:border-[#ff3565] hover:text-[#ff3565]",
                secondaryBtn,
              )}
            >
              <RotateCcw size={13} />
              <span className="hidden lg:inline">Discard ({pendingCount})</span>
            </button>
          )}

          {/* Primary Push Live Button */}
          <button
            type="button"
            disabled={busy || pendingCount === 0}
            onClick={() => void handlePushLive()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
              pendingCount > 0
                ? primaryBtn
                : isLight
                  ? "cursor-not-allowed border border-[#dce2f7] bg-[#f4f6fd] text-[#9aa5d9]"
                  : "cursor-not-allowed border border-[#2c3778] bg-[#181f4a] text-[#6f7bb6]",
            )}
          >
            <Rocket size={13} />
            <span>
              {busy ? "Deploying..." : `Push Live (${pendingCount})`}
            </span>
          </button>

          {/* Admin Avatar + Name + Role + Sign Out (matches Apex top-right profile chip) */}
          <div
            className={cn(
              "ml-1 flex items-center gap-2.5 border-l pl-3",
              borderClass,
            )}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff3d71] to-[#a845ff] text-xs font-bold text-white shadow-sm ring-2 ring-[#ff3565]/40">
              {adminInitials}
            </div>
            <div className="hidden text-left xl:block">
              <p className={cn("max-w-[120px] truncate text-xs font-semibold", headingText)}>
                {adminDisplayName}
              </p>
              <p className={cn("text-[10px]", subText)}>Admin</p>
            </div>
            <button
              type="button"
              onClick={() => void signOutAdmin()}
              title="Sign out of Admin CMS"
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors hover:border-[#ff3565] hover:text-[#ff3565]",
                secondaryBtn,
              )}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* BODY BELOW TOP NAVBAR: COLLAPSIBLE LEFT SIDEBAR + MAIN WORKSPACE */}
      <div className="flex min-h-[calc(100vh-4rem)] flex-1">
        {/* LEFT PERSISTENT APEX SIDEBAR */}
        <aside
          className={cn(
            "sticky top-16 flex h-[calc(100vh-4rem)] shrink-0 flex-col justify-between border-r transition-all duration-200",
            chromeBg,
            sidebarCollapsed ? "w-[74px]" : "w-60",
          )}
        >
          <div className="overflow-y-auto px-2.5 py-4">
            <nav className="space-y-1.5">
              {navItems.map(({ id, label, count, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    title={label}
                    className={cn(
                      "group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all",
                      active
                        ? isLight
                          ? "bg-[#eef1fb] text-[#1e2554] font-semibold"
                          : "bg-[#26306e] text-white font-semibold"
                        : isLight
                          ? "text-[#5e689e] hover:bg-[#f4f6fd] hover:text-[#1e2554]"
                          : "text-[#a6b0e3] hover:bg-[#232d66]/70 hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {/* Apex signature: Active item gets glowing pink-rose gradient square icon chip! */}
                      <span
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all",
                          active
                            ? "bg-gradient-to-br from-[#ff3d71] to-[#ff2662] text-white shadow-[0_4px_14px_rgba(255,53,101,0.55)]"
                            : isLight
                              ? "text-[#5e689e] group-hover:text-[#1e2554]"
                              : "text-[#8d97cc] group-hover:text-white",
                        )}
                      >
                        <Icon size={16} />
                      </span>
                      {!sidebarCollapsed && <span className="truncate">{label}</span>}
                    </span>

                    {!sidebarCollapsed && (
                      <span className="flex items-center gap-1.5">
                        {typeof count === "number" && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-mono text-[10px]",
                              active
                                ? "bg-[#ff3565]/20 text-[#ff3565]"
                                : badgeNeutral,
                            )}
                          >
                            {count}
                          </span>
                        )}
                        <ChevronRight
                          size={13}
                          className={cn(
                            "transition-transform",
                            active
                              ? "translate-x-0.5 text-[#ff3565]"
                              : mutedMonoText,
                          )}
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Bottom Firestore Live Status Footer */}
          {!sidebarCollapsed && (
            <div className={cn("border-t p-3.5", borderClass)}>
              <div className={cn("rounded-lg border p-2.5", subPanelBg)}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#13c276]" />
                  <span className={cn("text-[11px] font-semibold", headingText)}>
                    Firestore Production
                  </span>
                </div>
                <p className={cn("mt-0.5 text-[10px]", subText)}>
                  {albums.length} albums · {tracks.length} songs synced
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT SHELL */}
        <main className="mx-auto w-full max-w-[1440px] min-w-0 flex-1 space-y-5 p-6">
          {/* APEX PAGE TITLE & SUBTITLE HEADER */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className={cn("text-xl font-semibold tracking-tight", headingText)}>
                {activeNavMeta.label}
              </h1>
              <p className={cn("mt-0.5 text-xs", subText)}>
                {activeNavMeta.subtitle}
              </p>
            </div>
          </div>

          {/* STAGED CHANGES QUEUE DRAWER (WHEN PENDING > 0) */}
          {changes.length > 0 && (
            <div
              className={cn(
                "rounded-lg border p-4",
                isLight
                  ? "border-amber-300 bg-amber-50/90"
                  : "border-[#f5c43d]/40 bg-[#25285a]",
              )}
            >
              <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b pb-3", borderClass)}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-[#f5c43d]" />
                  <h2
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      isLight ? "text-amber-900" : "text-[#f5c43d]",
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
                          ? "bg-[#ff3565]/20 text-[#ff3565]"
                          : "bg-[#13c276]/20 text-[#13c276]",
                      )}
                    >
                      {c.action === "delete" ? "DELETE" : "UPSERT"}
                    </span>
                    <span className={cn("max-w-[240px] truncate", headingText)}>{c.label}</span>
                    <button
                      type="button"
                      onClick={() => discardStagedChange(c)}
                      aria-label={`Discard ${c.label}`}
                      className={cn("ml-1 rounded p-0.5 hover:text-[#ff3565]", subText)}
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
            <div className="flex items-center justify-between rounded-lg border border-[#ff3565]/40 bg-[#ff3565]/15 px-4 py-3 text-xs text-white">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="shrink-0 text-[#ff3565]" />
                <span className={cn("font-medium", headingText)}>{status}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatus(null)}
                className="text-[#ff3565] hover:opacity-80"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 0: APEX ANALYTICS DASHBOARD OVERVIEW                          */}
          {/* ================================================================= */}
          {tab === "dashboard" && (
            <AdminDashboardOverview
              albums={albums}
              tracks={tracks}
              members={members}
              news={news}
              pendingCount={pendingCount}
              isLight={isLight}
              theme={theme}
              onNavigateTab={(targetTab) => setTab(targetTab)}
              onInspectAlbum={(album) => loadAlbumIntoForm(album)}
            />
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
                            isEditing ? activeRowBg : rowHover,
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
                                  <span className="inline-flex items-center gap-1 rounded border border-[#f5c43d]/40 bg-[#f5c43d]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#f5c43d]">
                                    ★ Featured Era
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5 font-mono text-[10px]",
                                    badgeNeutral,
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
                                  ? "border-[#ff3565] bg-[#ff3565] text-white"
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
                      <FolderKanban size={16} className="text-[#ff3565]" />
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
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all",
                      primaryBtn,
                    )}
                  >
                    <Plus size={14} />
                    {editingAlbumId ? "Stage Album Update" : "Stage New Album"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: SONGS, YOUTUBE AUDIO & LYRICS (ALL SONGS OR BY ALBUM)      */}
          {/* ================================================================= */}
          {tab === "tracks" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left 7 Cols: Master Filter Bar (All Songs vs By Album) + Tracklist Table */}
              <div className="space-y-4 lg:col-span-7">
                <div className={cn("space-y-3 rounded-xl border p-4", panelBg)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className={cn(labelClass, "mb-0")}>
                      Browse Mode: All Songs ({tracks.length}) or By Album
                    </label>
                    <div className="flex items-center gap-1.5">
                      {(
                        [
                          { id: "all", label: `All (${tracks.length})` },
                          { id: "linked", label: `Audio Linked (${tracksWithAudioCount})` },
                          {
                            id: "missing",
                            label: `Needs Audio (${tracks.length - tracksWithAudioCount})`,
                          },
                        ] as const
                      ).map((pill) => (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setTrackAudioStatusFilter(pill.id)}
                          className={cn(
                            "rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors",
                            trackAudioStatusFilter === pill.id
                              ? primaryBtn
                              : secondaryBtn,
                          )}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <select
                      value={trackViewFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTrackViewFilter(val);
                        if (val !== "ALL") setSelectedAlbumId(val);
                      }}
                      className={cn(inputClass, "font-medium")}
                    >
                      <option value="ALL">
                        ★ All Songs Across All Releases ({tracks.length} tracks)
                      </option>
                      {albums.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} ({a.releaseDate.slice(0, 4)}) — {getAlbumTracks(a.id).length}{" "}
                          tracks
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={trackSearchQuery}
                      onChange={(e) => setTrackSearchQuery(e.target.value)}
                      placeholder="Quick filter by song or album title..."
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className={cn("overflow-hidden rounded-xl border", panelBg)}>
                  <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5", borderClass)}>
                    <div>
                      <h2 className={cn("text-sm font-semibold", headingText)}>
                        {trackViewFilter === "ALL"
                          ? `Complete Master Song Index (${selectedAlbumTracks.length} shown)`
                          : `${albums.find((a) => a.id === trackViewFilter)?.title ?? "Album"} Tracklist (${selectedAlbumTracks.length})`}
                      </h2>
                      <p className={cn("text-xs", subText)}>
                        Click Edit on any song to manually upload a full .MP3/.M4A file or attach a
                        direct cloud / YouTube link.
                      </p>
                    </div>
                    {itunesPreviewTracksCount > 0 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleUnlinkAllItunesPreviews}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-xs transition-colors hover:bg-rose-500/25 disabled:opacity-50 dark:text-rose-300"
                      >
                        <Unlink size={13} />
                        Unlink All 30s iTunes Previews ({itunesPreviewTracksCount})
                      </button>
                    )}
                  </div>

                  {selectedAlbumTracks.length === 0 ? (
                    <div className={cn("p-8 text-center text-xs", subText)}>
                      No tracks match the current filter.
                    </div>
                  ) : (
                    <div className={cn("max-h-[680px] overflow-y-auto divide-y", dividerClass)}>
                      {selectedAlbumTracks.map((t, idx) => {
                        const isFeaturedSong = config.featuredTrackId === t.id;
                        const isEditing = editingTrackId === t.id;
                        const ytId = extractYouTubeId(t.youtubeUrl);
                        const directUrl = resolveDirectAudioUrl(t.audioUrl);
                        const isItunes = isItunesPreviewUrl(t.audioUrl);
                        const parentAlbumObj = albums.find((a) => a.id === t.albumId);
                        return (
                          <div
                            key={t.id}
                            className={cn(
                              "flex items-center justify-between gap-4 px-5 py-3 transition-colors",
                              isEditing ? activeRowBg : rowHover,
                            )}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3.5">
                              {trackViewFilter === "ALL" && parentAlbumObj ? (
                                <div className={cn("h-9 w-9 shrink-0 overflow-hidden rounded-md border", borderClass)}>
                                  <ArtworkImage
                                    src={parentAlbumObj.cover}
                                    alt={parentAlbumObj.title}
                                    kind="album"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <span className={cn("w-6 shrink-0 font-mono text-xs font-semibold", mutedMonoText)}>
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className={cn("truncate text-sm font-semibold", headingText)}>
                                    {t.title}
                                  </p>
                                  {directUrl && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase",
                                        isItunes
                                          ? "border-[#f5c43d]/40 bg-[#f5c43d]/15 text-[#f5c43d]"
                                          : "border-[#13c276]/30 bg-[#13c276]/15 text-[#13c276]",
                                      )}
                                    >
                                      {isItunes ? "⚠ 30s iTunes Preview" : "⚡ Full Direct Audio"}
                                    </span>
                                  )}
                                  {ytId && (
                                    <span className="inline-flex items-center gap-1 rounded border border-[#ff3565]/30 bg-[#ff3565]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#ff3565]">
                                      <Play size={8} className="fill-current" />
                                      YT: {ytId}
                                    </span>
                                  )}
                                  {t.isTitleTrack && (
                                    <span className="rounded bg-[#1992ff]/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#1992ff]">
                                      Title
                                    </span>
                                  )}
                                  {t.isSolo && (
                                    <span className="rounded bg-[#a845ff]/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#a845ff]">
                                      Solo · {t.artist}
                                    </span>
                                  )}
                                  {t.lyricsAvailable && (
                                    <span className="rounded bg-[#13c276]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#13c276]">
                                      Lyrics
                                    </span>
                                  )}
                                  {isFeaturedSong && (
                                    <span className="rounded border border-[#f5c43d]/40 bg-[#f5c43d]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#f5c43d]">
                                      ★ Featured Song
                                    </span>
                                  )}
                                </div>
                                <p className={cn("mt-0.5 font-mono text-[11px]", subText)}>
                                  {parentAlbumObj ? `${parentAlbumObj.title} · ` : ""}
                                  {formatDurationMmSs(t.duration)} ({t.duration ?? 180}s) ·{" "}
                                  {t.language ?? "Korean"}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              {directUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleUnlinkTrackAudio(t)}
                                  title={`Unlink direct audio from ${t.title}`}
                                  className={cn(
                                    "inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors",
                                    isItunes
                                      ? "border-[#ff3565]/40 bg-[#ff3565]/15 text-[#ff3565] hover:bg-[#ff3565]/25"
                                      : cn(secondaryBtn, "hover:border-[#ff3565] hover:text-[#ff3565]"),
                                  )}
                                >
                                  <Unlink size={12} />
                                  Unlink
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => loadTrackIntoForm(t)}
                                className={cn(
                                  "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                                  isEditing
                                    ? "border-[#ff3565] bg-[#ff3565] text-white"
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
                      <ListMusic size={16} className="text-[#ff3565]" />
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

                  {/* Manual Full-Song Direct Cloud Audio & YouTube Stream Box */}
                  <div className={cn("space-y-3 rounded-lg border p-3.5", subPanelBg)}>
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#ff3565]">
                        <Volume2 size={13} /> Manual Full-Song Audio Source
                      </span>
                      <div className="flex items-center gap-1.5">
                        {parsedDirectAudioPreview && !isSpotifyLinkWarning && (
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 font-mono text-[10px] font-semibold",
                              isItunesPreviewUrl(trackAudioUrl)
                                ? "bg-[#f5c43d]/15 text-[#f5c43d]"
                                : "bg-[#13c276]/15 text-[#13c276]",
                            )}
                          >
                            {isItunesPreviewUrl(trackAudioUrl)
                              ? "⚠ 30s iTunes Preview"
                              : "⚡ 0ms Full Audio Ready"}
                          </span>
                        )}
                        {parsedYoutubeIdPreview && (
                          <span className="rounded bg-[#ff3565]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#ff3565]">
                            ✓ YT ID: {parsedYoutubeIdPreview}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Full-Length File Upload Button */}
                    <label
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors",
                        uploadingAudio
                          ? "border-[#ff3565] bg-[#ff3565]/15 text-[#ff3565]"
                          : "border-[#ff3565]/40 bg-[#ff3565]/10 text-[#ff3565] hover:bg-[#ff3565]/20",
                      )}
                    >
                      <Upload size={14} />
                      <span>
                        {uploadingAudio
                          ? `Uploading Full Track to Firebase Storage (${uploadProgress}%)...`
                          : "Upload Full .MP3 / .M4A File from Computer"}
                      </span>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                        disabled={uploadingAudio}
                        onChange={(e) => void handleAudioFileUpload(e)}
                        className="sr-only"
                      />
                    </label>

                    <div>
                      <label className={labelClass}>
                        Method 1 (0ms Instant Play): Direct Full Audio URL (.mp3, .m4a, Firebase
                        Storage, Catbox, Dropbox, Google Drive)
                      </label>
                      <input
                        value={trackAudioUrl}
                        onChange={(e) => setTrackAudioUrl(e.target.value)}
                        placeholder="https://... (Upload .mp3/.m4a above or paste direct link)"
                        className={inputClass}
                      />
                    </div>

                    {isSpotifyLinkWarning && (
                      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-600 dark:text-amber-300">
                        <strong>Note on Spotify Links:</strong> Spotify URLs (
                        <code>open.spotify.com</code>) use DRM encryption and only allow 30-second
                        previews in web/mobile embeds. For full-length instant songs, upload an{" "}
                        <code>.mp3</code> / <code>.m4a</code> file above or paste a direct
                        Catbox/Dropbox/Google Drive/YouTube link.
                      </div>
                    )}

                    {parsedDirectAudioPreview && !isSpotifyLinkWarning && (
                      <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-emerald-500">
                            ⚡ Live Direct Audio Preview (0ms HTML5 Engine)
                          </span>
                          <button
                            type="button"
                            onClick={() => setTrackAudioUrl("")}
                            className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-rose-500 hover:underline"
                          >
                            <Unlink size={10} /> Unlink / Clear Audio URL
                          </button>
                        </div>
                        <audio
                          controls
                          preload="metadata"
                          src={parsedDirectAudioPreview}
                          className="h-8 w-full"
                        />
                      </div>
                    )}

                    <div>
                      <label className={labelClass}>
                        Method 2 (Full-Song Fallback): YouTube URL or 11-Char Video ID
                      </label>
                      <input
                        value={trackYoutubeUrl}
                        onChange={(e) => setTrackYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=Y8JFxS1HlDo or youtu.be/..."
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
                          className="accent-[#ff3565]"
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
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all",
                      primaryBtn,
                    )}
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
                            active ? activeRowBg : rowHover,
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
                            <p className="mt-0.5 truncate text-xs text-[#ff3565]">{m.position}</p>
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
                          <span className="rounded bg-[#ff3565]/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#ff3565]">
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
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-xs font-semibold transition-all",
                        primaryBtn,
                      )}
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
                            isEditing ? activeRowBg : rowHover,
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded bg-[#ff3565]/20 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#ff3565]">
                                {item.category}
                              </span>
                              <span className={cn("font-mono text-[11px]", subText)}>
                                {item.date}
                              </span>
                              {item.albumId && (
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5 font-mono text-[10px]",
                                    badgeNeutral,
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
                                  ? "border-[#ff3565] bg-[#ff3565] text-white"
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
                      <FileText size={16} className="text-[#ff3565]" />
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
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all",
                      primaryBtn,
                    )}
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
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#ff3d71] to-[#ff2662] text-white shadow-md">
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
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold transition-all disabled:opacity-50",
                        primaryBtn,
                      )}
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
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff3565]" />
                      <span>
                        <strong>YouTube &amp; 0ms Direct Audio:</strong> Upload an <code>.mp3</code> /{" "}
                        <code>.m4a</code> file or paste a YouTube link into any song under{" "}
                        <em>Songs &amp; Audio</em> for real music playback synced with the glowing
                        progress bar.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#13c276]" />
                      <span>
                        <strong>Atomic Batch Push:</strong> Clicking{" "}
                        <em>Push Live</em> commits all queued operations to Firestore in a
                        single batch transaction.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1992ff]" />
                      <span>
                        <strong>Instant Mobile Sync:</strong> Connected Android devices receive the
                        updated song links and catalog changes immediately.
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
