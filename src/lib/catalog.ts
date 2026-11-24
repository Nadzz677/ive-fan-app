import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import {
  albums as staticAlbums,
  featuredAlbumId as staticFeaturedAlbumId,
  featuredTrackId as staticFeaturedTrackId,
  tracks as staticTracks,
} from "@/data/albums";
import { members as staticMembers } from "@/data/members";
import { newsItems as staticNews } from "@/data/news";
import {
  getAlbumArtwork,
  getMemberImage,
  getNewsImage,
  getSongArtwork,
  songImageOverrides,
} from "@/data/imageAssets";
import type { Album, Member, NewsItem, Track } from "@/types";
import { db, isFirebaseConfigured } from "./firebase";

// Cache stays fresh indefinitely while real-time onSnapshot listeners keep it updated
const CATALOG_STALE_TIME = 5 * 60 * 1000;

const CACHE_KEYS = {
  albums: "ive-dive-archive:cache:v2:albums",
  tracks: "ive-dive-archive:cache:v2:tracks",
  members: "ive-dive-archive:cache:v2:members",
  news: "ive-dive-archive:cache:v2:news",
  config: "ive-dive-archive:cache:v2:config",
} as const;

export interface AppConfig {
  featuredAlbumId: string;
  featuredTrackId: string;
}

const DEFAULT_CONFIG: AppConfig = {
  featuredAlbumId: staticFeaturedAlbumId,
  featuredTrackId: staticFeaturedTrackId,
};

// ==========================================
// 0ms SYNCHRONOUS LOCALSTORAGE SNAPSHOT HYDRATION & IMAGE PREWARMING
// ==========================================

const prewarmedUrls = new Set<string>();

function prewarmImageUrls(urls: (string | undefined)[]) {
  if (typeof window === "undefined") return;
  for (const raw of urls) {
    const url = raw?.trim();
    if (!url || prewarmedUrls.has(url)) continue;
    prewarmedUrls.add(url);
    const img = new window.Image();
    img.decoding = "async";
    img.src = url;
  }
}

function readLocalCache<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    if (Array.isArray(fallback) && (!Array.isArray(parsed) || parsed.length === 0)) {
      return fallback;
    }
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocalCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore storage quota errors */
  }
}

// ==========================================
// DRAFT / STAGING STORE (Before "Push Live Changes")
// ==========================================

export interface StagedCatalogState {
  upsertedAlbums: Record<string, Album>;
  deletedAlbumIds: string[];
  upsertedTracks: Record<string, Track>;
  deletedTrackIds: string[];
  upsertedMembers: Record<string, Member>;
  upsertedNews: Record<string, NewsItem>;
  deletedNewsIds: string[];
  config: AppConfig | null;
}

export interface StagedChangeSummary {
  key: string;
  kind: "album" | "track" | "member" | "news" | "config";
  action: "save" | "delete";
  label: string;
  targetId: string;
}

const EMPTY_STAGE: StagedCatalogState = {
  upsertedAlbums: {},
  deletedAlbumIds: [],
  upsertedTracks: {},
  deletedTrackIds: [],
  upsertedMembers: {},
  upsertedNews: {},
  deletedNewsIds: [],
  config: null,
};

let stagedState: StagedCatalogState = EMPTY_STAGE;
const stageListeners = new Set<() => void>();

function emitStageChange() {
  stageListeners.forEach((l) => l());
}

