import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { tracks as allTracks, trackDuration } from "@/data/albums";
import { getInstantAudioSrc, warmAudioCacheInBackground } from "./audio-sources";
import { getLiveAlbum, getLiveTrack, getLiveTrackArtwork, useCatalog } from "./catalog";
import type { Track } from "@/types";
import { pushRecentlyPlayed } from "./recently-played";
import { useSettings } from "./settings";

export type RepeatMode = "off" | "all" | "one";

/**
 * Normalizes any Direct Audio URL (Google Drive share links, Dropbox share links,
 * GitHub blob links, Archive.org, Cloudinary, Firebase Storage, or direct .mp3/.m4a/.ogg/.wav URLs)
 * into a direct streamable audio URL for instant HTML5 <audio> playback.
 */
export function resolveDirectAudioUrl(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Google Drive share URL -> direct download stream
  // e.g. https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const gdriveMatch =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ??
    trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (gdriveMatch?.[1]) {
    return `https://docs.google.com/uc?export=download&id=${gdriveMatch[1]}`;
  }

  // 2. Dropbox share URL -> direct stream (raw=1)
  if (trimmed.includes("dropbox.com/")) {
    return trimmed
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace(/[?&]dl=[01]/, "");
  }

  // 3. GitHub blob URL -> raw.githubusercontent.com
  if (trimmed.includes("github.com/") && trimmed.includes("/blob/")) {
    return trimmed
      .replace("github.com/", "raw.githubusercontent.com/")
      .replace("/blob/", "/");
  }

  return trimmed;
}

/**
 * Extracts an 11-character YouTube Video ID from any YouTube URL format:
 * - https://www.youtube.com/watch?v=XXXXXXXXXXX
 * - https://youtu.be/XXXXXXXXXXX
 * - https://music.youtube.com/watch?v=XXXXXXXXXXX
 * - https://www.youtube.com/embed/XXXXXXXXXXX
 * - https://www.youtube.com/shorts/XXXXXXXXXXX
 * - Raw 11-character video ID
 */
export function extractYouTubeId(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const vParam = url.searchParams.get("v");
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
      return vParam;
    }
    const segments = url.pathname.split("/").filter(Boolean);
    const candidate = segments[segments.length - 1];
    if (candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
      return candidate;
    }
  } catch {
    const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (match?.[1]) return match[1];
  }

  return null;
}

interface YTPlayerInstance {
  loadVideoById: (
    videoIdOrOptions: string | { videoId: string; startSeconds?: number },
    startSeconds?: number,
  ) => void;
  cueVideoById: (
    videoIdOrOptions: string | { videoId: string; startSeconds?: number },
    startSeconds?: number,
  ) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume?: (volume: number) => void;
  unMute?: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

interface YTGlobal {
  Player: new (
    elementIdOrNode: string | HTMLElement,
    options: {
      height?: string | number;
      width?: string | number;
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayerInstance }) => void;
        onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayerInstance;
  PlayerState?: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
    IveNativeAudio?: {
      updateMediaSession: (
        playing: boolean,
        title: string,
        artist: string,
        album: string,
        artworkUrl: string,
        positionSeconds: number,
        durationSeconds: number,
      ) => void;
      stopMediaSession: () => void;
    };
    __iveNativeMediaCommand?: (command: string, seekSeconds?: number) => void;
  }
}

let ytApiPromise: Promise<YTGlobal> | null = null;

function ensureYouTubeIframeApi(): Promise<YTGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SSR environment"));
  }
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<YTGlobal>((resolve, reject) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      }
    };

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!existingScript) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => {
        ytApiPromise = null;
        reject(new Error("Failed to load YouTube IFrame API"));
      };
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

if (typeof window !== "undefined") {
  void ensureYouTubeIframeApi().catch(() => {});
}

interface PlayerContextValue {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // seconds
  effectiveDuration: number;
  hasRealAudio: boolean;
  audioSourceKind: "direct" | "youtube" | "simulated";
  youtubeId: string | null;
  queue: string[];
  shuffle: boolean;
  repeat: RepeatMode;
  expanded: boolean;
  playTrack: (trackId: string, queue?: string[]) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  stopListening: () => void;
  setExpanded: (open: boolean) => void;
}

