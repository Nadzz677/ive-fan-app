import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { FavoriteKind } from "@/types";
import { useAuth } from "./auth";
import { subscribeUserDoc, syncUserFields } from "./firestore-user";

type FavoritesState = Record<FavoriteKind, string[]>;

const STORAGE_KEY = "ive-dive-archive:favorites";
const EMPTY: FavoritesState = { song: [], album: [], member: [] };

interface FavoritesContextValue {
  favorites: FavoritesState;
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  toggleFavorite: (kind: FavoriteKind, id: string) => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readStorage(): FavoritesState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<FavoritesState>;
    return {
      song: parsed.song ?? [],
      album: parsed.album ?? [],
      member: parsed.member ?? [],
    };
  } catch {
    return EMPTY;
  }
}

function writeStorage(next: FavoritesState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { uid } = useAuth();
  const [favorites, setFavorites] = useState<FavoritesState>(readStorage);

  // Sync from Firestore when signed in (Anonymous or upgraded account)
  useEffect(() => {
    if (!uid) return;
    return subscribeUserDoc(uid, (data) => {
      if (!data.favorites) return;
      const remote: FavoritesState = {
        song: data.favorites.song ?? [],
        album: data.favorites.album ?? [],
        member: data.favorites.member ?? [],
      };
      setFavorites(remote);
      writeStorage(remote);
    });
  }, [uid]);

  const toggleFavorite = useCallback(
    (kind: FavoriteKind, id: string) => {
      setFavorites((prev) => {
        const list = prev[kind];
        const nextFavorites: FavoritesState = {
          ...prev,
          [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
        };
        writeStorage(nextFavorites);
        void syncUserFields(uid, { favorites: nextFavorites });
        return nextFavorites;
      });
    },
    [uid],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isFavorite: (kind, id) => favorites[kind].includes(id),
      toggleFavorite,
      count: favorites.song.length + favorites.album.length + favorites.member.length,
    }),
    [favorites, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside FavoritesProvider");
  return ctx;
}