export function useStagedCatalog() {
  const [state, setState] = useState<StagedCatalogState>(stagedState);

  useEffect(() => {
    const listener = () => setState({ ...stagedState });
    stageListeners.add(listener);
    return () => {
      stageListeners.delete(listener);
    };
  }, []);

  const changes = useMemo<StagedChangeSummary[]>(() => {
    const list: StagedChangeSummary[] = [];
    for (const album of Object.values(state.upsertedAlbums)) {
      list.push({
        key: `album-save-${album.id}`,
        kind: "album",
        action: "save",
        label: `Album: ${album.title}`,
        targetId: album.id,
      });
    }
    for (const id of state.deletedAlbumIds) {
      list.push({
        key: `album-del-${id}`,
        kind: "album",
        action: "delete",
        label: `Delete Album (${id})`,
        targetId: id,
      });
    }
    for (const track of Object.values(state.upsertedTracks)) {
      list.push({
        key: `track-save-${track.id}`,
        kind: "track",
        action: "save",
        label: `Song: ${track.title}`,
        targetId: track.id,
      });
    }
    for (const id of state.deletedTrackIds) {
      list.push({
        key: `track-del-${id}`,
        kind: "track",
        action: "delete",
        label: `Delete Song (${id})`,
        targetId: id,
      });
    }
    for (const member of Object.values(state.upsertedMembers)) {
      list.push({
        key: `member-save-${member.id}`,
        kind: "member",
        action: "save",
        label: `Member: ${member.name}`,
        targetId: member.id,
      });
    }
    for (const item of Object.values(state.upsertedNews)) {
      list.push({
        key: `news-save-${item.id}`,
        kind: "news",
        action: "save",
        label: `News: ${item.title}`,
        targetId: item.id,
      });
    }
    for (const id of state.deletedNewsIds) {
      list.push({
        key: `news-del-${id}`,
        kind: "news",
        action: "delete",
        label: `Delete News (${id})`,
        targetId: id,
      });
    }
    if (state.config) {
      list.push({
        key: "config-save",
        kind: "config",
        action: "save",
        label: `Featured Era: ${state.config.featuredAlbumId}`,
        targetId: "app",
      });
    }
    return list;
  }, [state]);

  return {
    staged: state,
    changes,
    pendingCount: changes.length,
  };
}

export function stageAlbumSave(album: Album) {
  stagedState = {
    ...stagedState,
    upsertedAlbums: { ...stagedState.upsertedAlbums, [album.id]: album },
    deletedAlbumIds: stagedState.deletedAlbumIds.filter((id) => id !== album.id),
  };
  prewarmImageUrls([album.cover]);
  emitStageChange();
}

export function stageAlbumDelete(albumId: string) {
  const nextUpserts = { ...stagedState.upsertedAlbums };
  delete nextUpserts[albumId];
  stagedState = {
    ...stagedState,
    upsertedAlbums: nextUpserts,
    deletedAlbumIds: stagedState.deletedAlbumIds.includes(albumId)
      ? stagedState.deletedAlbumIds
      : [...stagedState.deletedAlbumIds, albumId],
  };
  emitStageChange();
}

export function stageTrackSave(track: Track, parentAlbum?: Album) {
  const nextAlbums = { ...stagedState.upsertedAlbums };
  const baseAlbum = nextAlbums[track.albumId] ?? parentAlbum ?? getLiveAlbum(track.albumId);
  if (baseAlbum) {
    const currentIds = Array.isArray(baseAlbum.trackIds) ? baseAlbum.trackIds : [];
    const nextIds = currentIds.includes(track.id) ? currentIds : [...currentIds, track.id];
    nextAlbums[baseAlbum.id] = {
      ...baseAlbum,
      trackIds: nextIds,
      trackCount: Math.max(baseAlbum.trackCount ?? 0, nextIds.length),
    };
  }

  stagedState = {
    ...stagedState,
    upsertedAlbums: nextAlbums,
    upsertedTracks: { ...stagedState.upsertedTracks, [track.id]: track },
    deletedTrackIds: stagedState.deletedTrackIds.filter((id) => id !== track.id),
  };
  emitStageChange();
}

