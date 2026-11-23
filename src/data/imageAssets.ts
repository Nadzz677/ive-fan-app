/*
 DIVE ARCHIVE — MANUAL IMAGE ASSETS (V5.1.1 CLEAN ARCHITECTURE)

 Paste real image URLs below.

 Single source of truth for all artwork in the application.
 An empty string ("") indicates no artwork is provided yet, and the app
 will display a clean, neutral empty artwork container with zero AI placeholders.

 Do not put UI logic in this file.
*/

// ==========================================
// MEMBER PHOTOS
// ==========================================
/**
 * Manual image URL entries for all six IVE members.
 * Paste an HTTPS image URL (JPG, PNG, WEBP, AVIF).
 * Leaving an entry empty ("") will display a clean neutral profile state.
 */
export const memberImages: Record<string, string> = {
  yujin:
    "https://static.wikia.nocookie.net/kpop/images/9/94/IVE_An_Yujin_Lucid_Dream_concept_photo_1.png/revision/latest/scale-to-width-down/1000?cb=20260423160447", // An Yujin (Leader, Vocalist)
  gaeul:
    "https://static.wikia.nocookie.net/kpop/images/f/fc/IVE_Gaeul_Lucid_Dream_concept_photo_1.png/revision/latest?cb=20260423160451", // Gaeul (Main Rapper, Dancer)
  rei: "https://static.wikia.nocookie.net/kpop/images/2/2e/IVE_Rei_Lucid_Dream_concept_photo_1.png/revision/latest?cb=20260423160458", // Rei (Rapper, Vocalist)
  wonyoung:
    "https://static.wikia.nocookie.net/kpop/images/1/1b/IVE_Jang_Wonyoung_Lucid_Dream_concept_photo_1.png/revision/latest/scale-to-width-down/1000?cb=20260423160458", // Jang Wonyoung (Center, Vocalist, Dancer)
  liz: "https://static.wikia.nocookie.net/kpop/images/b/be/IVE_Liz_Lucid_Dream_concept_photo_1.png/revision/latest/scale-to-width-down/1200?cb=20260423160458", // Liz (Main Vocalist)
  leeseo:
    "https://static.wikia.nocookie.net/kpop/images/5/5c/IVE_Leeseo_Lucid_Dream_concept_photo_1.png/revision/latest?cb=20260423160458", // Leeseo (Maknae, Vocalist, Dancer)
};

// ==========================================
// ALBUM / RELEASE ARTWORK
// ==========================================
/**
 * Manual image URL entries for all 20 verified IVE releases.
 * By default, every song in an album automatically inherits its album's artwork.
 * Leaving an entry empty ("") will display a clean neutral artwork state.
 */
export const albumImages: Record<string, string> = {
  eleven: "https://images.genius.com/57b79c5c5411d935173caf33c78871a8.1000x1000x1.png", // 01. ELEVEN (Korean Single Album)
  "love-dive": "https://i.scdn.co/image/ab67616d0000b2739016f58cc49e6473e1207093", // 02. LOVE DIVE (Korean Single Album)
  "after-like": "https://images.genius.com/7bb551065b63ebf75da247a1c03fdb18.1000x1000x1.png", // 03. After LIKE (Korean Single Album)
  "eleven-jp": "https://i.scdn.co/image/ab67616d0000b2732491a35e8c5f8a746f45a8b9", // 04. ELEVEN -Japanese ver.- (Japanese Single)
  "love-dive-jp": "https://i.scdn.co/image/ab67616d0000b273fd8b66dfb652411b2e5b35cd", // 05. LOVE DIVE -Japanese ver.- (Japanese Digital Single)
  "ive-ive": "https://i.scdn.co/image/ab67616d0000b27325ef3cec1eceefd4db2f91c8", // 06. I've IVE (Korean Full Studio Album)
  wave: "https://i.scdn.co/image/ab67616d0000b2733415d4fdecbaaa74ddd93acf", // 07. WAVE (Japanese EP)
  "i-want": "https://i.scdn.co/image/ab67616d0000b2738c475998f5005d0a339b1f0d", // 08. I WANT (Digital Single)
  "ive-mine":
    "https://upload.wikimedia.org/wikipedia/en/5/5b/Ive_-_I%27ve_Mine.png?utm_source=en.wikipedia.org&utm_campaign=index&utm_content=original", // 09. I'VE MINE (Korean EP)
  "all-night": "https://i.scdn.co/image/ab67616d0000b273ca43f6d59274bb512011f0f6", // 10. All Night (Digital Single)
  will: "https://i.scdn.co/image/ab67616d0000b273e9290915e9d6439b64339aa8", // 11. Will (Digital Single)
  "ive-switch": "https://i.scdn.co/image/ab67616d0000b27326cc1062ed475f238d244141", // 12. IVE SWITCH (Korean EP)
  alive: "https://i.scdn.co/image/ab67616d0000b2738ad5c87293288fbdd1b721ed", // 13. ALIVE (Japanese EP)
  "ive-empathy": "https://i.scdn.co/image/ab67616d0000b273487f90022857e485ecc685eb", // 14. IVE EMPATHY (Korean EP)
  "dare-me": "https://images.genius.com/c9bf2bdd59bced0c417b74d1d9190971.1000x1000x1.png", // 15. DARE ME (Digital Single)
  "be-alright": "https://i.scdn.co/image/ab67616d0000b273560d6908e961f583d8f5eeba", // 16. Be Alright (Japanese EP)
  "ive-secret": "https://i.scdn.co/image/ab67616d0000b27304886cfb3beb68b17e53f6e9", // 17. IVE SECRET (Korean EP)
  "revive-plus": "https://i.scdn.co/image/ab67616d0000b273ad80a9aabc17535c5eeb5317", // 18. REVIVE+ (Korean Full Studio Album)
  "lucid-dream": "https://i.scdn.co/image/ab67616d00001e02a412fcafee88d753e06d042f", // 19. LUCID DREAM (Japanese EP)
  fashion: "https://images.genius.com/502b361661d471e2501eddaccaed69dd.1000x1000x1.png", // 20. Fashion (Digital Single)
  "looks-can-kill": "", // 21. Looks Can Kill (5th Korean EP)
  "supernova-love": "", // 22. Supernova Love (Collab Single with David Guetta)
  "will-korean": "", // 23. Will (Korean ver.) (Digital Single / Pokémon Horizons OST)
  "summer-festa": "", // 24. SUMMER FESTA (IVE x PEPSI Promotional Single)
};

