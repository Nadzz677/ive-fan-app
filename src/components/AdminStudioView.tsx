import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Database,
  Disc3,
  Edit3,
  Eye,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  ListMusic,
  Lock,
  LogOut,
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
import { getAdminTheme } from "@/components/admin/apex-theme";
import { useAuth } from "@/lib/auth";
import {
  isItunesPreviewUrl,
  uploadHeroImageToStorage,
  uploadTrackAudioToStorage,
} from "@/lib/audio-sources";
import {
  clearAllStagedChanges,
  DEFAULT_HERO_IMAGES,
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
import { validateAdminHttpsInput } from "@/lib/url-security";
import { ArtworkImage } from "@/components/ArtworkImage";
import { cn } from "@/lib/utils";
import type { Album, AlbumType, Member, NewsItem, Track, TrackLanguage } from "@/types";

type AdminTab = "albums" | "tracks" | "members" | "news" | "hero" | "seed";
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

function AdminLoginGate({
  isLight,
  toggleColorMode,
  isCloudEnabled,
  onOpenFanPreview,
  onSignIn,
}: {
  isLight: boolean;
  toggleColorMode: () => void;
  isCloudEnabled: boolean;
  onOpenFanPreview: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
}) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    shellBg,
    chromeBg,
    chromeHeaderBg,
    panelBg,
    borderClass,
    headingText,
    subText,
    mutedMonoText,
    secondaryBtn,
    primaryBtn,
    inputClass,
    labelClass,
  } = getAdminTheme(isLight);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setBusy(true);
    try {
      await onSignIn(loginEmail, loginPassword);
      setLoginPassword("");
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col justify-between transition-colors selection:bg-[#5ce1b8] selection:text-[#181e24]",
        shellBg,
      )}
    >
      {/* Top System Bar */}
      <header className={cn("flex items-center justify-between border-b px-6 py-3.5", chromeBg)}>
        <div className="flex items-center gap-3">
          {/* M.R.A. Dual-Arc Mint & Coral Logo Mark */}
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#181e24] shadow-sm ring-1 ring-white/10">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <path
                d="M7 15.5L11.5 20L19 9"
                stroke="#5ce1b8"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 5A9 9 0 1 1 6.5 19"
                stroke="#e04f67"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">Dive Archive</span>
              <span className="rounded-full bg-[#e04f67] px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                CMS
              </span>
            </div>
            <p className="text-[11px] text-[#b4c2ce]">
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
                <Moon size={14} className="text-[#e04f67]" /> Dark
              </>
            ) : (
              <>
                <Sun size={14} className="text-[#5ce1b8]" /> Light
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenFanPreview}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors",
              secondaryBtn,
            )}
          >
            <Eye size={14} className="text-[#5ce1b8]" />
            Preview Fan App
          </button>
        </div>
      </header>

      {/* Center Sign-In Card */}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <div className={cn("rounded-2xl border p-7", panelBg)}>
          <div className={cn("mb-6 flex items-center justify-between border-b pb-4", borderClass)}>
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#5ce1b8]/15 text-[#5ce1b8] ring-1 ring-[#5ce1b8]/30">
                <Lock size={16} />
              </div>
              <div>
                <h1 className={cn("text-base font-semibold", headingText)}>
                  Administrator Sign-In
                </h1>
                <p className={cn("text-[11px]", subText)}>Project: ive-dive-archive</p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium",
                isCloudEnabled
                  ? "border border-[#5ce1b8]/30 bg-[#5ce1b8]/15 text-[#5ce1b8]"
                  : "border border-[#f5c43d]/30 bg-[#f5c43d]/15 text-[#f5c43d]",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isCloudEnabled ? "bg-[#5ce1b8]" : "bg-[#f5c43d]",
                )}
              />
              {isCloudEnabled ? "FIRESTORE ONLINE" : "CONNECTING"}
            </span>
          </div>

          {!isCloudEnabled ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-500">
              Connecting to Firebase project... Verify that <code>.env</code> contains your{" "}
              <code>VITE_FIREBASE_*</code> credentials.
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-email" className={labelClass}>
                  Administrator Email
                </label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  spellCheck={false}
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@ivedivearchive.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="admin-password" className={labelClass}>
                  Password
                </label>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={inputClass}
                />
              </div>

              {loginError && (
                <div className="flex items-start gap-2 rounded-lg border border-[#e04f67]/30 bg-[#e04f67]/10 p-3 text-xs text-[#e04f67]">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className={cn(
                  "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all disabled:opacity-50",
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
          chromeHeaderBg,
          mutedMonoText,
        )}
      >
        IVE: DIVE ARCHIVE BACK-OFFICE CMS · AUTHORIZED ACCESS ONLY
      </footer>
    </div>
  );
}

export function AdminStudioView() {
  const { isAdmin, email, signInAdmin, signOutAdmin, isCloudEnabled, setPreviewingFanApp } =
    useAuth();
  const navigate = useNavigate();

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

  const handleOpenFanPreview = () => {
    setPreviewingFanApp(true);
    void navigate({ to: "/" });
  };

  if (!isAdmin) {
    return (
      <AdminLoginGate
        isLight={isLight}
        toggleColorMode={toggleColorMode}
        isCloudEnabled={isCloudEnabled}
        onOpenFanPreview={handleOpenFanPreview}
        onSignIn={signInAdmin}
      />
    );
  }

  return (
    <AdminStudioWorkspace
      email={email}
      isLight={isLight}
      toggleColorMode={toggleColorMode}
      onOpenFanPreview={handleOpenFanPreview}
      signOutAdmin={signOutAdmin}
    />
  );
}

function AdminStudioWorkspace({
  email,
  isLight,
  toggleColorMode,
  onOpenFanPreview,
  signOutAdmin,
}: {
  email: string | null;
  isLight: boolean;
  toggleColorMode: () => void;
  onOpenFanPreview: () => void;
  signOutAdmin: () => Promise<void>;
}) {
  const { albums, tracks, members, news, config, getAlbumTracks } = useCatalog();
  const { changes, pendingCount } = useStagedCatalog();
  const queryClient = useQueryClient();
  const handleOpenFanPreview = onOpenFanPreview;

  const [tab, setTab] = useState<AdminTab>("albums");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  // Home Hero Photo Carousel & Welcome Tour Cover Photo Manager state
  const [newHeroUrl, setNewHeroUrl] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroUploadProgress, setHeroUploadProgress] = useState(0);
  const [welcomePhotoInput, setWelcomePhotoInput] = useState("");
  const [uploadingWelcomePhoto, setUploadingWelcomePhoto] = useState(false);

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
  const [trackAudioStatusFilter, setTrackAudioStatusFilter] = useState<
    "all" | "linked" | "missing"
  >("all");
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
    const coverCheck = validateAdminHttpsInput(albumCover, "Album Cover URL");
    if (!coverCheck.ok) {
      setStatus(coverCheck.error);
      return;
    }
    const existing = albums.find((a) => a.id === id);

    const album: Album = {
      id,
      title: albumTitle.trim(),
      type: albumType,
      releaseDate: albumDate,
      language: albumLang,
      cover: coverCheck.value,
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
    const audioCheck = validateAdminHttpsInput(trackAudioUrl, "Direct Audio URL");
    if (!audioCheck.ok) {
      setStatus(audioCheck.error);
      return;
    }
    const trimmedYt = trackYoutubeUrl.trim();
    if (trimmedYt && !extractYouTubeId(trimmedYt)) {
      setStatus("YouTube field must be a valid YouTube link or 11-character video ID.");
      return;
    }
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
      ...(trimmedYt ? { youtubeUrl: trimmedYt } : {}),
      ...(audioCheck.value ? { audioUrl: audioCheck.value } : {}),
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
    const imageCheck = validateAdminHttpsInput(memberImage, "Member Portrait URL");
    if (!imageCheck.ok) {
      setStatus(imageCheck.error);
      return;
    }

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
      image: imageCheck.value,
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
    const imageCheck = validateAdminHttpsInput(newsImage, "News Image URL");
    if (!imageCheck.ok) {
      setStatus(imageCheck.error);
      return;
    }

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
      ...(imageCheck.value ? { image: imageCheck.value } : {}),
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

  const heroImagesList = useMemo(() => {
    const list = (config.heroImages ?? []).map((u) => u.trim()).filter(Boolean);
    return list.length > 0 ? list : DEFAULT_HERO_IMAGES;
  }, [config.heroImages]);

  const handleAddHeroPhotoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newHeroUrl.trim();
    if (!trimmed) return;
    const heroCheck = validateAdminHttpsInput(trimmed, "Hero Banner Photo URL");
    if (!heroCheck.ok) {
      setStatus(heroCheck.error);
      return;
    }
    const nextList = [...heroImagesList, heroCheck.value];
    stageAppConfigSave({ heroImages: nextList });
    setNewHeroUrl("");
    setStatus(
      `Staged new Home Screen Hero Photo (Slide ${nextList.length}). Click "Push Live" when ready!`,
    );
  };

  const handleHeroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    setHeroUploadProgress(0);
    setStatus(null);
    try {
      const downloadUrl = await uploadHeroImageToStorage(file, (pct) => setHeroUploadProgress(pct));
      const nextList = [...heroImagesList, downloadUrl];
      stageAppConfigSave({ heroImages: nextList });
      setStatus(
        `Uploaded "${file.name}" and added as Slide ${nextList.length} on the Home Screen! Click "Push Live" to publish.`,
      );
    } catch (err: unknown) {
      setStatus(
        err instanceof Error
          ? `Hero image upload failed: ${err.message}`
          : "Failed to upload hero image to Firebase Storage.",
      );
    } finally {
      setUploadingHero(false);
      e.target.value = "";
    }
  };

  const handleMoveHeroPhoto = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= heroImagesList.length) return;
    const nextList = [...heroImagesList];
    const temp = nextList[index]!;
    nextList[index] = nextList[targetIdx]!;
    nextList[targetIdx] = temp;
    stageAppConfigSave({ heroImages: nextList });
    setStatus(`Reordered Home Screen Hero Photo to Slide ${targetIdx + 1}.`);
  };

  const handleRemoveHeroPhoto = (index: number) => {
    if (heroImagesList.length <= 1) {
      setStatus("At least 1 Hero Photo is required on the Home Screen.");
      return;
    }
    const nextList = heroImagesList.filter((_, idx) => idx !== index);
    stageAppConfigSave({ heroImages: nextList });
    setStatus(
      `Removed Slide ${index + 1} (${nextList.length} hero photo${nextList.length === 1 ? "" : "s"} remaining).`,
    );
  };

  const handleResetDefaultHeroPhotos = () => {
    stageAppConfigSave({ heroImages: DEFAULT_HERO_IMAGES });
    setStatus('Restored baseline IVE Hero Photos. Click "Push Live" to apply.');
  };

  const activeWelcomePhoto =
    config.welcomeImage?.trim() || heroImagesList[0] || DEFAULT_HERO_IMAGES[0] || "";

  const handleSetWelcomePhotoUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const welcomeCheck = validateAdminHttpsInput(trimmed, "Welcome Cover Photo URL");
    if (!welcomeCheck.ok) {
      setStatus(welcomeCheck.error);
      return;
    }
    stageAppConfigSave({ welcomeImage: welcomeCheck.value });
    setWelcomePhotoInput("");
    setStatus(
      'Staged new Welcome Tour Cover Photo (Slide 1)! Click "Push Live Changes" to publish.',
    );
  };

  const handleWelcomePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWelcomePhoto(true);
    setStatus(null);
    try {
      const downloadUrl = await uploadHeroImageToStorage(file);
      stageAppConfigSave({ welcomeImage: downloadUrl });
      setStatus(
        `Uploaded "${file.name}" as the Welcome Tour Cover Photo (Slide 1)! Click "Push Live Changes" to publish.`,
      );
    } catch (err: unknown) {
      setStatus(
        err instanceof Error
          ? `Welcome photo upload failed: ${err.message}`
          : "Failed to upload welcome photo to Firebase Storage.",
      );
    } finally {
      setUploadingWelcomePhoto(false);
      e.target.value = "";
    }
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

  const activeFeaturedAlbum = albums.find((a) => a.id === config.featuredAlbumId) ?? albums[0];
  const activeFeaturedTrack = tracks.find((t) => t.id === config.featuredTrackId) ?? tracks[0];
  const currentAlbumForTracks = albums.find((a) => a.id === selectedAlbumId) ?? albums[0];

  const selectedAlbumTracks = useMemo(() => {
    const baseDisplayed = trackViewFilter === "ALL" ? tracks : getAlbumTracks(trackViewFilter);
    const q = trackSearchQuery.toLowerCase().trim();
    return baseDisplayed.filter((t) => {
      const hasLink = Boolean(extractYouTubeId(t.youtubeUrl) || resolveDirectAudioUrl(t.audioUrl));
      if (trackAudioStatusFilter === "linked" && !hasLink) return false;
      if (trackAudioStatusFilter === "missing" && hasLink) return false;
      if (q) {
        const parentTitle = albums.find((a) => a.id === t.albumId)?.title.toLowerCase() ?? "";
        return (
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          parentTitle.includes(q)
        );
      }
      return true;
    });
  }, [trackViewFilter, tracks, getAlbumTracks, trackAudioStatusFilter, trackSearchQuery, albums]);

  const parsedYoutubeIdPreview = useMemo(
    () => extractYouTubeId(trackYoutubeUrl),
    [trackYoutubeUrl],
  );
  const parsedDirectAudioPreview = useMemo(
    () => resolveDirectAudioUrl(trackAudioUrl),
    [trackAudioUrl],
  );
  const isSpotifyLinkWarning = trackAudioUrl.toLowerCase().includes("spotify.com");
  const itunesPreviewTracksCount = useMemo(
    () => tracks.filter((t) => isItunesPreviewUrl(t.audioUrl)).length,
    [tracks],
  );
  const tracksWithAudioCount = useMemo(
    () =>
      tracks.filter((t) =>
        Boolean(extractYouTubeId(t.youtubeUrl) || resolveDirectAudioUrl(t.audioUrl)),
      ).length,
    [tracks],
  );

  const navItems: {
    id: AdminTab;
    label: string;
    subtitle: string;
    group: "CONTENT" | "SYSTEM";
    count?: number;
    icon: typeof Disc3;
  }[] = [
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
      id: "hero",
      label: "Home Hero Photos",
      subtitle:
        "Add, upload, or reorder IVE photos in the swipeable 5-second auto-rotating Home screen banner.",
      group: "CONTENT",
      count: heroImagesList.length,
      icon: ImageIcon,
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
  // AUTHENTICATED VIEW: M.R.A. Slate-Petrol Sidebar + Charcoal-Slate Workspace
  // ---------------------------------------------------------------------------
  return (
    <div
      className={cn(
        "flex min-h-screen font-sans transition-colors selection:bg-[#5ce1b8] selection:text-[#181e24]",
        shellBg,
      )}
    >
      {/* LEFT PERSISTENT M.R.A. SLATE-PETROL SIDEBAR (`#22303c`) */}
      <aside
        className={cn(
          "sticky top-0 flex h-screen w-60 shrink-0 flex-col justify-between border-r",
          chromeBg,
        )}
      >
        <div>
          {/* M.R.A. Centered Brand Block */}
          <div className="flex flex-col items-center border-b border-[#2c3c4a] px-5 pt-6 pb-5 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#18222b] shadow-md ring-1 ring-white/10">
              <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                <path
                  d="M7 15.5L11.5 20L19 9"
                  stroke="#5ce1b8"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 5A9 9 0 1 1 6.5 19"
                  stroke="#e04f67"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="mt-2.5 text-sm font-bold tracking-[0.16em] text-white uppercase">
              D.I.V.E.
            </p>
            <p className="mt-0.5 text-[10px] text-[#9eb0c0]">Archive Studio CMS</p>
          </div>

          {/* M.R.A. Navigation Items (Pure White Active Capsule + Coral-Rose Count Badges) */}
          <div className="px-3.5 py-5">
            <nav className="space-y-1.5">
              {navItems.map(({ id, label, count, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      "group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all",
                      active
                        ? "bg-white text-[#1b242d] font-semibold shadow-[0_6px_18px_-6px_rgba(0,0,0,0.45)]"
                        : "text-[#c3d0dc] hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        size={16}
                        className={
                          active ? "text-[#1b242d]" : "text-[#9eb0c0] group-hover:text-white"
                        }
                      />
                      <span className="truncate">{label}</span>
                    </span>

                    {typeof count === "number" && (
                      <span
                        className={cn(
                          "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold",
                          active ? "bg-[#e04f67] text-white" : "bg-[#e04f67] text-white shadow-xs",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* M.R.A. Bottom Centered Admin Avatar & Name Block */}
        <div className="border-t border-[#2c3c4a] px-4 py-5 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#5ce1b8] to-[#22303c] text-sm font-bold text-[#142026] shadow-md ring-2 ring-[#5ce1b8]/50">
            {adminInitials}
          </div>
          <p className="mt-2.5 truncate text-xs font-semibold text-white">{adminDisplayName}</p>
          <p className="text-[10px] text-[#9eb0c0]">Super Admin</p>
          <button
            type="button"
            onClick={() => void signOutAdmin()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#334656] bg-[#1b2630] px-3 py-1.5 text-[11px] font-medium text-[#c3d0dc] transition-colors hover:border-[#e04f67] hover:text-white"
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT SHELL */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP M.R.A. HEADER (Page Title + Centered Recessed Search + Right Controls) */}
        <header
          className={cn(
            "sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4 backdrop-blur-md",
            chromeHeaderBg,
          )}
        >
          {/* Left: Current Section Title */}
          <div>
            <h1 className={cn("text-lg font-semibold tracking-tight", headingText)}>
              {activeNavMeta.label}
            </h1>
            <p className={cn("text-[11px]", subText)}>{activeNavMeta.subtitle}</p>
          </div>

          {/* Center: M.R.A. Recessed Pill Search Bar */}
          <div className="relative hidden md:block">
            <div
              className={cn(
                "flex w-72 items-center gap-2.5 rounded-xl border px-3.5 py-2 lg:w-80",
                isLight ? "border-[#d5dde6] bg-[#f3f5f8]" : "border-[#2e3a46] bg-[#252e37]",
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
                  isLight ? "placeholder:text-[#8a99a8]" : "placeholder:text-[#7a8999]",
                )}
              />
              {globalSearch && (
                <button type="button" onClick={() => setGlobalSearch("")} className={subText}>
                  <X size={12} />
                </button>
              )}
            </div>

            {globalSearchResults.length > 0 && (
              <div
                className={cn(
                  "absolute top-full left-0 z-50 mt-1.5 w-80 overflow-hidden rounded-xl border shadow-2xl",
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
                        <p className={cn("truncate font-semibold", headingText)}>{res.title}</p>
                        <p className={cn("truncate text-[10px]", subText)}>{res.sub}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-[#c9c4f6]/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#c9c4f6]">
                        {res.kind}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: M.R.A. Theme Toggle Pill + Preview App + Push Live */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleColorMode}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                secondaryBtn,
              )}
            >
              {isLight ? (
                <>
                  <Moon size={14} className="text-[#22303c]" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun size={14} className="text-[#5ce1b8]" />
                  <span>Light</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenFanPreview}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors",
                secondaryBtn,
              )}
            >
              <Eye size={14} className="text-[#5ce1b8]" />
              <span>Preview Fan App</span>
            </button>

            {pendingCount > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={clearAllStagedChanges}
                className={cn(
                  "inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors hover:border-[#e04f67] hover:text-[#e04f67]",
                  secondaryBtn,
                )}
              >
                <RotateCcw size={13} />
                <span>Discard ({pendingCount})</span>
              </button>
            )}

            <button
              type="button"
              disabled={busy || pendingCount === 0}
              onClick={() => void handlePushLive()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all",
                pendingCount > 0
                  ? primaryBtn
                  : isLight
                    ? "cursor-not-allowed border border-[#dfe5ec] bg-[#eef2f6] text-[#8a99a8]"
                    : "cursor-not-allowed border border-[#2a343e] bg-[#222a32] text-[#6e7d8c]",
              )}
            >
              <Rocket size={13} />
              <span>{busy ? "Deploying..." : `Push Live Changes (${pendingCount})`}</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE BODY */}
        <main className="mx-auto w-full max-w-[1440px] min-w-0 flex-1 space-y-6 p-6">
          {/* M.R.A. 4-CARD KPI OVERVIEW STRIP (Unified Slate Surface Across All 4 Cards) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Discography Catalog */}
            <div className={cn("rounded-2xl border p-4", panelBg)}>
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold uppercase tracking-wider",
                    subText,
                  )}
                >
                  Discography Catalog
                </span>
                <Disc3 size={15} className="text-[#e04f67]" />
              </div>
              <p className={cn("mt-2 text-2xl font-bold tracking-tight", headingText)}>
                {albums.length} <span className={cn("text-xs font-normal", subText)}>releases</span>
              </p>
              <div
                className={cn("mt-2 flex items-center gap-2 font-mono text-[11px]", mutedMonoText)}
              >
                <span className="inline-block h-2.5 w-1 rounded-full bg-[#5ce1b8]" />
                <span>
                  {heroImagesList.length} hero photos · {members.length} members
                </span>
              </div>
            </div>

            {/* Card 2: Audio & YouTube Index (Mint-Aqua Accent) */}
            <div className={cn("rounded-2xl border p-4", panelBg)}>
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold uppercase tracking-wider",
                    subText,
                  )}
                >
                  Audio &amp; YouTube Index
                </span>
                <Volume2 size={15} className="text-[#5ce1b8]" />
              </div>
              <p className={cn("mt-2 text-2xl font-bold tracking-tight", headingText)}>
                {tracks.length} <span className={cn("text-xs font-normal", subText)}>tracks</span>
              </p>
              <p className={cn("mt-2 font-mono text-[11px]", mutedMonoText)}>
                <span className="text-[#5ce1b8]">{tracksWithAudioCount} audio linked</span> ·{" "}
                {tracks.filter((t) => t.lyricsAvailable).length} with lyrics
              </p>
            </div>

            {/* Card 3: Active Featured Spotlight (Soft Lavender Accent) */}
            <div className={cn("rounded-2xl border p-4", panelBg)}>
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold uppercase tracking-wider",
                    subText,
                  )}
                >
                  Active Featured Spotlight
                </span>
                <Star size={15} className="text-[#c9c4f6]" />
              </div>
              <p className={cn("mt-2 truncate text-base font-semibold", headingText)}>
                {activeFeaturedAlbum?.title ?? "None"}
              </p>
              <p className="mt-2 truncate font-mono text-[11px] text-[#c9c4f6]">
                Song: {activeFeaturedTrack?.title ?? "None"}
              </p>
            </div>

            {/* Card 4: Staged Deployment Queue (Coral-Rose / Mint-Aqua) */}
            <div
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                pendingCount > 0 ? "border-[#e04f67]/50 bg-[#e04f67]/12" : panelBg,
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold uppercase tracking-wider",
                    pendingCount > 0 ? "text-[#e04f67]" : subText,
                  )}
                >
                  Staged Deployment Queue
                </span>
                <Activity
                  size={15}
                  className={pendingCount > 0 ? "text-[#e04f67]" : "text-[#5ce1b8]"}
                />
              </div>
              <p className={cn("mt-2 text-2xl font-bold tracking-tight", headingText)}>
                {pendingCount}{" "}
                <span className={cn("text-xs font-normal", subText)}>
                  {pendingCount === 1 ? "pending change" : "pending changes"}
                </span>
              </p>
              <p className={cn("mt-2 font-mono text-[11px]", subText)}>
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
                "rounded-2xl border p-4",
                isLight ? "border-[#e04f67]/40 bg-[#fff5f7]" : "border-[#e04f67]/40 bg-[#241d23]",
              )}
            >
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 border-b pb-3",
                  borderClass,
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-[#e04f67]" />
                  <h2
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      isLight ? "text-[#b83248]" : "text-[#ff8fa0]",
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
                      "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs",
                      subPanelBg,
                    )}
                  >
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                        c.action === "delete"
                          ? "bg-[#e04f67]/20 text-[#e04f67]"
                          : "bg-[#5ce1b8]/20 text-[#5ce1b8]",
                      )}
                    >
                      {c.action === "delete" ? "DELETE" : "UPSERT"}
                    </span>
                    <span className={cn("max-w-[240px] truncate", headingText)}>{c.label}</span>
                    <button
                      type="button"
                      onClick={() => discardStagedChange(c)}
                      aria-label={`Discard ${c.label}`}
                      className={cn("ml-1 rounded p-0.5 hover:text-[#e04f67]", subText)}
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
            <div className="flex items-center justify-between rounded-xl border border-[#5ce1b8]/40 bg-[#5ce1b8]/12 px-4 py-3 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="shrink-0 text-[#5ce1b8]" />
                <span className={cn("font-medium", headingText)}>{status}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatus(null)}
                className="text-[#5ce1b8] hover:opacity-80"
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
                  <div
                    className={cn(
                      "flex items-center justify-between border-b px-5 py-3.5",
                      borderClass,
                    )}
                  >
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
                            <div
                              className={cn(
                                "h-11 w-11 shrink-0 overflow-hidden rounded-lg border",
                                borderClass,
                              )}
                            >
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
                              <div
                                className={cn(
                                  "mt-0.5 flex items-center gap-2 font-mono text-[11px]",
                                  subText,
                                )}
                              >
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
                                  ? "border-[#5ce1b8] bg-[#5ce1b8] text-[#142026] font-semibold"
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
                  <div
                    className={cn("flex items-center justify-between border-b pb-3.5", borderClass)}
                  >
                    <div className="flex items-center gap-2">
                      <FolderKanban size={16} className="text-[#5ce1b8]" />
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
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-medium",
                          secondaryBtn,
                        )}
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
                    <div
                      className={cn("flex items-center gap-3 rounded-lg border p-2.5", subPanelBg)}
                    >
                      <div
                        className={cn(
                          "h-12 w-12 shrink-0 overflow-hidden rounded border",
                          borderClass,
                        )}
                      >
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
                            trackAudioStatusFilter === pill.id ? primaryBtn : secondaryBtn,
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
                  <div
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5",
                      borderClass,
                    )}
                  >
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
                                <div
                                  className={cn(
                                    "h-9 w-9 shrink-0 overflow-hidden rounded-md border",
                                    borderClass,
                                  )}
                                >
                                  <ArtworkImage
                                    src={parentAlbumObj.cover}
                                    alt={parentAlbumObj.title}
                                    kind="album"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <span
                                  className={cn(
                                    "w-6 shrink-0 font-mono text-xs font-semibold",
                                    mutedMonoText,
                                  )}
                                >
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
                                          : "border-[#5ce1b8]/35 bg-[#5ce1b8]/15 text-[#5ce1b8]",
                                      )}
                                    >
                                      {isItunes ? "⚠ 30s iTunes Preview" : "⚡ Full Direct Audio"}
                                    </span>
                                  )}
                                  {ytId && (
                                    <span className="inline-flex items-center gap-1 rounded border border-[#e04f67]/35 bg-[#e04f67]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#e04f67]">
                                      <Play size={8} className="fill-current" />
                                      YT: {ytId}
                                    </span>
                                  )}
                                  {t.isTitleTrack && (
                                    <span className="rounded bg-[#c9c4f6]/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#c9c4f6]">
                                      Title
                                    </span>
                                  )}
                                  {t.isSolo && (
                                    <span className="rounded bg-[#c9c4f6]/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#c9c4f6]">
                                      Solo · {t.artist}
                                    </span>
                                  )}
                                  {t.lyricsAvailable && (
                                    <span className="rounded bg-[#5ce1b8]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#5ce1b8]">
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
                                      ? "border-[#e04f67]/40 bg-[#e04f67]/15 text-[#e04f67] hover:bg-[#e04f67]/25"
                                      : cn(
                                          secondaryBtn,
                                          "hover:border-[#e04f67] hover:text-[#e04f67]",
                                        ),
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
                                    ? "border-[#5ce1b8] bg-[#5ce1b8] text-[#142026] font-semibold"
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
                  <div
                    className={cn("flex items-center justify-between border-b pb-3.5", borderClass)}
                  >
                    <div className="flex items-center gap-2">
                      <ListMusic size={16} className="text-[#5ce1b8]" />
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
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-medium",
                          secondaryBtn,
                        )}
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
                      <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#5ce1b8]">
                        <Volume2 size={13} /> Manual Full-Song Audio Source
                      </span>
                      <div className="flex items-center gap-1.5">
                        {parsedDirectAudioPreview && !isSpotifyLinkWarning && (
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 font-mono text-[10px] font-semibold",
                              isItunesPreviewUrl(trackAudioUrl)
                                ? "bg-[#f5c43d]/15 text-[#f5c43d]"
                                : "bg-[#5ce1b8]/15 text-[#5ce1b8]",
                            )}
                          >
                            {isItunesPreviewUrl(trackAudioUrl)
                              ? "⚠ 30s iTunes Preview"
                              : "⚡ 0ms Full Audio Ready"}
                          </span>
                        )}
                        {parsedYoutubeIdPreview && (
                          <span className="rounded bg-[#e04f67]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#e04f67]">
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
                          ? "border-[#5ce1b8] bg-[#5ce1b8]/15 text-[#5ce1b8]"
                          : "border-[#5ce1b8]/40 bg-[#5ce1b8]/10 text-[#5ce1b8] hover:bg-[#5ce1b8]/20",
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
                          className="accent-[#5ce1b8]"
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
                          <div
                            className={cn(
                              "h-12 w-12 shrink-0 overflow-hidden rounded-lg border",
                              borderClass,
                            )}
                          >
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
                            <p className="mt-0.5 truncate text-xs text-[#5ce1b8]">{m.position}</p>
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
                  <div
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-4 border-b pb-4",
                      borderClass,
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={cn(
                          "h-14 w-14 shrink-0 overflow-hidden rounded-xl border",
                          borderClass,
                        )}
                      >
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
                          <span className="rounded bg-[#c9c4f6]/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#c9c4f6]">
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
                                  ? "border-[#5ce1b8] bg-[#5ce1b8] text-[#142026] font-semibold"
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
                  <div
                    className={cn("flex items-center justify-between border-b pb-3.5", borderClass)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-[#5ce1b8]" />
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
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-medium",
                          secondaryBtn,
                        )}
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
          {/* TAB 5: HOME HERO PHOTOS (Swipeable 5s Auto-Rotating Banner)       */}
          {/* ================================================================= */}
          {tab === "hero" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left 7 Cols: Active Home Screen Hero Carousel Slides */}
              <div className="lg:col-span-7">
                <div className={cn("overflow-hidden rounded-xl border", panelBg)}>
                  <div
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5",
                      borderClass,
                    )}
                  >
                    <div>
                      <h2 className={cn("text-sm font-semibold", headingText)}>
                        Active Home Screen Hero Slides ({heroImagesList.length})
                      </h2>
                      <p className={cn("text-xs", subText)}>
                        These IVE photos rotate automatically every 5 seconds and can be swiped left
                        or right on the Home screen.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetDefaultHeroPhotos}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        secondaryBtn,
                      )}
                    >
                      Restore Default Slides
                    </button>
                  </div>

                  <div className={cn("divide-y", dividerClass)}>
                    {heroImagesList.map((imgUrl, idx) => (
                      <div
                        key={`${imgUrl}-${idx}`}
                        className={cn(
                          "flex items-center justify-between gap-4 px-5 py-3.5 transition-colors",
                          rowHover,
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div
                            className={cn(
                              "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border",
                              borderClass,
                            )}
                          >
                            <img
                              src={imgUrl}
                              alt={`Home hero slide ${idx + 1}`}
                              className="h-full w-full object-cover object-center"
                            />
                            <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#5ce1b8]">
                              0{idx + 1}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={cn("text-sm font-semibold", headingText)}>
                                Hero Banner Slide #{idx + 1}
                              </p>
                              {idx === 0 && (
                                <span className="rounded bg-[#5ce1b8]/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#5ce1b8]">
                                  Lead Slide
                                </span>
                              )}
                            </div>
                            <p className={cn("mt-1 truncate font-mono text-[11px]", subText)}>
                              {imgUrl}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetWelcomePhotoUrl(imgUrl)}
                            title="Use this photo on the Welcome Tour (Slide 1)"
                            className={cn(
                              "inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-colors",
                              activeWelcomePhoto === imgUrl
                                ? "border-[#5ce1b8] bg-[#5ce1b8]/15 text-[#5ce1b8]"
                                : secondaryBtn,
                            )}
                          >
                            <Sparkles size={11} />
                            {activeWelcomePhoto === imgUrl ? "Welcome Pic" : "Set Welcome"}
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveHeroPhoto(idx, -1)}
                            title="Move slide earlier"
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-35",
                              secondaryBtn,
                            )}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === heroImagesList.length - 1}
                            onClick={() => handleMoveHeroPhoto(idx, 1)}
                            title="Move slide later"
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-35",
                              secondaryBtn,
                            )}
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveHeroPhoto(idx)}
                            title="Remove slide"
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-[#e04f67] hover:bg-[#e04f67]/15 hover:text-[#e04f67]",
                              secondaryBtn,
                            )}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Add / Upload New IVE Home Hero Photo + Welcome Tour Cover Photo */}
              <div className="space-y-5 lg:col-span-5">
                <form
                  onSubmit={handleAddHeroPhotoUrl}
                  className={cn("space-y-4 rounded-xl border p-5", panelBg)}
                >
                  <div className={cn("flex items-center gap-2 border-b pb-3.5", borderClass)}>
                    <ImageIcon size={16} className="text-[#5ce1b8]" />
                    <div>
                      <h3 className={cn("text-sm font-semibold", headingText)}>
                        Add IVE Photo to Home Screen Carousel
                      </h3>
                      <p className={cn("font-mono text-[10px]", subText)}>
                        Upload from computer or paste any direct image URL
                      </p>
                    </div>
                  </div>

                  {/* Method 1: Upload Photo File from Computer */}
                  <div className={cn("space-y-2.5 rounded-xl border p-3.5", subPanelBg)}>
                    <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#5ce1b8]">
                      Method 1: Upload Image File from Computer
                    </span>
                    <label
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                        uploadingHero
                          ? "border-[#5ce1b8] bg-[#5ce1b8]/15 text-[#5ce1b8]"
                          : "border-[#5ce1b8]/45 bg-[#5ce1b8]/10 text-[#5ce1b8] hover:bg-[#5ce1b8]/20",
                      )}
                    >
                      <Upload size={14} />
                      <span>
                        {uploadingHero
                          ? `Uploading Photo to Firebase Storage (${heroUploadProgress}%)...`
                          : "Upload .JPG / .PNG / .WEBP Photo from Computer"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingHero}
                        onChange={(e) => void handleHeroFileUpload(e)}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {/* Method 2: Paste Direct Image URL */}
                  <div>
                    <label className={labelClass}>
                      Method 2: Direct Image URL (.jpg, .png, .webp)
                    </label>
                    <input
                      type="url"
                      required
                      value={newHeroUrl}
                      onChange={(e) => setNewHeroUrl(e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>

                  {newHeroUrl.trim() && (
                    <div
                      className={cn("flex items-center gap-3 rounded-xl border p-2.5", subPanelBg)}
                    >
                      <div
                        className={cn(
                          "h-14 w-20 shrink-0 overflow-hidden rounded-lg border",
                          borderClass,
                        )}
                      >
                        <img
                          src={newHeroUrl}
                          alt="New hero preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] font-semibold uppercase text-[#5ce1b8]">
                          Slide Preview Ready
                        </p>
                        <p className={cn("truncate font-mono text-[10px]", subText)}>
                          {newHeroUrl}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all",
                      primaryBtn,
                    )}
                  >
                    <Plus size={14} />
                    Stage Photo to Home Carousel
                  </button>
                </form>

                {/* Welcome Tour Cover Photo (Slide 1) Inspector Box */}
                <div className={cn("space-y-4 rounded-xl border p-5", panelBg)}>
                  <div className={cn("flex items-center gap-2 border-b pb-3.5", borderClass)}>
                    <Sparkles size={16} className="text-[#c9c4f6]" />
                    <div>
                      <h3 className={cn("text-sm font-semibold", headingText)}>
                        Welcome Tour Cover Photo (Slide 1)
                      </h3>
                      <p className={cn("font-mono text-[10px]", subText)}>
                        Displayed inside the glowing frame on the &quot;Welcome to the Archive&quot;
                        page
                      </p>
                    </div>
                  </div>

                  {activeWelcomePhoto && (
                    <div
                      className={cn("flex items-center gap-3.5 rounded-xl border p-3", subPanelBg)}
                    >
                      <div
                        className={cn(
                          "h-16 w-16 shrink-0 overflow-hidden rounded-xl border",
                          borderClass,
                        )}
                      >
                        <img
                          src={activeWelcomePhoto}
                          alt="Welcome tour cover"
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="rounded bg-[#c9c4f6]/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#c9c4f6]">
                          Active Welcome Tour Photo
                        </span>
                        <p className={cn("mt-1 truncate font-mono text-[10px]", subText)}>
                          {activeWelcomePhoto}
                        </p>
                      </div>
                    </div>
                  )}

                  <label
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                      uploadingWelcomePhoto
                        ? "border-[#c9c4f6] bg-[#c9c4f6]/15 text-[#c9c4f6]"
                        : "border-[#c9c4f6]/45 bg-[#c9c4f6]/10 text-[#c9c4f6] hover:bg-[#c9c4f6]/20",
                    )}
                  >
                    <Upload size={14} />
                    <span>
                      {uploadingWelcomePhoto
                        ? "Uploading Welcome Photo..."
                        : "Upload Welcome Tour Photo from Computer"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingWelcomePhoto}
                      onChange={(e) => void handleWelcomePhotoFileUpload(e)}
                      className="sr-only"
                    />
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={welcomePhotoInput}
                      onChange={(e) => setWelcomePhotoInput(e.target.value)}
                      placeholder="Or paste direct image URL for Welcome Tour..."
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => handleSetWelcomePhotoUrl(welcomePhotoInput)}
                      className={cn(
                        "shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
                        primaryBtn,
                      )}
                    >
                      Stage
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 6: DATABASE & SEEDING OPERATIONS                              */}
          {/* ================================================================= */}
          {tab === "seed" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className={cn("rounded-xl border p-6", panelBg)}>
                  <div className="flex items-start gap-3.5">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#5ce1b8]/15 text-[#5ce1b8] ring-1 ring-[#5ce1b8]/30">
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
                        <code>news</code>, and <code>config/app</code>).
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
                      <p className={cn("font-mono text-[10px] uppercase", mutedMonoText)}>
                        Members
                      </p>
                      <p className={cn("mt-1 text-lg font-bold", headingText)}>{members.length}</p>
                    </div>
                    <div className={cn("rounded-lg border p-3", subPanelBg)}>
                      <p className={cn("font-mono text-[10px] uppercase", mutedMonoText)}>
                        News Items
                      </p>
                      <p className={cn("mt-1 text-lg font-bold", headingText)}>{news.length}</p>
                    </div>
                  </div>

                  <div className={cn("mt-6 border-t pt-5", borderClass)}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSeed()}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all disabled:opacity-50",
                        primaryBtn,
                      )}
                    >
                      <Sparkles size={14} />
                      {busy
                        ? "Seeding Firestore Collections..."
                        : "Seed Complete Archive to Firestore"}
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
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5ce1b8]" />
                      <span>
                        <strong>YouTube &amp; 0ms Direct Audio:</strong> Upload an <code>.mp3</code>{" "}
                        / <code>.m4a</code> file or paste a YouTube link into any song under{" "}
                        <em>Songs &amp; Audio</em> for real music playback synced with the glowing
                        progress bar.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e04f67]" />
                      <span>
                        <strong>Atomic Batch Push:</strong> Clicking <em>Push Live Changes</em>{" "}
                        commits all queued operations to Firestore in a single batch transaction.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c9c4f6]" />
                      <span>
                        <strong>Instant Mobile Sync:</strong> Connected Android devices receive the
                        updated song links, hero photos, and catalog changes immediately.
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