export function stageTrackDelete(track: Track, parentAlbum?: Album) {
  const nextTracks = { ...stagedState.upsertedTracks };
  delete nextTracks[track.id];

  const nextAlbums = { ...stagedState.upsertedAlbums };
  const baseAlbum = nextAlbums[track.albumId] ?? parentAlbum ?? getLiveAlbum(track.albumId);
  if (baseAlbum) {
    const nextIds = (baseAlbum.trackIds ?? []).filter((id) => id !== track.id);
    nextAlbums[baseAlbum.id] = {
      ...baseAlbum,
      trackIds: nextIds,
      trackCount: nextIds.length,
    };
  }

  stagedState = {
    ...stagedState,
    upsertedAlbums: nextAlbums,
    upsertedTracks: nextTracks,
    deletedTrackIds: stagedState.deletedTrackIds.includes(track.id)
      ? stagedState.deletedTrackIds
      : [...stagedState.deletedTrackIds, track.id],
  };
  emitStageChange();
}

export function stageMemberSave(member: Member) {
  stagedState = {
    ...stagedState,
    upsertedMembers: { ...stagedState.upsertedMembers, [member.id]: member },
  };
  prewarmImageUrls([member.image]);
  emitStageChange();
}

export function stageNewsSave(item: NewsItem) {
  stagedState = {
    ...stagedState,
    upsertedNews: { ...stagedState.upsertedNews, [item.id]: item },
    deletedNewsIds: stagedState.deletedNewsIds.filter((id) => id !== item.id),
  };
  prewarmImageUrls([item.image]);
  emitStageChange();
}

export function stageNewsDelete(newsId: string) {
  const nextNews = { ...stagedState.upsertedNews };
  delete nextNews[newsId];
  stagedState = {
    ...stagedState,
    upsertedNews: nextNews,
    deletedNewsIds: stagedState.deletedNewsIds.includes(newsId)
      ? stagedState.deletedNewsIds
      : [...stagedState.deletedNewsIds, newsId],
  };
  emitStageChange();
}

export function stageAppConfigSave(config: AppConfig) {
  stagedState = {
    ...stagedState,
    config,
  };
  emitStageChange();
}

export function discardStagedChange(summary: StagedChangeSummary) {
  if (summary.kind === "album") {
    const nextUpserts = { ...stagedState.upsertedAlbums };
    delete nextUpserts[summary.targetId];
    stagedState = {
      ...stagedState,
      upsertedAlbums: nextUpserts,
      deletedAlbumIds: stagedState.deletedAlbumIds.filter((id) => id !== summary.targetId),
    };
  } else if (summary.kind === "track") {
    const nextUpserts = { ...stagedState.upsertedTracks };
    delete nextUpserts[summary.targetId];
    stagedState = {
      ...stagedState,
      upsertedTracks: nextUpserts,
      deletedTrackIds: stagedState.deletedTrackIds.filter((id) => id !== summary.targetId),
    };
  } else if (summary.kind === "member") {
    const nextUpserts = { ...stagedState.upsertedMembers };
    delete nextUpserts[summary.targetId];
    stagedState = {
      ...stagedState,
      upsertedMembers: nextUpserts,
    };
  } else if (summary.kind === "news") {
    const nextUpserts = { ...stagedState.upsertedNews };
    delete nextUpserts[summary.targetId];
    stagedState = {
      ...stagedState,
      upsertedNews: nextUpserts,
      deletedNewsIds: stagedState.deletedNewsIds.filter((id) => id !== summary.targetId),
    };
  } else if (summary.kind === "config") {
    stagedState = {
      ...stagedState,
      config: null,
    };
  }
  emitStageChange();
}

export function clearAllStagedChanges() {
  stagedState = EMPTY_STAGE;
  emitStageChange();
}

/**
 * Commits all staged changes to Firestore in an atomic batch.
 */