// ==========================================
// OPTIONAL SONG-SPECIFIC ARTWORK
// ==========================================
/**
 * Optional song-specific artwork overrides.
 * Songs automatically inherit their parent album's artwork if not listed here.
 * Format: [trackId]: "IMAGE_URL"
 *
 * Example:
 * "eleven-1": "https://example.com/custom-eleven-artwork.jpg",
 */
export const songImageOverrides: Record<string, string> = {};

// ==========================================
// NEWS / HOMEPAGE IMAGES
// ==========================================
/**
 * Manual image URL entries for news announcements and tour highlights.
 * Leaving an entry empty ("") will display a clean neutral news banner.
 */
export const newsImages: Record<string, string> = {
  "ive-empathy-release":
    "https://6.soompi.io/wp-content/uploads/image/20250203090812_ive-attitude-1-.png?s=900x600&e=t",
  "world-tour-encore":
    "https://kfriday-uploads.s3.ap-northeast-2.amazonaws.com/images/post/2025-11-04_10:37:07.448_0_editor.jpeg",
  "switch-heya-promotion":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTb1OaI41cZocKCS1nDxBa7uvGHdQvdoEOVZ86Qf9pMZAXqV6Eu6eGBL78&s=10",
  "dive-global-archive":
    "https://preview.redd.it/ive-the-1st-album-ive-ive-concept-photo-2-group-wonyoung-v0-5dayy8nbjvra1.jpg?width=1080&crop=smart&auto=webp&s=5b21dbb351752b0edd602319b9050b3804ebcced",
};

// ==========================================
// RESOLVER UTILITIES (SINGLE SOURCE OF TRUTH)
// ==========================================

/**
 * Resolves member photo from `memberImages[memberId]`.
 * Returns "" if not provided.
 */
export function getMemberImage(memberId: string): string {
  return memberImages[memberId]?.trim() || "";
}

/**
 * Resolves album artwork from `albumImages[albumId]`.
 * Returns "" if not provided.
 */
export function getAlbumArtwork(albumId: string): string {
  return albumImages[albumId]?.trim() || "";
}

/**
 * Resolves song artwork following priority:
 * 1. Song-specific override from `songImageOverrides[song.id]`
 * 2. Parent album artwork from `getAlbumArtwork(song.albumId)`
 * 3. Empty string ("") if neither is provided.
 */
export function getSongArtwork(song?: { id?: string; albumId?: string } | null): string {
  if (!song) return "";
  const override = song.id ? songImageOverrides[song.id]?.trim() : undefined;
  if (override) {
    return override;
  }
  if (song.albumId) {
    return getAlbumArtwork(song.albumId);
  }
  return "";
}

/**
 * Resolves news item image from `newsImages[newsId]`.
 * Returns "" if not provided.
 */
export function getNewsImage(newsId: string): string {
  return newsImages[newsId]?.trim() || "";
}
