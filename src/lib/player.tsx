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

interface PlayerContextValue {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // seconds
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
 * Simulated playback: no copyrighted audio is bundled. Progress is advanced by
 * a timer so all player interactions behave like a real audio engine.
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

  const currentTrack = currentId ? (getLiveTrack(currentId) ?? null) : null;

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
      setIsPlaying(true);
      remember(nextId);
    },
    [currentId, queue, shuffle, remember],
  );

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const toggle = useCallback(() => {
    setIsPlaying((p) => (currentId ? !p : p));
  }, [currentId]);

  const stopListening = useCallback(() => {
    setIsPlaying(false);
    setCurrentId(null);
    setProgress(0);
    setExpanded(false);
    historyRef.current = [];
    try {
      window.localStorage.removeItem(LAST_TRACK_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Advance the simulated playhead
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!isPlaying || !currentTrack) return;

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
  }, [isPlaying, currentTrack]);

  // Handle track ending cleanly in an effect
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    const duration = trackDuration(currentTrack);
    if (progress >= duration) {
      if (repeat === "one") {
        setProgress(0);
      } else if (settings.autoplay || repeat === "all") {
        next();
      } else {
        setIsPlaying(false);
      }
    }
  }, [progress, isPlaying, currentTrack, repeat, settings.autoplay, next]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      progress,
      queue,
      shuffle,
      repeat,
      expanded,
      playTrack,
      toggle,
      next,
      previous,
      seek: (s) => setProgress(s),
      toggleShuffle,
      cycleRepeat: () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
      stopListening,
      setExpanded,
    }),
    [
      currentTrack,
      isPlaying,
      progress,
      queue,
      shuffle,
      repeat,
      expanded,
      playTrack,
      toggle,
      next,
      previous,
      toggleShuffle,
      stopListening,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