export async function pushStagedChangesToFirestore(): Promise<number> {
  if (!db) throw new Error("Firebase is not configured.");

  const batch = writeBatch(db);
  let count = 0;

  for (const album of Object.values(stagedState.upsertedAlbums)) {
    batch.set(doc(db, "albums", album.id), stripUndefined(album), { merge: true });
    count++;
  }
  for (const albumId of stagedState.deletedAlbumIds) {
    batch.delete(doc(db, "albums", albumId));
    count++;
  }
  for (const track of Object.values(stagedState.upsertedTracks)) {
    const payload = stripUndefined(track);
    if (!track.audioUrl?.trim()) {
      payload["audioUrl"] = deleteField();
    }
    if (!track.youtubeUrl?.trim()) {
      payload["youtubeUrl"] = deleteField();
    }
    batch.set(doc(db, "tracks", track.id), payload, { merge: true });
    count++;
  }
  for (const trackId of stagedState.deletedTrackIds) {
    batch.delete(doc(db, "tracks", trackId));
    count++;
  }
  for (const member of Object.values(stagedState.upsertedMembers)) {
    batch.set(doc(db, "members", member.id), stripUndefined(member), { merge: true });
    count++;
  }
  for (const item of Object.values(stagedState.upsertedNews)) {
    batch.set(doc(db, "news", item.id), stripUndefined(item), { merge: true });
    count++;
  }
  for (const newsId of stagedState.deletedNewsIds) {
    batch.delete(doc(db, "news", newsId));
    count++;
  }
  if (stagedState.config) {
    batch.set(doc(db, "config", "app"), stripUndefined(stagedState.config), { merge: true });
    count++;
  }

  if (count > 0) {
    await batch.commit();
  }

  clearAllStagedChanges();
  return count;
}

// ==========================================
// LIVE MODULE CACHE, PARSERS & REAL-TIME LISTENERS
// ==========================================

// Hydrate module caches synchronously from localStorage at module load time (0ms!)
let liveAlbumsCache: Album[] = readLocalCache<Album[]>(CACHE_KEYS.albums, staticAlbums);
let liveTracksCache: Track[] = readLocalCache<Track[]>(CACHE_KEYS.tracks, staticTracks);
let liveMembersCache: Member[] = readLocalCache<Member[]>(CACHE_KEYS.members, staticMembers);
let liveNewsCache: NewsItem[] = readLocalCache<NewsItem[]>(CACHE_KEYS.news, staticNews);
let liveConfigCache: AppConfig = readLocalCache<AppConfig>(CACHE_KEYS.config, DEFAULT_CONFIG);

// Prewarm any cached database artwork URLs immediately on startup
if (typeof window !== "undefined") {
  prewarmImageUrls(liveAlbumsCache.map((a) => a.cover));
  prewarmImageUrls(liveMembersCache.map((m) => m.image));
  prewarmImageUrls(liveNewsCache.map((n) => n.image));
}

export function getLiveAlbum(id?: string): Album | undefined {
  if (!id) return undefined;
  if (stagedState.deletedAlbumIds.includes(id)) return undefined;
  const staged = stagedState.upsertedAlbums[id];
  const album =
    staged ?? liveAlbumsCache.find((a) => a.id === id) ?? staticAlbums.find((a) => a.id === id);
  if (!album) return undefined;
  return {
    ...album,
    cover: album.cover?.trim() || getAlbumArtwork(album.id),
  };
}

export function getLiveTrack(id?: string): Track | undefined {
  if (!id) return undefined;
  if (stagedState.deletedTrackIds.includes(id)) return undefined;
  return (
    stagedState.upsertedTracks[id] ??
    liveTracksCache.find((t) => t.id === id) ??
    staticTracks.find((t) => t.id === id)
  );
}

/**
 * Resolves song artwork prioritizing:
 * 1. Explicit song-specific override in `songImageOverrides`
 * 2. Live/Firestore parent album cover (so database covers like Looks Can Kill appear immediately)
 * 3. Static fallback from `getSongArtwork`
 */
export function getLiveTrackArtwork(
  track?: Track | { id?: string; albumId?: string } | null,
): string {
  if (!track) return "";
  const explicitSongOverride = track.id ? songImageOverrides[track.id]?.trim() : undefined;
  if (explicitSongOverride) return explicitSongOverride;
  if (track.albumId) {
    const liveCover = getLiveAlbum(track.albumId)?.cover?.trim();
    if (liveCover) return liveCover;
  }
  return getSongArtwork(track);
}

function stripUndefined<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

