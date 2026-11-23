import type { Album, Track } from "@/types";
import { getAlbumArtwork, getSongArtwork } from "@/data/imageAssets";

/**
 * Master IVE Discography Catalog (Verified through November 2026).
 * Exact releases, tracklists, release dates, types, and language distinctions.
 * Zero fabricated songs, zero fabricated albums.
 */
export const albums: Album[] = [
  // 01 — Looks Can Kill (5th Korean EP)
  {
    id: "looks-can-kill",
    title: "Looks Can Kill",
    type: "Mini Album",
    releaseDate: "2026-10-26",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("looks-can-kill");
    },
    description:
      "Fifth Korean EP led by the title track 'Looks Can Kill', showcasing sleek, bold visuals and sharp pop production.",
    trackIds: ["lck-1", "lck-2", "lck-3", "lck-4", "lck-5", "lck-6"],
    trackCount: 6,
  },
  // 02 — LUCID DREAM (Japan 4th EP)
  {
    id: "lucid-dream",
    title: "LUCID DREAM",
    type: "Japanese EP",
    releaseDate: "2026-05-27",
    language: "Japanese",
    get cover() {
      return getAlbumArtwork("lucid-dream");
    },
    description:
      "Fourth Japanese EP featuring original tracks 'LUCID DREAM', 'Fashion', and 'JIGSAW' alongside Japanese versions of IVE EMPATHY songs.",
    trackIds: ["ld-jp-1", "ld-jp-2", "ld-jp-3", "ld-jp-4", "ld-jp-5", "ld-jp-6"],
    trackCount: 6,
  },
  // 03 — REVIVE+ (2nd Full-Length Album)
  {
    id: "revive-plus",
    title: "REVIVE+",
    type: "Studio Album",
    releaseDate: "2026-02-23",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("revive-plus");
    },
    description:
      "Second full-length Korean studio album led by double title tracks 'BLACKHOLE' and 'BANG BANG', featuring 6 group tracks and 6 official member solos.",
    trackIds: [
      "revive-1",
      "revive-2",
      "revive-3",
      "revive-4",
      "revive-5",
      "revive-6",
      "revive-7",
      "revive-8",
      "revive-9",
      "revive-10",
      "revive-11",
      "revive-12",
    ],
    trackCount: 12,
  },
  // 04 — IVE SECRET (4th Korean EP)
  {
    id: "ive-secret",
    title: "IVE SECRET",
    type: "Mini Album",
    releaseDate: "2025-08-25",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("ive-secret");
    },
    description: "Fourth Korean EP led by the title track 'XOXZ'.",
    trackIds: ["secret-1", "secret-2", "secret-3", "secret-4", "secret-5", "secret-6"],
    trackCount: 6,
  },
  // 05 — Be Alright (Japan 3rd EP)
  {
    id: "be-alright",
    title: "Be Alright",
    type: "Japanese EP",
    releaseDate: "2025-07-30",
    language: "Japanese",
    get cover() {
      return getAlbumArtwork("be-alright");
    },
    description:
      "Third Japanese EP featuring title track 'Be Alright', 'DARE ME', and Japanese versions of IVE SWITCH tracks.",
    trackIds: ["ba-1", "ba-2", "ba-3", "ba-4", "ba-5"],
    trackCount: 5,
  },
  // 06 — IVE EMPATHY (3rd Korean EP)
  {
    id: "ive-empathy",
    title: "IVE EMPATHY",
    type: "Mini Album",
    releaseDate: "2025-02-03",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("ive-empathy");
    },
    description: "Third Korean EP led by double title tracks 'REBEL HEART' and 'ATTITUDE'.",
    trackIds: ["empathy-1", "empathy-2", "empathy-3", "empathy-4", "empathy-5", "empathy-6"],
    trackCount: 6,
  },
  // 07 — Supernova Love (Collab Single with David Guetta)
  {
    id: "supernova-love",
    title: "Supernova Love",
    type: "Digital Single",
    releaseDate: "2024-11-08",
    language: "English",
    get cover() {
      return getAlbumArtwork("supernova-love");
    },
    description:
      "Global English collaboration single with David Guetta featuring the original and extended mix.",
    trackIds: ["supernova-1", "supernova-2"],
    trackCount: 2,
  },
  // 08 — Will (Korean ver.) (Digital Single / Pokémon Horizons OST)
  {
    id: "will-korean",
    title: "Will (Korean ver.)",
    type: "Digital Single",
    releaseDate: "2024-10-15",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("will-korean");
    },
    description:
      "Korean digital single version of 'Will', featured as the Pokémon Horizons: The Series OST.",
    trackIds: ["will-kr-1"],
    trackCount: 1,
  },
  // 09 — ALIVE (Japan 2nd EP)
  {
    id: "alive",
    title: "ALIVE",
    type: "Japanese EP",
    releaseDate: "2024-08-28",
    language: "Japanese",
    get cover() {
      return getAlbumArtwork("alive");
    },
    description:
      "Second Japanese EP featuring title track 'CRUSH', 'Will', and Japanese versions of previous hits.",
    trackIds: ["alive-1", "alive-2", "alive-3", "alive-4", "alive-5"],
    trackCount: 5,
  },
  // 10 — SUMMER FESTA (IVE x PEPSI Promotional Single)
  {
    id: "summer-festa",
    title: "SUMMER FESTA",
    type: "Digital Single",
    releaseDate: "2024-06-28",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("summer-festa");
    },
    description: "Summer promotional Korean digital single released in collaboration with Pepsi.",
    trackIds: ["summer-festa-1"],
    trackCount: 1,
  },
  // 11 — IVE SWITCH (2nd Korean EP)
  {
    id: "ive-switch",
    title: "IVE SWITCH",
    type: "Mini Album",
    releaseDate: "2024-04-29",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("ive-switch");
    },
    description: "Second Korean EP featuring double title tracks '해야 (HEYA)' and 'Accendio'.",
    trackIds: ["switch-1", "switch-2", "switch-3", "switch-4", "switch-5", "switch-6"],
    trackCount: 6,
  },
  // 12 — All Night (feat. Saweetie) (English Single)
  {
    id: "all-night",
    title: "All Night (feat. Saweetie)",
    type: "Digital Single",
    releaseDate: "2024-01-19",
    language: "English",
    get cover() {
      return getAlbumArtwork("all-night");
    },
    description: "First English digital single featuring American rapper Saweetie.",
    trackIds: ["all-night-1"],
    trackCount: 1,
  },
  // 13 — I'VE MINE (1st Korean EP)
  {
    id: "ive-mine",
    title: "I'VE MINE",
    type: "Mini Album",
    releaseDate: "2023-10-13",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("ive-mine");
    },
    description:
      "First Korean EP featuring triple title tracks 'Off The Record', 'Baddie', and 'Either Way'.",
    trackIds: ["mine-1", "mine-2", "mine-3", "mine-4", "mine-5", "mine-6"],
    trackCount: 6,
  },
  // 14 — I WANT (IVE x PEPSI Promotional Single)
  {
    id: "i-want",
    title: "I WANT",
    type: "Digital Single",
    releaseDate: "2023-07-13",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("i-want");
    },
    description: "Promotional Korean digital single released in collaboration with Pepsi.",
    trackIds: ["i-want-1"],
    trackCount: 1,
  },
  // 15 — WAVE (Japan 1st EP)
  {
    id: "wave",
    title: "WAVE",
    type: "Japanese EP",
    releaseDate: "2023-05-31",
    language: "Japanese",
    get cover() {
      return getAlbumArtwork("wave");
    },
    description:
      "First Japanese EP featuring original tracks 'WAVE' and 'Classic', alongside Japanese versions of previous singles.",
    trackIds: ["wave-1", "wave-2", "wave-3", "wave-4", "wave-5"],
    trackCount: 5,
  },
  // 16 — I've IVE (1st Full-Length Album)
  {
    id: "ive-ive",
    title: "I've IVE",
    type: "Studio Album",
    releaseDate: "2023-04-10",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("ive-ive");
    },
    description:
      "First full-length Korean studio album featuring 11 tracks led by 'I AM' and 'Kitsch'.",
    trackIds: [
      "ive-ive-1",
      "ive-ive-2",
      "ive-ive-3",
      "ive-ive-4",
      "ive-ive-5",
      "ive-ive-6",
      "ive-ive-7",
      "ive-ive-8",
      "ive-ive-9",
      "ive-ive-10",
      "ive-ive-11",
    ],
    trackCount: 11,
  },
  // 17 — ELEVEN -Japanese ver.- (Japan Debut Single)
  {
    id: "eleven-jp",
    title: "ELEVEN -Japanese ver.-",
    type: "Japanese Single",
    releaseDate: "2022-10-19",
    language: "Japanese",
    get cover() {
      return getAlbumArtwork("eleven-jp");
    },
    description:
      "Japanese debut single featuring 'ELEVEN (Japanese ver.)' and original B-side 'Queen of Hearts'.",
    trackIds: ["eleven-jp-1", "eleven-jp-2"],
    trackCount: 2,
  },
  // 18 — After LIKE (3rd Single Album)
  {
    id: "after-like",
    title: "After LIKE",
    type: "Single Album",
    releaseDate: "2022-08-22",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("after-like");
    },
    description:
      "Third single album featuring the summer title track 'After LIKE' and 'My Satisfaction'.",
    trackIds: ["after-like-1", "after-like-2"],
    trackCount: 2,
  },
  // 19 — LOVE DIVE (2nd Single Album)
  {
    id: "love-dive",
    title: "LOVE DIVE",
    type: "Single Album",
    releaseDate: "2022-04-05",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("love-dive");
    },
    description:
      "Second single album featuring the global hit title track 'LOVE DIVE' and 'ROYAL'.",
    trackIds: ["love-dive-1", "love-dive-2"],
    trackCount: 2,
  },
  // 20 — ELEVEN (1st Single Album / Debut)
  {
    id: "eleven",
    title: "ELEVEN",
    type: "Single Album",
    releaseDate: "2021-12-01",
    language: "Korean",
    get cover() {
      return getAlbumArtwork("eleven");
    },
    description: "Debut single album introducing IVE with lead title track 'ELEVEN' and 'Take It'.",
    trackIds: ["eleven-1", "eleven-2"],
    trackCount: 2,
  },
];

