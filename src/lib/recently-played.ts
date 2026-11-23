import { useEffect, useState } from "react";
import {
  getActiveUserUid,
  onActiveUserUidChange,
  subscribeUserDoc,
  syncUserFields,
} from "./firestore-user";

/**
 * Lightweight recently-played store backed by localStorage and synced to
 * Firestore (`users/{uid}.recentlyPlayed`) when Firebase is configured.
 */
const STORAGE_KEY = "ive-dive-archive:recently-played";
export const MAX_RECENTLY_PLAYED = 15;

let ids: string[] = [];
let hydrated = false;
let firestoreUnsub: (() => void) | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persistLocal() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(parsed)) ids = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    ids = [];
  }

  onActiveUserUidChange((uid) => {
    if (firestoreUnsub) {
      firestoreUnsub();
      firestoreUnsub = null;
    }
    if (!uid) return;
    firestoreUnsub = subscribeUserDoc(uid, (data) => {
      if (!Array.isArray(data.recentlyPlayed)) return;
      ids = data.recentlyPlayed
        .filter((x): x is string => typeof x === "string")
        .slice(0, MAX_RECENTLY_PLAYED);
      persistLocal();
      emit();
    });
  });
}

export function pushRecentlyPlayed(trackId: string) {
  hydrate();
  ids = [trackId, ...ids.filter((id) => id !== trackId)].slice(0, MAX_RECENTLY_PLAYED);
  persistLocal();
  void syncUserFields(getActiveUserUid(), { recentlyPlayed: ids });
  emit();
}

export function clearRecentlyPlayed() {
  ids = [];
  persistLocal();
  void syncUserFields(getActiveUserUid(), { recentlyPlayed: [] });
  emit();
}

export function useRecentlyPlayed() {
  const [state, setState] = useState<string[]>(() => {
    hydrate();
    return ids;
  });

  useEffect(() => {
    hydrate();
    setState([...ids]);
    const listener = () => setState([...ids]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