function parseAlbumsSnapshot(snap: QuerySnapshot<DocumentData>): Album[] {
  if (snap.empty) return staticAlbums;

  // Start with staticAlbums map so any unseeded static albums are never lost,
  // then overlay all Firestore documents on top.
  const map = new Map<string, Album>();
  for (const sa of staticAlbums) {
    map.set(sa.id, {
      ...sa,
      cover: sa.cover?.trim() || getAlbumArtwork(sa.id),
    });
  }

  for (const d of snap.docs) {
    const data = d.data() as Album;
    const id = data.id || d.id;
    map.set(id, {
      ...data,
      id,
      trackIds: Array.isArray(data.trackIds) ? data.trackIds : [],
      trackCount:
        typeof data.trackCount === "number" ? data.trackCount : (data.trackIds?.length ?? 0),
      cover: data.cover?.trim() || getAlbumArtwork(id),
    });
  }

  const sorted = Array.from(map.values()).sort(
    (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
  );
  liveAlbumsCache = sorted;
  writeLocalCache(CACHE_KEYS.albums, sorted);
  prewarmImageUrls(sorted.map((a) => a.cover));
  return sorted;
}

function parseTracksSnapshot(snap: QuerySnapshot<DocumentData>): Track[] {
  if (snap.empty) return staticTracks;

  const map = new Map<string, Track>();
  for (const st of staticTracks) {
    map.set(st.id, st);
  }

  for (const d of snap.docs) {
    const data = d.data() as Track;
    const id = data.id || d.id;
    map.set(id, {
      ...data,
      id,
      releaseIds: Array.isArray(data.releaseIds) ? data.releaseIds : [data.albumId],
    });
  }

  const list = Array.from(map.values());
  liveTracksCache = list;
  writeLocalCache(CACHE_KEYS.tracks, list);
  return list;
}

function parseMembersSnapshot(snap: QuerySnapshot<DocumentData>): Member[] {
  if (snap.empty) return staticMembers;

  const map = new Map<string, Member>();
  for (const d of snap.docs) {
    const data = d.data() as Member;
    const id = data.id || d.id;
    map.set(id, {
      ...data,
      id,
      image: data.image?.trim() || getMemberImage(id),
    });
  }

  const ordered: Member[] = staticMembers.map((m) => map.get(m.id) ?? m);
  for (const [id, m] of map.entries()) {
    if (!ordered.some((o) => o.id === id)) ordered.push(m);
  }

  liveMembersCache = ordered;
  writeLocalCache(CACHE_KEYS.members, ordered);
  prewarmImageUrls(ordered.map((m) => m.image));
  return ordered;
}

function parseNewsSnapshot(snap: QuerySnapshot<DocumentData>): NewsItem[] {
  if (snap.empty) return staticNews;

  const list: NewsItem[] = snap.docs.map((d) => {
    const data = d.data() as NewsItem;
    const id = data.id || d.id;
    const resolvedImage = data.image?.trim() || getNewsImage(id);
    return {
      ...data,
      id,
      ...(resolvedImage ? { image: resolvedImage } : {}),
    };
  });

  const sorted = list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  liveNewsCache = sorted;
  writeLocalCache(CACHE_KEYS.news, sorted);
  prewarmImageUrls(sorted.map((n) => n.image));
  return sorted;
}

async function fetchAlbumsFromFirestore(): Promise<Album[]> {
  if (!db) return liveAlbumsCache;
  const snap = await getDocs(collection(db, "albums"));
  return parseAlbumsSnapshot(snap);
}

async function fetchTracksFromFirestore(): Promise<Track[]> {
  if (!db) return liveTracksCache;
  const snap = await getDocs(collection(db, "tracks"));
  return parseTracksSnapshot(snap);
}

async function fetchMembersFromFirestore(): Promise<Member[]> {
  if (!db) return liveMembersCache;
  const snap = await getDocs(collection(db, "members"));
  return parseMembersSnapshot(snap);
}

async function fetchNewsFromFirestore(): Promise<NewsItem[]> {
  if (!db) return liveNewsCache;
  const snap = await getDocs(collection(db, "news"));
  return parseNewsSnapshot(snap);
}

async function fetchAppConfigFromFirestore(): Promise<AppConfig> {
  if (!db) return liveConfigCache;
  const snap = await getDoc(doc(db, "config", "app"));
  if (!snap.exists()) return liveConfigCache;
  const data = snap.data() as Partial<AppConfig>;
  const nextConfig: AppConfig = {
    featuredAlbumId: data.featuredAlbumId?.trim() || DEFAULT_CONFIG.featuredAlbumId,
    featuredTrackId: data.featuredTrackId?.trim() || DEFAULT_CONFIG.featuredTrackId,
  };
  liveConfigCache = nextConfig;
  writeLocalCache(CACHE_KEYS.config, nextConfig);
  return nextConfig;
}

// ==========================================
// REAL-TIME FIRESTORE WEBSOCKET SUBSCRIPTION (`onSnapshot`)
// ==========================================

let realtimeAttached = false;

function ensureRealtimeCatalogSync(queryClient: QueryClient) {
  if (realtimeAttached || !db || typeof window === "undefined") return;
  realtimeAttached = true;

  try {
    onSnapshot(
      collection(db, "albums"),
      (snap) => {
        if (!snap.empty) {
          const parsed = parseAlbumsSnapshot(snap);
          queryClient.setQueryData(["catalog", "albums"], parsed);
        }
      },
      () => {
        /* ignore permission/offline listener errors */
      },
    );

    onSnapshot(
      collection(db, "tracks"),
      (snap) => {
        if (!snap.empty) {
          const parsed = parseTracksSnapshot(snap);
          queryClient.setQueryData(["catalog", "tracks"], parsed);
        }
      },
      () => {},
    );

    onSnapshot(
      collection(db, "members"),
      (snap) => {
        if (!snap.empty) {
          const parsed = parseMembersSnapshot(snap);
          queryClient.setQueryData(["catalog", "members"], parsed);
        }
      },
      () => {},
    );

    onSnapshot(
      collection(db, "news"),
      (snap) => {
        if (!snap.empty) {
          const parsed = parseNewsSnapshot(snap);
          queryClient.setQueryData(["catalog", "news"], parsed);
        }
      },
      () => {},
    );

    onSnapshot(
      doc(db, "config", "app"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<AppConfig>;
          const nextConfig: AppConfig = {
            featuredAlbumId: data.featuredAlbumId?.trim() || DEFAULT_CONFIG.featuredAlbumId,
            featuredTrackId: data.featuredTrackId?.trim() || DEFAULT_CONFIG.featuredTrackId,
          };
          liveConfigCache = nextConfig;
          writeLocalCache(CACHE_KEYS.config, nextConfig);
          queryClient.setQueryData(["catalog", "config"], nextConfig);
        }
      },
      () => {},
    );
  } catch {
    realtimeAttached = false;
  }
}