interface PlayerProgressValue {
  progress: number;
  effectiveDuration: number;
}

/**
 * Dedicated Context Architecture for 60fps Performance:
 * - `PlayerControlContext`: Never re-renders on 200ms progress ticks! Used by `SongCard` (87 cards)
 *   and `HomePage` so route transitions and scrolling stay 60fps.
 * - `PlayerProgressContext`: Subscribed only by `MusicPlayer` and `ExpandedPlayer`.
 */
const PlayerControlContext = createContext<Omit<PlayerContextValue, "progress"> | null>(null);
const PlayerProgressContext = createContext<PlayerProgressValue | null>(null);

const LAST_TRACK_KEY = "ive-dive-archive:last-track";
const SHUFFLE_KEY = "ive-dive-archive:shuffle";

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const { tracks: catalogTracks, config } = useCatalog();

  const [currentId, setCurrentId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LAST_TRACK_KEY);
      if (raw && getLiveTrack(raw)) return raw;
    } catch {
      /* storage unavailable */
    }
    return null;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [realDuration, setRealDuration] = useState<number | null>(null);
  const [ytFailed, setYtFailed] = useState(false);
  const [directAudioFailed, setDirectAudioFailed] = useState(false);
  const [queue, setQueue] = useState<string[]>(allTracks.map((t) => t.id));
  const [shuffle, setShuffle] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = window.localStorage.getItem(SHUFFLE_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [expanded, setExpandedState] = useState(false);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const historyRef = useRef<string[]>([]);

  // Real audio refs
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const ytReadyRef = useRef(false);
  const ytInitializingRef = useRef(false);
  const loadedYtVideoIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Guard timestamp whenever `expanded` toggles so opening/closing the full player NEVER stops audio
  const modalTransitionUntilRef = useRef<number>(0);

  // Seek Lock & Pending Start Timestamp Refs
  const seekTargetSecRef = useRef<number | null>(null);
  const seekLockUntilRef = useRef<number>(0);
  const pendingStartSecRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  progressRef.current = progress;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentTrack = useMemo(() => {
    if (!currentId) return null;
    return catalogTracks.find((t) => t.id === currentId) ?? getLiveTrack(currentId) ?? null;
  }, [currentId, catalogTracks]);

  const directAudioUrl = useMemo(
    () => getInstantAudioSrc(currentTrack?.audioUrl),
    [currentTrack?.audioUrl],
  );
  const youtubeId = useMemo(
    () => extractYouTubeId(currentTrack?.youtubeUrl),
    [currentTrack?.youtubeUrl],
  );
  const youtubeIdRef = useRef<string | null>(youtubeId);
  youtubeIdRef.current = youtubeId;

  // Priority 1: Direct Audio CDN URL (0ms native stream, zero YouTube iframe overhead!)
  // Priority 2: YouTube IFrame Audio Engine
  // Priority 3: Simulated Timer Engine
  const useHtmlAudioEngine = Boolean(directAudioUrl && !directAudioFailed);
  const useYouTubeEngine = Boolean(!useHtmlAudioEngine && youtubeId && !ytFailed);
  const hasRealAudio = useHtmlAudioEngine || useYouTubeEngine;
  const audioSourceKind: "direct" | "youtube" | "simulated" = useHtmlAudioEngine
    ? "direct"
    : useYouTubeEngine
      ? "youtube"
      : "simulated";

  const prewarmVideoId = useMemo(() => {
    if (youtubeId) return youtubeId;
    const featured = catalogTracks.find((t) => t.id === config.featuredTrackId);
    const featuredYt = extractYouTubeId(featured?.youtubeUrl);
    if (featuredYt) return featuredYt;
    for (const t of catalogTracks) {
      const id = extractYouTubeId(t.youtubeUrl);
      if (id) return id;
    }
    return null;
  }, [youtubeId, catalogTracks, config.featuredTrackId]);

  const fallbackDuration = currentTrack ? trackDuration(currentTrack) : 180;
  const effectiveDuration =
    hasRealAudio && realDuration && realDuration > 0 ? Math.round(realDuration) : fallbackDuration;

  const clearSeekLock = useCallback(() => {
    seekTargetSecRef.current = null;
    seekLockUntilRef.current = 0;
    pendingStartSecRef.current = 0;
  }, []);

  // Safe setExpanded that shields the audio engine during the 450ms open/close animation
  const setExpanded = useCallback(
    (open: boolean) => {
      modalTransitionUntilRef.current = Date.now() + 650;
      setExpandedState(open);

      // Proactively ensure playback continues across the modal transition
      if (isPlayingRef.current) {
        window.setTimeout(() => {
          if (!isPlayingRef.current) return;
          if (useHtmlAudioEngine && audioRef.current && audioRef.current.paused) {
            void audioRef.current.play().catch(() => {});
          } else if (useYouTubeEngine && ytPlayerRef.current && ytReadyRef.current) {
            try {
              const st = ytPlayerRef.current.getPlayerState?.();
              if (st !== 1 && st !== 3) {
                ytPlayerRef.current.playVideo();
              }
            } catch {
              /* ignore */
            }
          }
        }, 40);
      }
    },
    [useHtmlAudioEngine, useYouTubeEngine],
  );

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const nextVal = !prev;
      try {
        window.localStorage.setItem(SHUFFLE_KEY, String(nextVal));
      } catch {
        /* storage unavailable */
      }
      return nextVal;
    });
  }, []);

  const remember = useCallback(
    (trackId: string) => {
      if (settings.trackRecentlyPlayed) pushRecentlyPlayed(trackId);
      try {
        window.localStorage.setItem(LAST_TRACK_KEY, trackId);
      } catch {
        /* storage unavailable */
      }
    },
    [settings.trackRecentlyPlayed],
  );

  const commandYouTubeImmediate = useCallback((nextVideoId: string | null, startSec = 0) => {
    if (!nextVideoId || !ytPlayerRef.current || !ytReadyRef.current) return;
    try {
      ytPlayerRef.current.unMute?.();
      ytPlayerRef.current.setVolume?.(100);
      if (loadedYtVideoIdRef.current !== nextVideoId) {
        loadedYtVideoIdRef.current = nextVideoId;
        ytPlayerRef.current.loadVideoById({
          videoId: nextVideoId,
          startSeconds: startSec,
        });
      } else {
        if (startSec > 0) {
          ytPlayerRef.current.seekTo(startSec, true);
        }
        ytPlayerRef.current.playVideo();
      }
    } catch {
      /* handled by effect fallback */
    }
  }, []);

  const playTrack = useCallback(
    (trackId: string, nextQueue?: string[]) => {
      if (nextQueue?.length) setQueue(nextQueue);
      const targetTrack =
        catalogTracks.find((t) => t.id === trackId) ?? getLiveTrack(trackId) ?? null;
      const targetDirectAudio = getInstantAudioSrc(targetTrack?.audioUrl);
      const targetYtId = extractYouTubeId(targetTrack?.youtubeUrl);

      clearSeekLock();
      setCurrentId(trackId);
      setProgress(0);
      setRealDuration(null);
      setYtFailed(false);
      setDirectAudioFailed(false);
      setIsPlaying(true);
      remember(trackId);

      if (targetDirectAudio && audioRef.current) {
        try {
          if (ytPlayerRef.current && ytReadyRef.current) {
            ytPlayerRef.current.pauseVideo();
          }
          audioRef.current.src = targetDirectAudio;
          audioRef.current.currentTime = 0;
          void audioRef.current.play().catch(() => {});
        } catch {
          /* handled by effect */
        }
      } else if (targetYtId) {
        commandYouTubeImmediate(targetYtId, 0);
      }
    },
    [catalogTracks, clearSeekLock, commandYouTubeImmediate, remember],
  );

  const step = useCallback(
    (delta: number) => {
      if (!currentId) return;
      const idx = queue.indexOf(currentId);
      if (idx === -1) return;
      let nextId = currentId;

      if (shuffle && queue.length > 1) {
        if (delta > 0) {
          historyRef.current.push(currentId);
          if (historyRef.current.length > 50) historyRef.current.shift();
          const pool = queue.filter((id) => id !== currentId);
          nextId = pool[Math.floor(Math.random() * pool.length)] ?? currentId;
        } else {
          const prevFromHistory = historyRef.current.pop();
          if (prevFromHistory && queue.includes(prevFromHistory)) {
            nextId = prevFromHistory;
          } else {
            const pool = queue.filter((id) => id !== currentId);
            nextId = pool[Math.floor(Math.random() * pool.length)] ?? currentId;
          }
        }
      } else {
        const nextIdx = (idx + delta + queue.length) % queue.length;
        nextId = queue[nextIdx] ?? currentId;
      }

      const targetTrack =
        catalogTracks.find((t) => t.id === nextId) ?? getLiveTrack(nextId) ?? null;
      const targetDirectAudio = getInstantAudioSrc(targetTrack?.audioUrl);
      const targetYtId = extractYouTubeId(targetTrack?.youtubeUrl);

      clearSeekLock();
      setCurrentId(nextId);
      setProgress(0);
      setRealDuration(null);
      setYtFailed(false);
      setDirectAudioFailed(false);
      setIsPlaying(true);
      remember(nextId);

      if (targetDirectAudio && audioRef.current) {
        try {
          if (ytPlayerRef.current && ytReadyRef.current) {
            ytPlayerRef.current.pauseVideo();
          }
          audioRef.current.src = targetDirectAudio;
          audioRef.current.currentTime = 0;
          void audioRef.current.play().catch(() => {});
        } catch {
          /* handled by effect */
        }
      } else if (targetYtId) {
        commandYouTubeImmediate(targetYtId, 0);
      }
    },
    [catalogTracks, clearSeekLock, commandYouTubeImmediate, currentId, queue, shuffle, remember],
  );

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const handleTrackFinish = useCallback(() => {
    clearSeekLock();
    if (repeat === "one") {
      setProgress(0);
      if (useHtmlAudioEngine && audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play().catch(() => {});
      } else if (useYouTubeEngine && ytPlayerRef.current && ytReadyRef.current) {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
      }
      if (currentTrack && typeof window !== "undefined" && window.IveNativeAudio) {
        try {
          const albumTitle = getLiveAlbum(currentTrack.albumId)?.title ?? "IVE Archive";
          const artworkUrl = getLiveTrackArtwork(currentTrack) ?? "";
          window.IveNativeAudio.updateMediaSession(
            true,
            currentTrack.title,
            currentTrack.artist ?? "IVE",
            albumTitle,
            artworkUrl,
            0,
            effectiveDuration,
          );
        } catch {
          /* ignore */
        }
      }
    } else if (settings.autoplay || repeat === "all") {
      next();
    } else {
      setIsPlaying(false);
    }
  }, [
    clearSeekLock,
    repeat,
    settings.autoplay,
    next,
    useYouTubeEngine,
    useHtmlAudioEngine,
    currentTrack,
    effectiveDuration,
  ]);

  const handleTrackFinishRef = useRef(handleTrackFinish);
  handleTrackFinishRef.current = handleTrackFinish;

  const toggle = useCallback(() => {
    if (!currentId) return;
    setIsPlaying((prev) => {
      const nextPlaying = !prev;
      if (useHtmlAudioEngine && audioRef.current) {
        if (nextPlaying) {
          void audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
        }
      } else if (useYouTubeEngine && ytPlayerRef.current && ytReadyRef.current) {
        try {
          if (nextPlaying) {
            if (youtubeId && loadedYtVideoIdRef.current !== youtubeId) {
              loadedYtVideoIdRef.current = youtubeId;
              ytPlayerRef.current.loadVideoById({
                videoId: youtubeId,
                startSeconds: pendingStartSecRef.current || progressRef.current || 0,
              });
            } else {
              ytPlayerRef.current.playVideo();
            }
          } else {
            ytPlayerRef.current.pauseVideo();
          }
        } catch {
          /* ignore */
        }
      }
      return nextPlaying;
    });
  }, [currentId, useHtmlAudioEngine, useYouTubeEngine, youtubeId]);

  const seek = useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(effectiveDuration, seconds));
      setProgress(clamped);

      seekTargetSecRef.current = clamped;
      seekLockUntilRef.current = Date.now() + 2200;
      pendingStartSecRef.current = clamped;

      if (currentTrack && typeof window !== "undefined" && window.IveNativeAudio) {
        try {
          const albumTitle = getLiveAlbum(currentTrack.albumId)?.title ?? "IVE Archive";
          const artworkUrl = getLiveTrackArtwork(currentTrack) ?? "";
          window.IveNativeAudio.updateMediaSession(
            isPlayingRef.current,
            currentTrack.title,
            currentTrack.artist ?? "IVE",
            albumTitle,
            artworkUrl,
            clamped,
            effectiveDuration,
          );
        } catch {
          /* ignore */
        }
      }

      if (useHtmlAudioEngine && audioRef.current) {
        try {
          audioRef.current.currentTime = clamped;
          if (isPlayingRef.current && audioRef.current.paused) {
            void audioRef.current.play().catch(() => {});
          }
        } catch {
          /* ignore */
        }
      } else if (useYouTubeEngine && ytPlayerRef.current && ytReadyRef.current) {
        try {
          if (youtubeId && loadedYtVideoIdRef.current !== youtubeId) {
            loadedYtVideoIdRef.current = youtubeId;
            if (isPlayingRef.current) {
              ytPlayerRef.current.loadVideoById({
                videoId: youtubeId,
                startSeconds: clamped,
              });
            } else {
              ytPlayerRef.current.cueVideoById({
                videoId: youtubeId,
                startSeconds: clamped,
              });
            }
          } else {
            ytPlayerRef.current.seekTo(clamped, true);
            if (isPlayingRef.current) {
              ytPlayerRef.current.playVideo();
            }
          }
        } catch {
          /* ignore */
        }
      }
    },
    [effectiveDuration, useYouTubeEngine, useHtmlAudioEngine, youtubeId, currentTrack],
  );

  const stopListening = useCallback(() => {
    clearSeekLock();
    setIsPlaying(false);
    setCurrentId(null);
    setProgress(0);
    setRealDuration(null);
    setExpandedState(false);
    historyRef.current = [];
    if (ytPlayerRef.current && ytReadyRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {
        /* ignore */
      }
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    try {
      window.IveNativeAudio?.stopMediaSession();
    } catch {
      /* ignore */
    }
    try {
      window.localStorage.removeItem(LAST_TRACK_KEY);
    } catch {
      /* storage unavailable */
    }
  }, [clearSeekLock]);

  // ---------------------------------------------------------------------------
  // PRE-WARM YOUTUBE PLAYER INSTANCE ON MOUNT
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ytPlayerRef.current || ytInitializingRef.current) return;
    const initialVid = youtubeId || prewarmVideoId;
    if (!initialVid) return;

    let cancelled = false;
    ytInitializingRef.current = true;

    void ensureYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || ytPlayerRef.current || !ytHostRef.current) {
          ytInitializingRef.current = false;
          return;
        }

        ytHostRef.current.innerHTML = "";
        const mountTarget = document.createElement("div");
        ytHostRef.current.appendChild(mountTarget);

        const targetVid = youtubeIdRef.current || initialVid;
        loadedYtVideoIdRef.current = targetVid;

        ytPlayerRef.current = new YT.Player(mountTarget, {
          height: "200",
          width: "200",
          videoId: targetVid,
          playerVars: {
            autoplay: isPlayingRef.current ? 1 : 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              ytInitializingRef.current = false;
              ytReadyRef.current = true;
              event.target.unMute?.();
              event.target.setVolume?.(100);

              const activeVid = youtubeIdRef.current;
              const startSec = pendingStartSecRef.current || 0;

              if (activeVid && loadedYtVideoIdRef.current !== activeVid) {
                loadedYtVideoIdRef.current = activeVid;
                if (isPlayingRef.current) {
                  event.target.loadVideoById({ videoId: activeVid, startSeconds: startSec });
                } else {
                  event.target.cueVideoById({ videoId: activeVid, startSeconds: startSec });
                }
                return;
              }

              const dur = event.target.getDuration?.() ?? 0;
              if (dur > 0) setRealDuration(dur);

              if (isPlayingRef.current && activeVid) {
                if (startSec > 0) {
                  event.target.seekTo(startSec, true);
                }
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              const state = event.data;
              const dur = event.target.getDuration?.() ?? 0;
              if (dur > 0) setRealDuration(dur);

              // 1 === PLAYING
              if (state === 1) {
                if (pendingStartSecRef.current > 0) {
                  const targetSec = pendingStartSecRef.current;
                  pendingStartSecRef.current = 0;
                  const curr = event.target.getCurrentTime?.() ?? 0;
                  if (Math.abs(curr - targetSec) > 1.8) {
                    seekTargetSecRef.current = targetSec;
                    seekLockUntilRef.current = Date.now() + 1800;
                    event.target.seekTo(targetSec, true);
                  }
                }
              }

              // 2 === PAUSED: If the user intends to be playing (`isPlayingRef.current === true`),
              // immediately resume! This prevents any WebView modal transition pause.
              if (state === 2) {
                if (isPlayingRef.current && youtubeIdRef.current) {
                  window.setTimeout(() => {
                    if (isPlayingRef.current && ytPlayerRef.current && ytReadyRef.current) {
                      try {
                        ytPlayerRef.current.playVideo();
                      } catch {
                        /* ignore */
                      }
                    }
                  }, 40);
                }
              }

              // 5 === CUED
              if (state === 5 && isPlayingRef.current && youtubeIdRef.current) {
                const startSec = pendingStartSecRef.current || 0;
                if (startSec > 0) {
                  event.target.seekTo(startSec, true);
                }
                event.target.playVideo();
              }

              // 0 === ENDED
              if (state === 0) {
                handleTrackFinishRef.current();
              }
            },
            onError: () => {
              ytInitializingRef.current = false;
              setYtFailed(true);
            },
          },
        });
      })
      .catch(() => {
        ytInitializingRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [youtubeId, prewarmVideoId]);

  // Sync active YouTube video when track or play state changes
  useEffect(() => {
    if (!ytPlayerRef.current || !ytReadyRef.current) return;

    if (!useYouTubeEngine || !youtubeId) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      const startSec = pendingStartSecRef.current || 0;
      if (loadedYtVideoIdRef.current !== youtubeId) {
        loadedYtVideoIdRef.current = youtubeId;
        if (isPlaying) {
          ytPlayerRef.current.loadVideoById({
            videoId: youtubeId,
            startSeconds: startSec,
          });
        } else {
          ytPlayerRef.current.cueVideoById({
            videoId: youtubeId,
            startSeconds: startSec,
          });
        }
      } else {
        const playerState = ytPlayerRef.current.getPlayerState?.();
        if (isPlaying && playerState !== 1 && playerState !== 3) {
          ytPlayerRef.current.playVideo();
        } else if (!isPlaying && playerState === 1) {
          ytPlayerRef.current.pauseVideo();
        }
      }
    } catch {
      /* ignore */
    }
  }, [useYouTubeEngine, youtubeId, isPlaying]);

  // Poll YouTube playhead progress + Watchdog auto-resume while playing
  useEffect(() => {
    if (!useYouTubeEngine || !isPlaying) return;
    const poll = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || !ytReadyRef.current) return;
      try {
        const state = player.getPlayerState?.();
        const dur = player.getDuration?.();
        if (typeof dur === "number" && dur > 0) {
          setRealDuration(dur);
        }

        // Watchdog: if the iframe silently paused during a modal transition while isPlaying is true,
        // kick it back into playing immediately!
        if (isPlayingRef.current && (state === 2 || state === 5)) {
          player.playVideo();
        }

        const current = player.getCurrentTime?.();
        if (typeof current !== "number" || Number.isNaN(current)) return;

        // SEEK LOCK: While a seek is in flight, ignore stale getCurrentTime() readings
        if (seekTargetSecRef.current !== null) {
          const dist = Math.abs(current - seekTargetSecRef.current);
          if (dist <= 1.4 && state === 1) {
            seekTargetSecRef.current = null;
            seekLockUntilRef.current = 0;
            pendingStartSecRef.current = 0;
            setProgress(current);
          } else if (Date.now() > seekLockUntilRef.current && state === 1) {
            seekTargetSecRef.current = null;
            seekLockUntilRef.current = 0;
            pendingStartSecRef.current = 0;
            setProgress(current);
          }
          return;
        }

        if (state === 1 || current > 0) {
          setProgress(current);
        }
      } catch {
        /* ignore */
      }
    }, 220);

    return () => clearInterval(poll);
  }, [useYouTubeEngine, isPlaying]);

  // Sync rich Spotify-style MediaSession state (Title, Artist, Album, Cover Art, Scrubbing Position)
  // with native Android `AudioKeepAliveService` (promotes into Android Media Panel & Vivo Origin Island!)
  useEffect(() => {
    if (typeof window === "undefined" || !window.IveNativeAudio) return;
    try {
      if (!currentTrack) {
        window.IveNativeAudio.stopMediaSession();
        return;
      }
      const albumTitle = getLiveAlbum(currentTrack.albumId)?.title ?? "IVE Archive";
      const artworkUrl = getLiveTrackArtwork(currentTrack) ?? "";
      window.IveNativeAudio.updateMediaSession(
        isPlaying,
        currentTrack.title,
        currentTrack.artist ?? "IVE",
        albumTitle,
        artworkUrl,
        progressRef.current,
        effectiveDuration,
      );
    } catch {
      /* ignore on web browser */
    }
  }, [isPlaying, currentTrack, effectiveDuration]);

  // Receive hardware / lockscreen / Vivo Origin Island / notification media button commands from Android
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__iveNativeMediaCommand = (command: string, seekSeconds = 0) => {
      if (command === "play") {
        if (!isPlayingRef.current) toggle();
      } else if (command === "pause") {
        if (isPlayingRef.current) toggle();
      } else if (command === "toggle") {
        toggle();
      } else if (command === "next") {
        next();
      } else if (command === "prev") {
        previous();
      } else if (command === "seek" && typeof seekSeconds === "number") {
        seek(seekSeconds);
      }
    };
    return () => {
      delete window.__iveNativeMediaCommand;
    };
  }, [toggle, next, previous, seek]);

  // Prevent Chromium / YouTube IFrame inside Android WebView from detecting background visibility
  useEffect(() => {
    if (typeof document === "undefined") return;
    try {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
    } catch {
      /* ignore if browser locks property */
    }
    const blockVisibilityPause = (e: Event) => {
      if (isPlayingRef.current) {
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener("visibilitychange", blockVisibilityPause, true);
    return () => document.removeEventListener("visibilitychange", blockVisibilityPause, true);
  }, []);

  // Register MediaSession metadata & lockscreen/notification controls (web browsers only;
  // native Android uses AudioKeepAliveService's dedicated MediaSession to avoid dual-session collisions)
  useEffect(() => {
    if (typeof window !== "undefined" && window.IveNativeAudio) return;
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !currentTrack) return;
    try {
      const artworkUrl = getLiveTrackArtwork(currentTrack);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist ?? "IVE",
        album: currentTrack.albumId,
        ...(artworkUrl ? { artwork: [{ src: artworkUrl, sizes: "512x512", type: "image/png" }] } : {}),
      });
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
      navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler("pause", () => {
        // Ignore spurious OS/WebView mediaSession pause events during ExpandedPlayer open/close!
        if (Date.now() < modalTransitionUntilRef.current) return;
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => previous());
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
    } catch {
      /* ignore unsupported mediaSession actions */
    }
  }, [currentTrack, isPlaying, next, previous]);

  // ---------------------------------------------------------------------------
  // ENGINE 1: Direct HTML5 <audio> Controller (0ms Latency, Native Background Audio)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!useHtmlAudioEngine || !directAudioUrl) {
      audio.pause();
      return;
    }

    if (audio.src !== directAudioUrl) {
      audio.src = directAudioUrl;
      audio.load();
    }

    if (isPlaying) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [useHtmlAudioEngine, directAudioUrl, isPlaying]);

  // Preload & cache the current and next queued tracks in the background for 0ms Next-track skips!
  useEffect(() => {
    if (!currentId) return;
    const curr = catalogTracks.find((t) => t.id === currentId);
    if (curr?.audioUrl) {
      void warmAudioCacheInBackground(curr.audioUrl);
    }
    const idx = queue.indexOf(currentId);
    if (idx !== -1 && queue.length > 1) {
      const nextIdx = (idx + 1) % queue.length;
      const nextTrackId = queue[nextIdx];
      const nextTrack = catalogTracks.find((t) => t.id === nextTrackId);
      if (nextTrack?.audioUrl) {
        void warmAudioCacheInBackground(nextTrack.audioUrl);
      }
    }
  }, [currentId, queue, catalogTracks]);

  // ---------------------------------------------------------------------------
  // ENGINE 3: Simulated Timer Fallback
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (hasRealAudio || !isPlaying || !currentTrack) return;

    const duration = trackDuration(currentTrack);

    timer.current = setInterval(() => {
      setProgress((p) => {
        if (p + 1 >= duration) {
          return duration;
        }
        return p + 1;
      });
    }, 1000);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [hasRealAudio, isPlaying, currentTrack]);

  useEffect(() => {
    if (hasRealAudio || !isPlaying || !currentTrack) return;
    const duration = trackDuration(currentTrack);
    if (progress >= duration) {
      handleTrackFinish();
    }
  }, [hasRealAudio, progress, isPlaying, currentTrack, handleTrackFinish]);

  const controlValue = useMemo<Omit<PlayerContextValue, "progress">>(
    () => ({
      currentTrack,
      isPlaying,
      effectiveDuration,
      hasRealAudio,
      audioSourceKind,
      youtubeId,
      queue,
      shuffle,
      repeat,
      expanded,
      playTrack,
      toggle,
      next,
      previous,
      seek,
      toggleShuffle,
      cycleRepeat: () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
      stopListening,
      setExpanded,
    }),
    [
      currentTrack,
      isPlaying,
      effectiveDuration,
      hasRealAudio,
      audioSourceKind,
      youtubeId,
      queue,
      shuffle,
      repeat,
      expanded,
      playTrack,
      toggle,
      next,
      previous,
      seek,
      toggleShuffle,
      stopListening,
      setExpanded,
    ],
  );

  const progressValue = useMemo<PlayerProgressValue>(
    () => ({
      progress,
      effectiveDuration,
    }),
    [progress, effectiveDuration],
  );

  return (
    <PlayerControlContext.Provider value={controlValue}>
      <PlayerProgressContext.Provider value={progressValue}>
        {children}
        {/* Persistent offscreen media host */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -left-[9999px] top-0 h-[200px] w-[200px] overflow-hidden opacity-[0.01]"
        >
          <div ref={ytHostRef} />
          <audio
            ref={audioRef}
            preload="auto"
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration;
              if (dur && Number.isFinite(dur)) setRealDuration(dur);
            }}
            onTimeUpdate={(e) => {
              if (useHtmlAudioEngine) {
                if (seekTargetSecRef.current !== null && Date.now() < seekLockUntilRef.current) {
                  if (Math.abs(e.currentTarget.currentTime - seekTargetSecRef.current) <= 1.2) {
                    seekTargetSecRef.current = null;
                    seekLockUntilRef.current = 0;
                  } else {
                    return;
                  }
                }
                setProgress(e.currentTarget.currentTime);
              }
            }}
            onEnded={() => {
              if (useHtmlAudioEngine) {
                handleTrackFinish();
              }
            }}
            onError={() => {
              if (useHtmlAudioEngine) {
                setDirectAudioFailed(true);
              }
            }}
          />
        </div>
      </PlayerProgressContext.Provider>
    </PlayerControlContext.Provider>
  );
}

/**
 * Fast 60fps control hook: does NOT re-render when `progress` ticks every 200ms!
 * Use this in `SongCard`, `HomePage`, etc.
 */
export function usePlayerControls() {
  const ctx = useContext(PlayerControlContext);
  if (!ctx) throw new Error("usePlayerControls must be used inside PlayerProvider");
  return ctx;
}

/**
 * Full player hook (includes live `progress` ticks for `MusicPlayer` and `ExpandedPlayer`).
 */
export function usePlayer(): PlayerContextValue {
  const ctrl = useContext(PlayerControlContext);
  const prog = useContext(PlayerProgressContext);
  if (!ctrl || !prog) throw new Error("usePlayer must be used inside PlayerProvider");
  return {
    ...ctrl,
    progress: prog.progress,
    effectiveDuration: prog.effectiveDuration,
  };
}
