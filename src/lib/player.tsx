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
import { getLiveTrack } from "./catalog";
import type { Track } from "@/types";
import { pushRecentlyPlayed } from "./recently-played";
import { useSettings } from "./settings";

export type RepeatMode = "off" | "all" | "one";

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
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  cueVideoById: (videoId: string, startSeconds?: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
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

interface PlayerContextValue {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // seconds
  effectiveDuration: number; // real duration when streaming, or static trackDuration fallback
  hasRealAudio: boolean;
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
  /** Ends the session: stops playback and clears the active track/compact player. */
  stopListening: () => void;
  setExpanded: (open: boolean) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const LAST_TRACK_KEY = "ive-dive-archive:last-track";
const SHUFFLE_KEY = "ive-dive-archive:shuffle";

/**
 * Hybrid Audio Engine:
 * 1. If the active track has a valid `youtubeUrl`, streams real audio via the YouTube IFrame JS API.
 * 2. Else if the active track has an `audioUrl`, streams via HTML5 <audio>.
 * 3. Otherwise (or if offline / error), falls back smoothly to the simulated timer engine.
 */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
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
  const [expanded, setExpanded] = useState(false);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const historyRef = useRef<string[]>([]);

  // Real audio refs
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const ytReadyRef = useRef(false);
  const loadedYtVideoIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs for latest state inside YouTube callbacks
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentTrack = currentId ? (getLiveTrack(currentId) ?? null) : null;
  const youtubeId = useMemo(
    () => extractYouTubeId(currentTrack?.youtubeUrl),
    [currentTrack?.youtubeUrl],
  );
  const directAudioUrl = currentTrack?.audioUrl?.trim() || null;

  const useYouTubeEngine = Boolean(youtubeId && !ytFailed);
  const useHtmlAudioEngine = Boolean(!useYouTubeEngine && directAudioUrl);
  const hasRealAudio = useYouTubeEngine || useHtmlAudioEngine;

  const fallbackDuration = currentTrack ? trackDuration(currentTrack) : 180;
  const effectiveDuration =
    hasRealAudio && realDuration && realDuration > 0 ? Math.round(realDuration) : fallbackDuration;

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

  const playTrack = useCallback(
    (trackId: string, nextQueue?: string[]) => {
      if (nextQueue?.length) setQueue(nextQueue);
      setCurrentId(trackId);
      setProgress(0);
      setRealDuration(null);
      setYtFailed(false);
      setIsPlaying(true);
      remember(trackId);
    },
    [remember],
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

      setCurrentId(nextId);
      setProgress(0);
      setRealDuration(null);
      setYtFailed(false);
      setIsPlaying(true);
      remember(nextId);
    },
    [currentId, queue, shuffle, remember],
  );

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const handleTrackFinish = useCallback(() => {
    if (repeat === "one") {
      setProgress(0);
      if (useYouTubeEngine && ytPlayerRef.current && ytReadyRef.current) {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
      } else if (useHtmlAudioEngine && audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play().catch(() => {});
      }
    } else if (settings.autoplay || repeat === "all") {
      next();
    } else {
      setIsPlaying(false);
    }
  }, [repeat, settings.autoplay, next, useYouTubeEngine, useHtmlAudioEngine]);

  const handleTrackFinishRef = useRef(handleTrackFinish);
  handleTrackFinishRef.current = handleTrackFinish;

  const toggle = useCallback(() => {
    setIsPlaying((p) => (currentId ? !p : p));
  }, [currentId]);

  const seek = useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(effectiveDuration, seconds));
      setProgress(clamped);

      if (useYouTubeEngine && ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.seekTo(clamped, true);
        } catch {
          /* ignore */
        }
      } else if (useHtmlAudioEngine && audioRef.current) {
        try {
          audioRef.current.currentTime = clamped;
        } catch {
          /* ignore */
        }
      }
    },
    [effectiveDuration, useYouTubeEngine, useHtmlAudioEngine],
  );

  const stopListening = useCallback(() => {
    setIsPlaying(false);
    setCurrentId(null);
    setProgress(0);
    setRealDuration(null);
    setExpanded(false);
    historyRef.current = [];
    if (ytPlayerRef.current && ytReadyRef.current) {
      try {
        ytPlayerRef.current.stopVideo();
      } catch {
        /* ignore */
      }
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    try {
      window.localStorage.removeItem(LAST_TRACK_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Reset per-track overrides when currentId changes
  useEffect(() => {
    setRealDuration(null);
    setYtFailed(false);
  }, [currentId, youtubeId]);

  // ---------------------------------------------------------------------------
  // ENGINE 1: YouTube IFrame JS API Controller
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!useYouTubeEngine || !youtubeId) {
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {
          /* ignore */
        }
      }
      return;
    }

    let cancelled = false;

    void ensureYouTubeIframeApi()
      .then((YT) => {
        if (cancelled) return;

        // If player already exists and is ready, load or cue the video
        if (ytPlayerRef.current && ytReadyRef.current) {
          if (loadedYtVideoIdRef.current !== youtubeId) {
            loadedYtVideoIdRef.current = youtubeId;
            if (isPlayingRef.current) {
              ytPlayerRef.current.loadVideoById(youtubeId, 0);
            } else {
              ytPlayerRef.current.cueVideoById(youtubeId, 0);
            }
          } else {
            if (isPlayingRef.current) {
              ytPlayerRef.current.playVideo();
            } else {
              ytPlayerRef.current.pauseVideo();
            }
          }
          return;
        }

        // Otherwise initialize the YouTube player instance inside ytHostRef
        if (!ytHostRef.current) return;
        ytHostRef.current.innerHTML = "";
        const mountTarget = document.createElement("div");
        ytHostRef.current.appendChild(mountTarget);

        loadedYtVideoIdRef.current = youtubeId;
        ytPlayerRef.current = new YT.Player(mountTarget, {
          height: "1",
          width: "1",
          videoId: youtubeId,
          playerVars: {
            autoplay: isPlayingRef.current ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              ytReadyRef.current = true;
              const dur = event.target.getDuration?.() ?? 0;
              if (dur > 0) setRealDuration(dur);
              if (isPlayingRef.current) {
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const dur = event.target.getDuration?.() ?? 0;
              if (dur > 0) setRealDuration(dur);
              // 0 === YT.PlayerState.ENDED
              if (event.data === 0) {
                handleTrackFinishRef.current();
              }
            },
            onError: () => {
              if (cancelled) return;
              // Gracefully fallback to simulated playback if video is restricted or offline
              setYtFailed(true);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setYtFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [useYouTubeEngine, youtubeId]);

  // Synchronize Play / Pause state with YouTube player
  useEffect(() => {
    if (!useYouTubeEngine || !ytPlayerRef.current || !ytReadyRef.current) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    } catch {
      /* ignore */
    }
  }, [isPlaying, useYouTubeEngine]);

  // Poll YouTube playhead progress while playing
  useEffect(() => {
    if (!useYouTubeEngine || !isPlaying) return;
    const poll = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || !ytReadyRef.current) return;
      try {
        const current = player.getCurrentTime?.();
        const dur = player.getDuration?.();
        if (typeof dur === "number" && dur > 0) {
          setRealDuration(dur);
        }
        if (typeof current === "number" && !Number.isNaN(current)) {
          setProgress(current);
        }
      } catch {
        /* ignore */
      }
    }, 250);

    return () => clearInterval(poll);
  }, [useYouTubeEngine, isPlaying]);

  // ---------------------------------------------------------------------------
  // ENGINE 2: Direct HTML5 <audio> Controller
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

  // ---------------------------------------------------------------------------
  // ENGINE 3: Simulated Timer Fallback (when no YouTube / Audio link is set)
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

  // Handle simulated track completion
  useEffect(() => {
    if (hasRealAudio || !isPlaying || !currentTrack) return;
    const duration = trackDuration(currentTrack);
    if (progress >= duration) {
      handleTrackFinish();
    }
  }, [hasRealAudio, progress, isPlaying, currentTrack, handleTrackFinish]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      progress,
      effectiveDuration,
      hasRealAudio,
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
      progress,
      effectiveDuration,
      hasRealAudio,
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
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Hidden host container for YouTube IFrame Audio Engine & HTML5 Audio fallback */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-10 -left-10 h-px w-px overflow-hidden opacity-0"
      >
        <div ref={ytHostRef} />
        <audio
          ref={audioRef}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (dur && Number.isFinite(dur)) setRealDuration(dur);
          }}
          onTimeUpdate={(e) => {
            if (useHtmlAudioEngine) {
              setProgress(e.currentTarget.currentTime);
            }
          }}
          onEnded={() => {
            if (useHtmlAudioEngine) {
              handleTrackFinish();
            }
          }}
        />
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