export function useAlbums() {
  const queryClient = useQueryClient();
  useEffect(() => {
    ensureRealtimeCatalogSync(queryClient);
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["catalog", "albums"],
    queryFn: fetchAlbumsFromFirestore,
    initialData: () => liveAlbumsCache,
    enabled: isFirebaseConfigured && typeof window !== "undefined",
    staleTime: CATALOG_STALE_TIME,
  });
  const { staged } = useStagedCatalog();

  const merged = useMemo(() => {
    const map = new Map<string, Album>();
    for (const a of query.data) {
      if (!staged.deletedAlbumIds.includes(a.id)) {
        map.set(a.id, a);
      }
    }
    for (const a of Object.values(staged.upsertedAlbums)) {
      map.set(a.id, {
        ...a,
        cover: a.cover?.trim() || getAlbumArtwork(a.id),
      });
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
    );
  }, [query.data, staged.deletedAlbumIds, staged.upsertedAlbums]);

  return { ...query, data: merged };
}

export function useTracks() {
  const queryClient = useQueryClient();
  useEffect(() => {
    ensureRealtimeCatalogSync(queryClient);
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["catalog", "tracks"],
    queryFn: fetchTracksFromFirestore,
    initialData: () => liveTracksCache,
    enabled: isFirebaseConfigured && typeof window !== "undefined",
    staleTime: CATALOG_STALE_TIME,
  });
  const { staged } = useStagedCatalog();

  const merged = useMemo(() => {
    const map = new Map<string, Track>();
    for (const t of query.data) {
      if (!staged.deletedTrackIds.includes(t.id)) {
        map.set(t.id, t);
      }
    }
    for (const t of Object.values(staged.upsertedTracks)) {
      map.set(t.id, t);
    }
    return Array.from(map.values());
  }, [query.data, staged.deletedTrackIds, staged.upsertedTracks]);

  return { ...query, data: merged };
}