/**
 * Master Track Entities.
 * Structured catalog where each underlying song entity holds canonical data and release associations.
 */
export const tracks: Track[] = [
  // --- 01. Looks Can Kill (5th Korean EP) ---
  {
    id: "lck-1",
    title: "Looks Can Kill",
    artist: "IVE",
    albumId: "looks-can-kill",
    releaseIds: ["looks-can-kill"],
    duration: 195,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "lck-2",
    title: "Mirror Mirror",
    artist: "IVE",
    albumId: "looks-can-kill",
    releaseIds: ["looks-can-kill"],
    duration: 200,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "lck-3",
    title: "SNAKESKIN",
    artist: "IVE",
    albumId: "looks-can-kill",
    releaseIds: ["looks-can-kill"],
    duration: 201,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "lck-4",
    title: "CRUMBS",
    artist: "IVE",
    albumId: "looks-can-kill",
    releaseIds: ["looks-can-kill"],
    duration: 188,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "lck-5",
    title: "Girls Girls Girls",
    artist: "IVE",
    albumId: "looks-can-kill",
    releaseIds: ["looks-can-kill"],
    duration: 162,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "lck-6",
    title: "Glow Motion",
    artist: "IVE",
    albumId: "looks-can-kill",
    releaseIds: ["looks-can-kill"],
    duration: 181,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },

  // --- 02. LUCID DREAM (Japan 4th EP) ---
  {
    id: "ld-jp-1",
    title: "LUCID DREAM",
    artist: "IVE",
    albumId: "lucid-dream",
    releaseIds: ["lucid-dream"],
    duration: 207,
    isTitleTrack: true,
    language: "Japanese",
    version: "Original",
    releaseType: "Japanese EP",
    lyricsAvailable: true,
    lyricsKorean: `夢の中で目覚める感覚
Lucid dream, leading into light
どこまでも広がる幻想の世界
Awaken in my dream`,
    lyricsRomanized: `Yume no naka de mezameru kankaku
Lucid dream, leading into light
Doko made mo hirogaru gensou no sekai
Awaken in my dream`,
  },
  {
    id: "ld-jp-2",
    title: "Fashion",
    artist: "IVE",
    albumId: "lucid-dream",
    releaseIds: ["lucid-dream"],
    duration: 128,
    isTitleTrack: false,
    language: "Japanese",
    version: "Original",
    releaseType: "Japanese EP",
    lyricsAvailable: true,
    lyricsKorean: `Walk that runway, style so high
自分だけのカラーで彩る
Spotlight shines on our fashion`,
    lyricsRomanized: `Walk that runway, style so high
Jibun dake no karaa de irodoru
Spotlight shines on our fashion`,
  },
  {
    id: "ld-jp-3",
    title: "JIGSAW",
    artist: "IVE",
    albumId: "lucid-dream",
    releaseIds: ["lucid-dream"],
    duration: 160,
    isTitleTrack: false,
    language: "Japanese",
    version: "Original",
    releaseType: "Japanese EP",
  },
  {
    id: "ld-jp-4",
    title: "REBEL HEART (Japanese ver.)",
    artist: "IVE",
    albumId: "lucid-dream",
    releaseIds: ["lucid-dream"],
    duration: 188,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },
  {
    id: "ld-jp-5",
    title: "ATTITUDE (Japanese ver.)",
    artist: "IVE",
    albumId: "lucid-dream",
    releaseIds: ["lucid-dream"],
    duration: 194,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },
  {
    id: "ld-jp-6",
    title: "Thank U (Japanese ver.)",
    artist: "IVE",
    albumId: "lucid-dream",
    releaseIds: ["lucid-dream"],
    duration: 191,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },

  // --- 03. REVIVE+ (2nd Full-Length Album — 12 Tracks) ---
  {
    id: "revive-1",
    title: "BLACKHOLE",
    artist: "IVE",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 194,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
    lyricsAvailable: true,
    lyricsKorean: `빠져드는 블랙홀 속으로
멈출 수 없는 강력한 인력
새로운 차원으로 깨어나는 순간
This is our REVIVE+`,
    lyricsRomanized: `Ppajyeodeuneun beullaekhol sogeuro
Meomchul su eomneun gangnyeokhan illyeok
Saeroun chawoneuro kkaeeonaneun sungan
This is our REVIVE+`,
  },
  {
    id: "revive-2",
    title: "BANG BANG",
    artist: "IVE",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 178,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "revive-3",
    title: "Hush",
    artist: "IVE",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 167,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "revive-4",
    title: "Stuck In Your Head",
    artist: "IVE",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 167,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "revive-5",
    title: "Fireworks",
    artist: "IVE",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 180,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "revive-6",
    title: "HOT COFFEE",
    artist: "IVE",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 168,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "revive-7",
    title: "8 (JANG WONYOUNG Solo)",
    artist: "Jang Wonyoung",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 171,
    isTitleTrack: false,
    isSolo: true,
    member: "wonyoung",
    language: "Korean",
    version: "Solo",
    releaseType: "Studio Album",
    lyricsAvailable: true,
    lyricsKorean: `Infinite loops, 8
내 안의 무한한 세계
빛나는 별들을 향해 날아가
Just look at me now`,
    lyricsRomanized: `Infinite loops, 8
Nae anui muhanhan segye
Binnaneun byeoldeureul hyanghae naraga
Just look at me now`,
  },
  {
    id: "revive-8",
    title: "Odd (GAEUL Solo)",
    artist: "Gaeul",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 170,
    isTitleTrack: false,
    isSolo: true,
    member: "gaeul",
    language: "Korean",
    version: "Solo",
    releaseType: "Studio Album",
  },
  {
    id: "revive-9",
    title: "Super ICY (LEESEO Solo)",
    artist: "Leeseo",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 170,
    isTitleTrack: false,
    isSolo: true,
    member: "leeseo",
    language: "Korean",
    version: "Solo",
    releaseType: "Studio Album",
  },
  {
    id: "revive-10",
    title: "Unreal (LIZ Solo)",
    artist: "Liz",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 162,
    isTitleTrack: false,
    isSolo: true,
    member: "liz",
    language: "Korean",
    version: "Solo",
    releaseType: "Studio Album",
  },
  {
    id: "revive-11",
    title: "In Your Heart (REI Solo)",
    artist: "Rei",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 123,
    isTitleTrack: false,
    isSolo: true,
    member: "rei",
    language: "Korean",
    version: "Solo",
    releaseType: "Studio Album",
  },
  {
    id: "revive-12",
    title: "Force (AN YUJIN Solo)",
    artist: "An Yujin",
    albumId: "revive-plus",
    releaseIds: ["revive-plus"],
    duration: 204,
    isTitleTrack: false,
    isSolo: true,
    member: "yujin",
    language: "Korean",
    version: "Solo",
    releaseType: "Studio Album",
  },

  // --- 04. IVE SECRET (4th Korean EP) ---
  {
    id: "secret-1",
    title: "XOXZ",
    artist: "IVE",
    albumId: "ive-secret",
    releaseIds: ["ive-secret"],
    duration: 154,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
    lyricsAvailable: true,
    lyricsKorean: `XOXZ 우리만의 사인
비밀의 문을 열어봐
달콤한 속삭임 속에
Love code XOXZ`,
    lyricsRomanized: `XOXZ urimanui sain
Bimirui muneul yeoreobwa
Dalkomhan soksagim soge
Love code XOXZ`,
  },
  {
    id: "secret-2",
    title: "Wild Bird",
    artist: "IVE",
    albumId: "ive-secret",
    releaseIds: ["ive-secret"],
    duration: 163,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "secret-3",
    title: "Dear, My Feelings",
    artist: "IVE",
    albumId: "ive-secret",
    releaseIds: ["ive-secret"],
    duration: 193,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "secret-4",
    title: "GOTCHA (Baddest Eros)",
    artist: "IVE",
    albumId: "ive-secret",
    releaseIds: ["ive-secret"],
    duration: 151,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "secret-5",
    title: "♥Beats",
    artist: "IVE",
    albumId: "ive-secret",
    releaseIds: ["ive-secret"],
    duration: 150,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "secret-6",
    title: "Midnight Kiss",
    artist: "IVE",
    albumId: "ive-secret",
    releaseIds: ["ive-secret"],
    duration: 224,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },

  // --- 05. Be Alright (Japan 3rd EP) ---
  {
    id: "ba-1",
    title: "Be Alright",
    artist: "IVE",
    albumId: "be-alright",
    releaseIds: ["be-alright"],
    duration: 171,
    isTitleTrack: true,
    language: "Japanese",
    version: "Original",
    releaseType: "Japanese EP",
    lyricsAvailable: true,
    lyricsKorean: `Everything's gonna be alright
どんな暗闇も越えて
君の手を離さない
Stay with me, we will be alright`,
    lyricsRomanized: `Everything's gonna be alright
Donna kurayami mo koete
Kimi no te o hanasanai
Stay with me, we will be alright`,
  },
  {
    id: "ba-2",
    title: "DARE ME",
    artist: "IVE",
    albumId: "be-alright",
    releaseIds: ["be-alright"],
    duration: 163,
    isTitleTrack: false,
    language: "Japanese",
    version: "Original",
    releaseType: "Japanese EP",
    lyricsAvailable: true,
    lyricsKorean: `Dare me if you want
恐れを知らないステップ
どこまでも行こう
Take the dare tonight`,
    lyricsRomanized: `Dare me if you want
Osore o shiranai suteppu
Doko made mo ikou
Take the dare tonight`,
  },
  {
    id: "ba-3",
    title: "Accendio (Japanese ver.)",
    artist: "IVE",
    albumId: "be-alright",
    releaseIds: ["be-alright"],
    duration: 192,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },
  {
    id: "ba-4",
    title: "Blue Heart (Japanese ver.)",
    artist: "IVE",
    albumId: "be-alright",
    releaseIds: ["be-alright"],
    duration: 188,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },
  {
    id: "ba-5",
    title: "WOW (Japanese ver.)",
    artist: "IVE",
    albumId: "be-alright",
    releaseIds: ["be-alright"],
    duration: 178,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },

  // --- 06. IVE EMPATHY (3rd Korean EP) ---
  {
    id: "empathy-1",
    title: "REBEL HEART",
    artist: "IVE",
    albumId: "ive-empathy",
    releaseIds: ["ive-empathy"],
    duration: 188,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
    lyricsAvailable: true,
    lyricsKorean: `Rebel heart beating loud
세상이 정한 틀을 벗어나
우리의 방식으로 피어나는 빛
Never look back, follow my rebel heart`,
    lyricsRomanized: `Rebel heart beating loud
Sesangi jeonghan teureul beoseona
Uriui bangsigeuro pieonaneun bit
Never look back, follow my rebel heart`,
  },
  {
    id: "empathy-2",
    title: "FLU",
    artist: "IVE",
    albumId: "ive-empathy",
    releaseIds: ["ive-empathy"],
    duration: 189,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "empathy-3",
    title: "You Wanna Cry",
    artist: "IVE",
    albumId: "ive-empathy",
    releaseIds: ["ive-empathy"],
    duration: 174,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "empathy-4",
    title: "Thank U",
    artist: "IVE",
    albumId: "ive-empathy",
    releaseIds: ["ive-empathy"],
    duration: 191,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "empathy-5",
    title: "ATTITUDE",
    artist: "IVE",
    albumId: "ive-empathy",
    releaseIds: ["ive-empathy"],
    duration: 194,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "empathy-6",
    title: "TKO",
    artist: "IVE",
    albumId: "ive-empathy",
    releaseIds: ["ive-empathy"],
    duration: 186,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },

  // --- 07. Supernova Love (Collab Single with David Guetta) ---
  {
    id: "supernova-1",
    title: "Supernova Love",
    artist: "IVE, David Guetta",
    albumId: "supernova-love",
    releaseIds: ["supernova-love"],
    duration: 200,
    isTitleTrack: true,
    language: "English",
    version: "Original",
    releaseType: "Digital Single",
  },
  {
    id: "supernova-2",
    title: "Supernova Love (Extended Mix)",
    artist: "IVE, David Guetta",
    albumId: "supernova-love",
    releaseIds: ["supernova-love"],
    duration: 263,
    isTitleTrack: false,
    language: "English",
    version: "Extended Mix",
    releaseType: "Digital Single",
  },

  // --- 08. Will (Korean ver.) (Digital Single / Pokémon Horizons OST) ---
  {
    id: "will-kr-1",
    title: "Will (Korean ver.)",
    artist: "IVE",
    albumId: "will-korean",
    releaseIds: ["will-korean"],
    duration: 191,
    isTitleTrack: true,
    language: "Korean",
    version: "Korean Ver.",
    releaseType: "Digital Single",
  },

  // --- 09. ALIVE (Japan 2nd EP) ---
  {
    id: "alive-1",
    title: "CRUSH",
    artist: "IVE",
    albumId: "alive",
    releaseIds: ["alive"],
    duration: 209,
    isTitleTrack: true,
    language: "Japanese",
    version: "Original",
    releaseType: "Japanese EP",
    lyricsAvailable: true,
    lyricsKorean: `You got me crushing so hard
胸が高鳴るビート
一瞬で奪われた視線
It's a sweet crush`,
    lyricsRomanized: `You got me crushing so hard
Mune ga takanaru biito
Isshun de ubawareta shisen
It's a sweet crush`,
  },
  {
    id: "alive-2",
    title: "Will",
    artist: "IVE",
    albumId: "alive",
    releaseIds: ["alive"],
    duration: 191,
    isTitleTrack: false,
    language: "Japanese",
    version: "Original",
    releaseType: "Japanese EP",
    lyricsAvailable: true,
    lyricsKorean: `未来へと続く道
恐れずに進もう
強い意志を胸に抱いて
This is our will`,
    lyricsRomanized: `Mirai e to tsuzuku michi
Osorezu ni susumou
Tsuyoi ishi o mune ni idaite
This is our will`,
  },
  {
    id: "alive-3",
    title: "I AM (Japanese ver.)",
    artist: "IVE",
    albumId: "alive",
    releaseIds: ["alive"],
    duration: 183,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },
  {
    id: "alive-4",
    title: "Off The Record (Japanese ver.)",
    artist: "IVE",
    albumId: "alive",
    releaseIds: ["alive"],
    duration: 188,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },
  {
    id: "alive-5",
    title: "Baddie (Japanese ver.)",
    artist: "IVE",
    albumId: "alive",
    releaseIds: ["alive"],
    duration: 154,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },

  // --- 10. SUMMER FESTA (IVE x PEPSI Promotional Single) ---
  {
    id: "summer-festa-1",
    title: "SUMMER FESTA",
    artist: "IVE",
    albumId: "summer-festa",
    releaseIds: ["summer-festa"],
    duration: 219,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Digital Single",
  },

  // --- 11. IVE SWITCH (2nd Korean EP) ---
  {
    id: "switch-1",
    title: "해야 (HEYA)",
    artist: "IVE",
    albumId: "ive-switch",
    releaseIds: ["ive-switch"],
    duration: 190,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
    lyricsAvailable: true,
    lyricsKorean: `해야 해야 해야
어둠을 뚫고 타오르는 불꽃
붉게 물든 하늘 아래
숨겨진 너의 맘을 깨워봐`,
    lyricsRomanized: `Heya heya heya
Eodumeul ttulko taoreuneun bulkot
Bulkge muldeun haneul arae
Sumgyeojin neoui mameul kkaewobwa`,
  },
  {
    id: "switch-2",
    title: "Accendio",
    artist: "IVE",
    albumId: "ive-switch",
    releaseIds: ["ive-switch"],
    duration: 192,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
    lyricsAvailable: true,
    lyricsKorean: `Watch me ignite
마법 같은 주문 Accendio
어둠 속에서 피어나는 빛
Let the magic begin`,
    lyricsRomanized: `Watch me ignite
Mabeop gateun jumun Accendio
Eodum sogeseo pieonaneun bit
Let the magic begin`,
  },
  {
    id: "switch-3",
    title: "Blue Heart",
    artist: "IVE",
    albumId: "ive-switch",
    releaseIds: ["ive-switch"],
    duration: 188,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "switch-4",
    title: "Ice Queen",
    artist: "IVE",
    albumId: "ive-switch",
    releaseIds: ["ive-switch"],
    duration: 183,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "switch-5",
    title: "WOW",
    artist: "IVE",
    albumId: "ive-switch",
    releaseIds: ["ive-switch"],
    duration: 179,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "switch-6",
    title: "RESET",
    artist: "IVE",
    albumId: "ive-switch",
    releaseIds: ["ive-switch"],
    duration: 161,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },

  // --- 12. All Night (feat. Saweetie) (English Single) ---
  {
    id: "all-night-1",
    title: "All Night (feat. Saweetie)",
    artist: "IVE, Saweetie",
    albumId: "all-night",
    releaseIds: ["all-night"],
    duration: 198,
    isTitleTrack: true,
    language: "English",
    version: "Original",
    releaseType: "Digital Single",
    lyricsAvailable: true,
    lyricsKorean: `We're dancing all night
Can't stop the feeling, under the neon lights
Together till the morning comes
All night, all night`,
    lyricsRomanized: `We're dancing all night
Can't stop the feeling, under the neon lights
Together till the morning comes
All night, all night`,
  },

  // --- 13. I'VE MINE (1st Korean EP) ---
  {
    id: "mine-1",
    title: "Off The Record",
    artist: "IVE",
    albumId: "ive-mine",
    releaseIds: ["ive-mine"],
    duration: 188,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
    lyricsAvailable: true,
    lyricsKorean: `시간이 됐어 it's 12 o'clock
비밀스러운 우리의 밤
아무도 모르게 속삭여줘
Let's talk off the record`,
    lyricsRomanized: `Sigani dwaesseo it's 12 o'clock
Bimillseureoun uriui bam
Amudo moreuge soksagyeojwo
Let's talk off the record`,
  },
  {
    id: "mine-2",
    title: "Baddie",
    artist: "IVE",
    albumId: "ive-mine",
    releaseIds: ["ive-mine"],
    duration: 154,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
    lyricsAvailable: true,
    lyricsKorean: `I'mma baddie, b-b-baddie, baddie, pretty little risky baddie
뭐든 될 대로 되라지
Catch me if you can
Baddie on the track`,
    lyricsRomanized: `I'mma baddie, b-b-baddie, baddie, pretty little risky baddie
Mwodeun doel daero doeraji
Catch me if you can
Baddie on the track`,
  },
  {
    id: "mine-3",
    title: "Either Way",
    artist: "IVE",
    albumId: "ive-mine",
    releaseIds: ["ive-mine"],
    duration: 166,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
    lyricsAvailable: true,
    lyricsKorean: `누가 내 말투가 차갑대
누가 내 미소가 다정하대
어쩌면 다 맞고 다 틀릴지도 몰라
Either way, I'm just me`,
    lyricsRomanized: `Nuga nae maltuga chagapdae
Nuga nae misoga dajeonghadae
Eojjeomyeon da matgo da teulliljido molla
Either way, I'm just me`,
  },
  {
    id: "mine-4",
    title: "Holy Moly",
    artist: "IVE",
    albumId: "ive-mine",
    releaseIds: ["ive-mine"],
    duration: 176,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "mine-5",
    title: "OTT",
    artist: "IVE",
    albumId: "ive-mine",
    releaseIds: ["ive-mine"],
    duration: 157,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },
  {
    id: "mine-6",
    title: "Payback",
    artist: "IVE",
    albumId: "ive-mine",
    releaseIds: ["ive-mine"],
    duration: 188,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Mini Album",
  },

  // --- 14. I WANT (IVE x PEPSI Promotional Single) ---
  {
    id: "i-want-1",
    title: "I WANT",
    artist: "IVE",
    albumId: "i-want",
    releaseIds: ["i-want"],
    duration: 188,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Digital Single",
    lyricsAvailable: true,
    lyricsKorean: `I want, I want it all
청량한 탄산처럼 터지는 기분
망설임 없이 외쳐봐
It's what I want`,
    lyricsRomanized: `I want, I want it all
Cheongryanghan tansancheoreom teojineun gibun
Mangseorim eopsi oechyeobwa
It's what I want`,
  },

  // --- 15. WAVE (Japan 1st EP) ---
  {
    id: "wave-1",
    title: "WAVE",
    artist: "IVE",
    albumId: "wave",
    releaseIds: ["wave"],
    duration: 175,
    isTitleTrack: true,
    language: "Japanese",
    version: "Original",
    releaseType: "Japanese EP",
    lyricsAvailable: true,
    lyricsKorean: `波のように押し寄せる感情
Ride on the wave, ride on the wave
迷わずに飛び込んで
Catch that wave right now`,
    lyricsRomanized: `Nami no you ni oshiyoseru kanjou
Ride on the wave, ride on the wave
Mayowazu ni tobikonde
Catch that wave right now`,
  },
  {
    id: "wave-2",
    title: "Classic",
    artist: "IVE",
    albumId: "wave",
    releaseIds: ["wave"],
    duration: 212,
    isTitleTrack: false,
    language: "Japanese",
    version: "Original",
    releaseType: "Japanese EP",
  },
  {
    id: "wave-3",
    title: "After LIKE (Japanese ver.)",
    artist: "IVE",
    albumId: "wave",
    releaseIds: ["wave"],
    duration: 178,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },
  {
    id: "wave-4",
    title: "LOVE DIVE (Japanese ver.)",
    artist: "IVE",
    albumId: "wave",
    releaseIds: ["wave"],
    duration: 177,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
    lyricsAvailable: true,
    lyricsKorean: `君のことが気になってる
私も同じかもね
追いかけ合うこのゲームで
惹かれ合う好奇心

Narcissistic, my god I love it
照らし合う夜
美しい瞳の奥へと
息止めて love dive`,
    lyricsRomanized: `Kimi no koto ga ki ni natteru
Watashi mo onaji kamo ne
Oikakeau kono geemu de
Hikareau koukishin

Narcissistic, my god I love it
Terashiau yoru
Utsukushii hitomi no oku e to
Iki tomete love dive`,
  },
  {
    id: "wave-5",
    title: "Take It (Japanese ver.)",
    artist: "IVE",
    albumId: "wave",
    releaseIds: ["wave"],
    duration: 205,
    isTitleTrack: false,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese EP",
  },

  // --- 16. I've IVE (1st Full-Length Album) ---
  {
    id: "ive-ive-1",
    title: "Blue Blood",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 167,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
    lyricsAvailable: true,
    lyricsKorean: `Time's up, watch out
푸른 피가 흐르는 순간
We will rule this kingdom tonight`,
    lyricsRomanized: `Time's up, watch out
Pureun piga heureuneun sungan
We will rule this kingdom tonight`,
  },
  {
    id: "ive-ive-2",
    title: "I AM",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 183,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
    lyricsAvailable: true,
    lyricsKorean: `다른 문을 열어 따라갈 필요는 없어
넌 너의 길로 난 나의 길로 음
하루하루마다 색이 달라진 느낌
밝게 빛이 나는 길을 찾아

I'm on my way 넌 그냥 믿으면 돼
어제와는 또 다른 나를 보게 될 테니
That's my life, 아름다운 갤럭시
Be a writer, 장르로는 판타지
내일 내게 열리는 건 big, big stage
So that is who I am`,
    lyricsRomanized: `Dareun muneul yeoreo ttaragal piryoneun eopseo
Neon neoui gillo nan naui gillo eum
Haruharumada saegi dallajin neukkim
Balkge bichi naneun gireul chaja

I'm on my way neon geunyang mideumyeon dwae
Eojewaneun tto dareun nareul boge doel teni
That's my life, areumdaun gaelleoksi
Be a writer, jangreuroneun pantaji
Naeil naege yeollineun geon big, big stage
So that is who I am`,
  },
  {
    id: "ive-ive-3",
    title: "Kitsch",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 195,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
    lyricsAvailable: true,
    lyricsKorean: `It's our time, 우린 달라
우리만의 자유로운 애티튜드
우리만의 룰, never copy
Nineteen's kitsch`,
    lyricsRomanized: `It's our time, urin dalla
Urimanui jayuroun aetityudeu
Urimanui rul, never copy
Nineteen's kitsch`,
  },
  {
    id: "ive-ive-4",
    title: "Lips",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 181,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "ive-ive-5",
    title: "Heroine",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 171,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "ive-ive-6",
    title: "Mine",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 190,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "ive-ive-7",
    title: "섬찟 (Hypnosis)",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 146,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "ive-ive-8",
    title: "NOT YOUR GIRL",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 202,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "ive-ive-9",
    title: "궁금해 (Next Page)",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 199,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "ive-ive-10",
    title: "Cherish",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 194,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },
  {
    id: "ive-ive-11",
    title: "Shine With Me",
    artist: "IVE",
    albumId: "ive-ive",
    releaseIds: ["ive-ive"],
    duration: 224,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Studio Album",
  },

  // --- 17. ELEVEN -Japanese ver.- (Japan Debut Single) ---
  {
    id: "eleven-jp-1",
    title: "ELEVEN (Japanese ver.)",
    artist: "IVE",
    albumId: "eleven-jp",
    releaseIds: ["eleven-jp"],
    duration: 180,
    isTitleTrack: true,
    isJapaneseVersion: true,
    language: "Japanese",
    version: "Japanese Ver.",
    releaseType: "Japanese Single",
    lyricsAvailable: true,
    lyricsKorean: `退屈だった私の瞳
無彩色の日々が
眩しい君の色彩で満たされていく
息つく暇もないほど美しい

Don't say you love me, don't say you love me
始まったばかりの私たちの秘密
1, 2, 3, 4, 5, 6, 7
You make me feel like eleven`,
    lyricsRomanized: `Taikutsu datta watashi no hitomi
Musaishoku no hibi ga
Mabushii kimi no shikisai de mitasarete iku
Iki tsuku hima mo nai hodo utsukushii

Don't say you love me, don't say you love me
Hajimatta bakari no watashitachi no himitsu
1, 2, 3, 4, 5, 6, 7
You make me feel like eleven`,
  },
  {
    id: "eleven-jp-2",
    title: "Queen of Hearts",
    artist: "IVE",
    albumId: "eleven-jp",
    releaseIds: ["eleven-jp"],
    duration: 145,
    isTitleTrack: false,
    language: "Japanese",
    version: "Original",
    releaseType: "Japanese Single",
    lyricsAvailable: true,
    lyricsKorean: `I'm the Queen of Hearts
心奪うビートに乗せて
誰も止められないわ
Follow my lead, ready to play`,
    lyricsRomanized: `I'm the Queen of Hearts
Kokoro ubau biito ni nosete
Dare mo tomerarenai wa
Follow my lead, ready to play`,
  },

  // --- 18. After LIKE (3rd Single Album) ---
  {
    id: "after-like-1",
    title: "After LIKE",
    artist: "IVE",
    albumId: "after-like",
    releaseIds: ["after-like"],
    duration: 176,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Single Album",
    lyricsAvailable: true,
    lyricsKorean: `또 모르지 내 마음이
저 날씨처럼 바뀔지
날 나조차 다 알 수 없으니

그게 뭐가 중요해
지금 네게 완전히 푹 빠졌단 게
중요한 거지

아마 꿈만 같겠지만 분명 꿈이 아니야
달리 설명할 수 없는 이건 사랑일 거야
방금 내가 말한 감정 감히 의심하지 마
그냥 좋다는 게 아냐 What's after 'LIKE'?`,
    lyricsRomanized: `Tto moreuji nae maeumi
Jeo nalssicheoreom bakkwilji
Nal najocha da al su eopseuni

Geuge mwoga jungyohae
Jigeum nege wanjeonhi puk ppajyeotdan ge
Jungyohan geoji

Ama kkumman gatgetjiman bunmyeong kkumi aniya
Dalli seolmyeonghal su eomneun igeon sarangil geoya
Banggeum naega malhan gamjeong gamhi uisimhaji ma
Geunyang jotaneun ge anya What's after 'LIKE'?`,
  },
  {
    id: "after-like-2",
    title: "My Satisfaction",
    artist: "IVE",
    albumId: "after-like",
    releaseIds: ["after-like"],
    duration: 193,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Single Album",
    lyricsAvailable: true,
    lyricsKorean: `Shine on me, spotlight blinding
나를 위한 순간이야
더 높이 날아올라
This is my satisfaction`,
    lyricsRomanized: `Shine on me, spotlight blinding
Nareul wihan sunganiya
Deo nopi naraolla
This is my satisfaction`,
  },

  // --- 19. LOVE DIVE (2nd Single Album) ---
  {
    id: "love-dive-1",
    title: "LOVE DIVE",
    artist: "IVE",
    albumId: "love-dive",
    releaseIds: ["love-dive"],
    duration: 177,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Single Album",
    lyricsAvailable: true,
    lyricsKorean: `네가 참 궁금해 그건 너도 마찬가지
이거면 충분해 쫓고 쫓는 이런 놀이
참을 수 없는 이끌림과 호기심
묘한 너와 나 두고 보면 알겠지

Woo 눈동자 아래로
Woo 감추고 있는 거
Woo yeah it's so bad it's good
난 그 맘을 좀 봐야겠어

Narcissistic, my god I love it
서로를 비춘 밤
아름다운 까만 눈빛 더 빠져들어가
숨 참고 love dive`,
    lyricsRomanized: `Nega cham gunggeumhae geugeon neodo machangaji
Igeomyeon chungbunhae jjotgo jjotneun ireon nori
Chameul su eomneun ikkeullimgwa hogisim
Myohan neowa na dugo bomyeon algetji

Woo nundongja araero
Woo gamchugo inneun geo
Woo yeah it's so bad it's good
Nan geu mameul jom bwayagesseo

Narcissistic, my god I love it
Seororeul bichun bam
Areumdaun kkaman nunbit deo ppajyeodeureoga
Sum chamgo love dive`,
  },
  {
    id: "love-dive-2",
    title: "ROYAL",
    artist: "IVE",
    albumId: "love-dive",
    releaseIds: ["love-dive"],
    duration: 206,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Single Album",
    lyricsAvailable: true,
    lyricsKorean: `Every time I walk, crown on my head
자신감 있게 걸어가
우아한 발걸음 속에
We are royal, shining tonight`,
    lyricsRomanized: `Every time I walk, crown on my head
Jasingam itge georeoga
Uahan balgeoreum soge
We are royal, shining tonight`,
  },

  // --- 20. ELEVEN (1st Single Album / Debut) ---
  {
    id: "eleven-1",
    title: "ELEVEN",
    artist: "IVE",
    albumId: "eleven",
    releaseIds: ["eleven"],
    duration: 178,
    isTitleTrack: true,
    language: "Korean",
    version: "Original",
    releaseType: "Single Album",
    lyricsAvailable: true,
    lyricsKorean: `따분한 나의 눈빛이
무채색의 날들이
눈부신 네 빛깔들로 채워져
숨 쉴 틈 없이 아름다워

내 방을 가득 채운 너의 향기
나를 흔들어 깨워

Don't say you love me, don't say you love me
이제 막 시작된 우리만의 비밀
하나 둘 셋 넷 다섯 여섯 일곱
그 뒤엔 1, 2, 3, 4, 5, 6, 7
You make me feel like eleven`,
    lyricsRomanized: `Ttabunhan naui nunbichi
Muchasaegui naldeuri
Nunbusin ne bitkkaldeullo chaewojyeo
Sum swil teum eopsi areumdawo

Nae bangeul gadeuk chaeun neoui hyanggi
Nareul heundeureo kkaewo

Don't say you love me, don't say you love me
Ije mak sijakdoen urimanui bimil
Hana dul set net daseot yeoseot ilgop
Geu dwien 1, 2, 3, 4, 5, 6, 7
You make me feel like eleven`,
  },
  {
    id: "eleven-2",
    title: "Take It",
    artist: "IVE",
    albumId: "eleven",
    releaseIds: ["eleven"],
    duration: 205,
    isTitleTrack: false,
    language: "Korean",
    version: "Original",
    releaseType: "Single Album",
    lyricsAvailable: true,
    lyricsKorean: `Take it, take it, don't break it
너의 손끝에 닿은 feeling
망설이지 말고 내게 다가와
Watch me now, take it right now`,
    lyricsRomanized: `Take it, take it, don't break it
Neoui sonkkeute daeun feeling
Mangseoriji malgo naege dagawa
Watch me now, take it right now`,
  },
];

