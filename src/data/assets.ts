/**
 * Centralized Asset Management (V5.1.1)
 * Re-exports from the single source of truth in `src/data/imageAssets.ts`.
 */

export * from "@/data/imageAssets";

import { getMemberImage, getAlbumArtwork } from "@/data/imageAssets";

export const MEMBER_ASSETS = {
  yujin: {
    id: "yujin",
    name: "An Yujin",
    koreanName: "안유진",
    get image() {
      return getMemberImage("yujin");
    },
  },
  gaeul: {
    id: "gaeul",
    name: "Gaeul",
    koreanName: "가을",
    get image() {
      return getMemberImage("gaeul");
    },
  },
  rei: {
    id: "rei",
    name: "Rei",
    koreanName: "레이",
    get image() {
      return getMemberImage("rei");
    },
  },
  wonyoung: {
    id: "wonyoung",
    name: "Jang Wonyoung",
    koreanName: "장원영",
    get image() {
      return getMemberImage("wonyoung");
    },
  },
  liz: {
    id: "liz",
    name: "Liz",
    koreanName: "리즈",
    get image() {
      return getMemberImage("liz");
    },
  },
  leeseo: {
    id: "leeseo",
    name: "Leeseo",
    koreanName: "이서",
    get image() {
      return getMemberImage("leeseo");
    },
  },
} as const;

export function getMemberAsset(memberId: string): string {
  return getMemberImage(memberId);
}

export function getAlbumCoverAsset(albumId: string): string {
  return getAlbumArtwork(albumId);
}