export function useMembers() {
  const queryClient = useQueryClient();
  useEffect(() => {
    ensureRealtimeCatalogSync(queryClient);
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["catalog", "members"],
    queryFn: fetchMembersFromFirestore,
    initialData: () => liveMembersCache,
    enabled: isFirebaseConfigured && typeof window !== "undefined",
    staleTime: CATALOG_STALE_TIME,
  });
  const { staged } = useStagedCatalog();

  const merged = useMemo(() => {
    return query.data.map((m) => {
      const stagedMember = staged.upsertedMembers[m.id];
      const target = stagedMember ?? m;
      return {
        ...target,
        image: target.image?.trim() || getMemberImage(target.id),
      };
    });
  }, [query.data, staged.upsertedMembers]);

  return { ...query, data: merged };
}

export function useNews() {
  const queryClient = useQueryClient();
  useEffect(() => {
    ensureRealtimeCatalogSync(queryClient);
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["catalog", "news"],
    queryFn: fetchNewsFromFirestore,
    initialData: () => liveNewsCache,
    enabled: isFirebaseConfigured && typeof window !== "undefined",
    staleTime: CATALOG_STALE_TIME,
  });
  const { staged } = useStagedCatalog();

  const merged = useMemo(() => {
    const map = new Map<string, NewsItem>();
    for (const n of query.data) {
      if (!staged.deletedNewsIds.includes(n.id)) {
        map.set(n.id, n);
      }
    }
    for (const n of Object.values(staged.upsertedNews)) {
      const resolvedImage = n.image?.trim() || getNewsImage(n.id);
      map.set(n.id, {
        ...n,
        ...(resolvedImage ? { image: resolvedImage } : {}),
      });
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [query.data, staged.deletedNewsIds, staged.upsertedNews]);

  return { ...query, data: merged };
}

export function useAppConfig() {
  const queryClient = useQueryClient();
  useEffect(() => {
    ensureRealtimeCatalogSync(queryClient);
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["catalog", "config"],
    queryFn: fetchAppConfigFromFirestore,
    initialData: () => liveConfigCache,
    enabled: isFirebaseConfigured && typeof window !== "undefined",
    staleTime: CATALOG_STALE_TIME,
  });
  const { staged } = useStagedCatalog();

  return {
    ...query,
    data: staged.config ?? query.data,
  };
}

/**
 * Unified live catalog hook backed by Firestore + 0ms LocalStorage Snapshot + Staged Admin Drafts.
 */
export function useCatalog() {
  const { data: albums } = useAlbums();
  const { data: tracks } = useTracks();
  const { data: members } = useMembers();
  const { data: news } = useNews();
  const { data: config } = useAppConfig();

  const getAlbum = useCallback(
    (id?: string): Album | undefined => {
      if (!id) return undefined;
      const found = albums.find((a) => a.id === id);
      if (!found) return undefined;
      return {
        ...found,
        cover: found.cover?.trim() || getAlbumArtwork(found.id),
      };
    },
    [albums],
  );

  const getTrack = useCallback(
    (id?: string): Track | undefined => {
      if (!id) return undefined;
      return tracks.find((t) => t.id === id);
    },
    [tracks],
  );

  const getMember = useCallback(
    (id?: string): Member | undefined => {
      if (!id) return undefined;
      return members.find((m) => m.id === id);
    },
    [members],
  );

  const getAlbumTracks = useCallback(
    (albumId: string): Track[] => {
      const album = getAlbum(albumId);
      if (!album) return [];
      const ordered = album.trackIds
        .map((tid) => tracks.find((t) => t.id === tid))
        .filter((t): t is Track => Boolean(t));
      const extras = tracks.filter(
        (t) => t.albumId === albumId && !ordered.some((o) => o.id === t.id),
      );
      return [...ordered, ...extras];
    },
    [getAlbum, tracks],
  );

  const getTrackArtwork = useCallback(
    (track?: Track | { id?: string; albumId?: string } | null): string => {
      if (!track) return "";
      const explicitSongOverride = track.id ? songImageOverrides[track.id]?.trim() : undefined;
      if (explicitSongOverride) return explicitSongOverride;
      if (track.albumId) {
        const liveCover = getAlbum(track.albumId)?.cover?.trim();
        if (liveCover) return liveCover;
      }
      return getSongArtwork(track);
    },
    [getAlbum],
  );

  return useMemo(
    () => ({
      albums,
      tracks,
      members,
      news,
      config,
      getAlbum,
      getTrack,
      getMember,
      getAlbumTracks,
      getTrackArtwork,
    }),
    [
      albums,
      tracks,
      members,
      news,
      config,
      getAlbum,
      getTrack,
      getMember,
      getAlbumTracks,
      getTrackArtwork,
    ],
  );
}

export interface SeedResult {
  albums: number;
  tracks: number;
  news: number;
  members: number;
}

/**
 * Seeds the verified local catalog (albums, tracks, news, members, and app config)
 * into Firestore. Uses `{ merge: true }` so any cover artwork URLs or YouTube links
 * you already added in Firestore are preserved and never wiped out!
 */
export async function seedFirestoreCatalog(): Promise<SeedResult> {
  if (!db) {
    throw new Error("Firebase is not configured. Add VITE_FIREBASE_* variables to .env first.");
  }

  const batch = writeBatch(db);

  for (const album of staticAlbums) {
    const existingLive = liveAlbumsCache.find((a) => a.id === album.id);
    const resolvedCover = existingLive?.cover?.trim() || getAlbumArtwork(album.id);
    batch.set(
      doc(db, "albums", album.id),
      stripUndefined({
        ...album,
        cover: resolvedCover,
      }),
      { merge: true },
    );
  }

  for (const track of staticTracks) {
    const existingLive = liveTracksCache.find((t) => t.id === track.id);
    batch.set(
      doc(db, "tracks", track.id),
      stripUndefined({
        ...track,
        ...(existingLive?.youtubeUrl ? { youtubeUrl: existingLive.youtubeUrl } : {}),
        ...(existingLive?.audioUrl ? { audioUrl: existingLive.audioUrl } : {}),
      }),
      { merge: true },
    );
  }

  for (const item of staticNews) {
    const existingLive = liveNewsCache.find((n) => n.id === item.id);
    const resolvedImage = existingLive?.image?.trim() || getNewsImage(item.id);
    batch.set(
      doc(db, "news", item.id),
      stripUndefined({
        ...item,
        ...(resolvedImage ? { image: resolvedImage } : {}),
      }),
      { merge: true },
    );
  }

  for (const member of staticMembers) {
    const existingLive = liveMembersCache.find((m) => m.id === member.id);
    const resolvedImage = existingLive?.image?.trim() || getMemberImage(member.id);
    batch.set(
      doc(db, "members", member.id),
      stripUndefined({
        ...member,
        image: resolvedImage,
      }),
      { merge: true },
    );
  }

  batch.set(doc(db, "config", "app"), DEFAULT_CONFIG, { merge: true });

  await batch.commit();

  return {
    albums: staticAlbums.length,
    tracks: staticTracks.length,
    news: staticNews.length,
    members: staticMembers.length,
  };
}
