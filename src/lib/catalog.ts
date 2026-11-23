import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
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
} from "@/data/imageAssets";
import type { Album, Member, NewsItem, Track } from "@/types";
import { db, isFirebaseConfigured } from "./firebase";

const CATALOG_STALE_TIME = 30 * 1000;

export interface AppConfig {
  featuredAlbumId: string;
  featuredTrackId: string;
}

const DEFAULT_CONFIG: AppConfig = {
  featuredAlbumId: staticFeaturedAlbumId,
  featuredTrackId: staticFeaturedTrackId,
};

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
  emitStageChange();
}

export function stageNewsSave(item: NewsItem) {
  stagedState = {
    ...stagedState,
    upsertedNews: { ...stagedState.upsertedNews, [item.id]: item },
    deletedNewsIds: stagedState.deletedNewsIds.filter((id) => id !== item.id),
  };
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
    batch.set(doc(db, "tracks", track.id), stripUndefined(track), { merge: true });
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
// LIVE MODULE CACHE & FETCHERS
// ==========================================

let liveAlbumsCache: Album[] = staticAlbums;
let liveTracksCache: Track[] = staticTracks;
let liveMembersCache: Member[] = staticMembers;

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

export function getLiveTrackArtwork(
  track?: Track | { id?: string; albumId?: string } | null,
): string {
  if (!track) return "";
  const staticOrOverride = getSongArtwork(track);
  if (staticOrOverride) return staticOrOverride;
  if (track.albumId) {
    return getLiveAlbum(track.albumId)?.cover?.trim() || "";
  }
  return "";
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

async function fetchAlbumsFromFirestore(): Promise<Album[]> {
  if (!db) return staticAlbums;
  const snap = await getDocs(collection(db, "albums"));
  if (snap.empty) {
    liveAlbumsCache = staticAlbums;
    return staticAlbums;
  }

  const list: Album[] = snap.docs.map((d) => {
    const data = d.data() as Album;
    const id = data.id || d.id;
    return {
      ...data,
      id,
      trackIds: Array.isArray(data.trackIds) ? data.trackIds : [],
      trackCount:
        typeof data.trackCount === "number" ? data.trackCount : (data.trackIds?.length ?? 0),
      cover: data.cover?.trim() || getAlbumArtwork(id),
    };
  });

  const sorted = list.sort(
    (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
  );
  liveAlbumsCache = sorted;
  return sorted;
}

async function fetchTracksFromFirestore(): Promise<Track[]> {
  if (!db) return staticTracks;
  const snap = await getDocs(collection(db, "tracks"));
  if (snap.empty) {
    liveTracksCache = staticTracks;
    return staticTracks;
  }

  const list: Track[] = snap.docs.map((d) => {
    const data = d.data() as Track;
    return {
      ...data,
      id: data.id || d.id,
      releaseIds: Array.isArray(data.releaseIds) ? data.releaseIds : [data.albumId],
    };
  });

  liveTracksCache = list;
  return list;
}

async function fetchMembersFromFirestore(): Promise<Member[]> {
  if (!db) return staticMembers;
  const snap = await getDocs(collection(db, "members"));
  if (snap.empty) {
    liveMembersCache = staticMembers;
    return staticMembers;
  }

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

  // Keep canonical member ordering (Yujin -> Gaeul -> Rei -> Wonyoung -> Liz -> Leeseo) plus any new entries
  const ordered: Member[] = staticMembers.map((m) => map.get(m.id) ?? m);
  for (const [id, m] of map.entries()) {
    if (!ordered.some((o) => o.id === id)) ordered.push(m);
  }

  liveMembersCache = ordered;
  return ordered;
}

async function fetchNewsFromFirestore(): Promise<NewsItem[]> {
  if (!db) return staticNews;
  const snap = await getDocs(collection(db, "news"));
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

  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function fetchAppConfigFromFirestore(): Promise<AppConfig> {
  if (!db) return DEFAULT_CONFIG;
  const snap = await getDoc(doc(db, "config", "app"));
  if (!snap.exists()) return DEFAULT_CONFIG;
  const data = snap.data() as Partial<AppConfig>;
  return {
    featuredAlbumId: data.featuredAlbumId?.trim() || DEFAULT_CONFIG.featuredAlbumId,
    featuredTrackId: data.featuredTrackId?.trim() || DEFAULT_CONFIG.featuredTrackId,
  };
}

export function useAlbums() {
  const query = useQuery({
    queryKey: ["catalog", "albums"],
    queryFn: fetchAlbumsFromFirestore,
    initialData: staticAlbums,
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
  const query = useQuery({
    queryKey: ["catalog", "tracks"],
    queryFn: fetchTracksFromFirestore,
    initialData: staticTracks,
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
  const query = useQuery({
    queryKey: ["catalog", "members"],
    queryFn: fetchMembersFromFirestore,
    initialData: staticMembers,
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
  const query = useQuery({
    queryKey: ["catalog", "news"],
    queryFn: fetchNewsFromFirestore,
    initialData: staticNews,
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
  const query = useQuery({
    queryKey: ["catalog", "config"],
    queryFn: fetchAppConfigFromFirestore,
    initialData: DEFAULT_CONFIG,
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
 * Unified live catalog hook backed by Firestore + Staged Admin Drafts.
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
      const staticOrOverride = getSongArtwork(track);
      if (staticOrOverride) return staticOrOverride;
      if (track.albumId) {
        return getAlbum(track.albumId)?.cover?.trim() || "";
      }
      return "";
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
 * into Firestore. Requires Admin authentication per firestore.rules.
 */
export async function seedFirestoreCatalog(): Promise<SeedResult> {
  if (!db) {
    throw new Error("Firebase is not configured. Add VITE_FIREBASE_* variables to .env first.");
  }

  const batch = writeBatch(db);

  for (const album of staticAlbums) {
    batch.set(
      doc(db, "albums", album.id),
      stripUndefined({
        ...album,
        cover: getAlbumArtwork(album.id),
      }),
    );
  }

  for (const track of staticTracks) {
    batch.set(doc(db, "tracks", track.id), stripUndefined(track));
  }

  for (const item of staticNews) {
    const resolvedImage = getNewsImage(item.id);
    batch.set(
      doc(db, "news", item.id),
      stripUndefined({
        ...item,
        ...(resolvedImage ? { image: resolvedImage } : {}),
      }),
    );
  }

  for (const member of staticMembers) {
    batch.set(
      doc(db, "members", member.id),
      stripUndefined({
        ...member,
        image: getMemberImage(member.id),
      }),
    );
  }

  batch.set(doc(db, "config", "app"), DEFAULT_CONFIG);

  await batch.commit();

  return {
    albums: staticAlbums.length,
    tracks: staticTracks.length,
    news: staticNews.length,
    members: staticMembers.length,
  };
}