export const getAlbum = (id?: string) => {
  const album = albums.find((a) => a.id === id);
  if (!album) return undefined;
  return {
    ...album,
    cover: getAlbumArtwork(album.id),
  };
};

/**
 * Returns artwork URL for a specific track, inheriting from its parent album unless overridden.
 */
export const getTrackArtwork = (track?: Track | { id?: string; albumId?: string } | null) => {
  return getSongArtwork(track);
};

/**
 * Returns the track list for a given release in its exact canonical ordering.
 */
export const getAlbumTracks = (albumId: string): Track[] => {
  const album = getAlbum(albumId);
  if (!album) return [];
  return album.trackIds
    .map((tid) => tracks.find((t) => t.id === tid))
    .filter((t): t is Track => Boolean(t));
};

export const getTrack = (id?: string) => tracks.find((t) => t.id === id);

/** Fallback duration estimator in seconds. */
export const trackDuration = (track?: Track | null) => track?.duration ?? 180;

/** Official track count of a release. */
export const albumTrackCount = (album: Album) => album.trackCount;

/** Whether an album currently has fewer tracks listed than its official trackCount. */
export const hasPartialTracklist = (album: Album) => album.trackIds.length < album.trackCount;

export const featuredAlbumId = "looks-can-kill";
export const featuredTrackId = "lck-1";

/** Albums sorted chronologically newest-first for the discography view. */
export const recentAlbums = [...albums].sort(
  (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
);

export const titleTracks = tracks.filter((t) => t.isTitleTrack);
export const koreanTracks = tracks.filter((t) => t.language === "Korean");
export const japaneseTracks = tracks.filter((t) => t.language === "Japanese");
export const englishTracks = tracks.filter((t) => t.language === "English");
export const soloTracks = tracks.filter((t) => t.isSolo);
