export interface Member {
  id: string;
  name: string;
  koreanName: string;
  /** Legal/full name where publicly documented. */
  fullName?: string;
  nationality?: string;
  /** ISO date of birth where publicly documented. */
  birthday?: string;
  /** Short description of the member's role and development inside IVE. */
  journey?: string;
  /** Verifiable, publicly documented facts only — never invented details. */
  facts?: string[];
  position: string;
  birthYear: number;
  tagline: string;
  bio: string;
  color: string;
  image: string;
  /**
   * Curated release highlights for the member page. Optional and safe to edit —
   * when empty the page falls back to the latest IVE releases.
   */
  spotlightAlbumIds?: string[];
}

export type AlbumType =
  | "Single Album"
  | "Mini Album"
  | "Studio Album"
  | "Japanese EP"
  | "Japanese Single"
  | "Digital Single"
  | "Special Album";

export type TrackLanguage = "Korean" | "Japanese" | "English" | "Instrumental";

export interface Track {
  id: string;
  title: string;
  artist?: string;
  albumId: string;
  releaseIds: string[];
  duration?: number;
  isTitleTrack?: boolean;
  language?: TrackLanguage;
  version?: string;
  releaseType?: AlbumType;
  isJapaneseVersion?: boolean;
  isSolo?: boolean;
  member?: string;
  lyricsAvailable?: boolean;
  lyricsKorean?: string;
  lyricsRomanized?: string;
}

export interface Album {
  id: string;
  title: string;
  type: AlbumType;
  releaseDate: string; // ISO date
  cover: string;
  description: string;
  /** Track IDs listed in this release. */
  trackIds: string[];
  /** Official number of tracks on the release. */
  trackCount: number;
  language?: "Korean" | "Japanese" | "English" | "Multi";
}

export type FavoriteKind = "song" | "album" | "member";

export interface NewsItem {
  id: string;
  category: "Release" | "Tour & Live" | "Announcement" | "Performance" | "Official";
  title: string;
  date: string; // ISO date
  summary: string;
  details?: string[];
  image?: string;
  tag?: string;
  albumId?: string;
  memberId?: string;
}
