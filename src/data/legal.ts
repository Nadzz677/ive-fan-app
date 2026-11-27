export type LegalDocId = "developer" | "faq" | "copyright" | "terms" | "privacy";

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  id: Exclude<LegalDocId, "faq">;
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: LegalSection[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const LEGAL_META = {
  appName: "IVE: Dive Archive",
  creator: "Nadzz677",
  githubUrl: "https://github.com/Nadzz677",
  contactEmail: "nadzhaa254@gmail.com",
  lastUpdated: "November 2026",
  version: "1.0.0",
} as const;

export const LEGAL_DOCUMENTS: Record<Exclude<LegalDocId, "faq">, LegalDocument> = {
  developer: {
    id: "developer",
    eyebrow: "CREATOR NOTE",
    title: "About the Developer",
    subtitle: "Built independently by a fellow DIVE to celebrate IVE's music and eras.",
    sections: [
      {
        title: "Made by a DIVE, for DIVEs",
        paragraphs: [
          "Hi! IVE: Dive Archive was designed and built independently by Nadzz677 — a 19-year-old developer who is also a proud DIVE.",
          "This project was created purely out of genuine admiration for IVE (An Yujin, Gaeul, Rei, Jang Wonyoung, Liz, and Leeseo), with one simple goal: welcoming new listeners and giving fellow fans a polished, distraction-free home to explore more about IVE's eras, members, discography, and lyrics.",
        ],
      },
      {
        title: "Why This Archive Exists",
        bullets: [
          "To make discovering IVE's full Korean, Japanese, and global discography effortless and enjoyable in one cohesive editorial experience.",
          "To celebrate every comeback era through 11 custom album-inspired color palettes, member dossiers, and Original & Romanized sing-along lyrics.",
          "100% passion-driven: zero ads, zero paywalls, and zero commercial profit — built purely to share love for IVE.",
        ],
      },
      {
        title: "Connect & Feedback",
        paragraphs: [
          "Have a suggestion, spotted a lyric typo, or just want to say hello? Feel free to check out GitHub (@Nadzz677) or reach out directly via email at nadzhaa254@gmail.com!",
        ],
      },
    ],
  },

  copyright: {
    id: "copyright",
    eyebrow: "INTELLECTUAL PROPERTY",
    title: "Copyright & Fan Disclaimer",
    subtitle:
      "Independent non-commercial fan archive — all rights belong to their rightful owners.",
    sections: [
      {
        title: "Non-Affiliation Notice",
        paragraphs: [
          "IVE: Dive Archive is an independent, non-commercial, fan-made editorial archive created and maintained by Nadzz677 for DIVEs.",
          "This application is not affiliated with, endorsed by, sponsored by, or officially connected to IVE, Starship Entertainment, Kakao Entertainment, Columbia Records, or Sony Music Japan.",
        ],
      },
      {
        title: "Ownership of Artist & Media Rights",
        paragraphs: [
          "All artist names (IVE, An Yujin, Gaeul, Rei, Jang Wonyoung, Liz, and Leeseo), stage identities, logos, album titles, cover artwork, concept photography, music videos, audio recordings, and original lyrics are the exclusive copyright and trademark property of Starship Entertainment and their respective rights holders, composers, lyricists, and photographers.",
        ],
      },
      {
        title: "Music & Lyrics Sources",
        bullets: [
          "Music & Audio Streams: Track playback is delivered via the official YouTube IFrame Player API using embeds sourced from the official IVE and Starship Entertainment YouTube channels (subject to YouTube's Terms of Service), alongside linked external cloud audio sources where configured.",
          "Lyrics Reference: Original and Romanized lyrics displayed in the lyrics viewer are referenced from AZLyrics solely for non-commercial fan sing-along and language appreciation. All underlying lyric copyrights remain exclusively with the original lyricists, publishers, and Starship Entertainment.",
          "No Piracy or File Downloads: This app is 100% free, displays zero ads, generates $0 revenue, and does not sell, redistribute, or provide downloadable MP3/audio files.",
        ],
      },
      {
        title: "Support IVE on Official Platforms",
        paragraphs: [
          "Streams inside IVE: Dive Archive do not count toward Korean or international music charts (Melon, Genie, Bugs, Flo, Vibe, Spotify, Apple Music, or music-show tracking). Please continue streaming, purchasing albums, and watching official music videos directly on official platforms to support IVE.",
        ],
      },
      {
        title: "Copyright Takedown & Attribution Requests",
        paragraphs: [
          "We deeply respect the work of IVE, Starship Entertainment, photographers, lyricists, and publishers. If you are a rights holder or authorized representative and would like any image, lyric entry, or media link removed or credited differently, please email nadzhaa254@gmail.com and we will act promptly within 24–48 hours.",
        ],
      },
    ],
  },

  terms: {
    id: "terms",
    eyebrow: "USAGE AGREEMENT",
    title: "Terms & Conditions",
    subtitle: "Clear rules on what IVE: Dive Archive does, does not do, and how it may be used.",
    sections: [
      {
        title: "Acceptance of Terms",
        paragraphs: [
          "By accessing or using IVE: Dive Archive on the web or Android, you agree to these Terms & Conditions. This project is provided purely as a personal, non-commercial fan archive maintained by Nadzz677.",
        ],
      },
      {
        title: "What This App Does",
        bullets: [
          "Organizes IVE's 2021–2026 Korean, Japanese, and global discography, six member dossiers, birthday countdowns, and curated news dispatches.",
          "Provides an album-themed interface (11 Living Era themes) with an embedded YouTube music player and Original / Romanized lyrics viewer.",
          "Saves your Favorites, Era Theme, and playback preferences seamlessly on your device and anonymous session.",
        ],
      },
      {
        title: "What This App Does Not Do",
        bullets: [
          "Does not represent IVE or Starship Entertainment, and does not publish official agency notices, fanclub memberships, concert tickets, or merchandise.",
          "Does not offer downloadable music files, paid subscriptions, or commercial streaming services.",
          "Does not count toward official streaming charts or music-show voting.",
          "Does not guarantee uninterrupted availability of third-party YouTube embeds, external images, or internet-dependent links.",
        ],
      },
      {
        title: "Acceptable Use",
        bullets: [
          "Use the app strictly for personal, non-commercial fandom enjoyment and reference.",
          "Do not scrape, commercially resell, redistribute, or misrepresent this app as an official Starship Entertainment product.",
          "Respect the intellectual property rights of IVE, Starship Entertainment, and all credited creators at all times.",
        ],
      },
      {
        title: "Third-Party Services & Disclaimer",
        paragraphs: [
          "Embedded YouTube playback is subject to YouTube's Terms of Service and Google's Privacy Policy. External artwork and media links remain the responsibility of their respective hosts.",
          'IVE: Dive Archive is provided "as-is" without warranties of any kind. Features, catalog entries, or policies may be updated at any time to keep the archive accurate and enjoyable.',
        ],
      },
    ],
  },

  privacy: {
    id: "privacy",
    eyebrow: "DATA TRANSPARENCY",
    title: "Privacy Policy",
    subtitle: "No sign-up, no ads, and zero personal information collected from fan users.",
    sections: [
      {
        title: "No Personal Information Collected",
        paragraphs: [
          "IVE: Dive Archive never asks fan users for their name, email address, phone number, physical location, contacts, or password. There are no user profiles, advertisements, or third-party ad trackers.",
        ],
      },
      {
        title: "Anonymous Session & On-Device Storage",
        bullets: [
          "Anonymous Sync: When online, Google Firebase assigns a random, anonymous device ID solely so your Favorites, Era Theme, and playback preferences stay synced cleanly.",
          "Local Device Storage: Your browser or Android app stores your Welcome Tour status, selected theme, favorites, shuffle preference, playback settings, last-played track (only when 'Remember last session' is enabled), and a temporary bounded cache for fast loading.",
        ],
      },
      {
        title: "Third-Party Services Used",
        bullets: [
          "Google Cloud / Firebase: Hosts the live archive catalog and anonymous preference sync.",
          "YouTube IFrame API (Google LLC): Streams embedded official music playback and may set standard YouTube playback cookies/telemetry governed by Google's Privacy Policy.",
          "Google Fonts: Loads the editorial typography used in the interface.",
          'External Image CDNs: Artwork and photos are requested with referrerPolicy="no-referrer" so third-party image hosts do not receive your browsing origin.',
        ],
      },
      {
        title: "Your Controls & Data Deletion",
        paragraphs: [
          "You remain in full control of your preferences at all times: you can toggle off 'Remember last session' in Settings, or clear your browser/app storage (or uninstall the app) at any time to wipe all locally stored data and reset your anonymous session.",
          "For any privacy question or inquiry, contact nadzhaa254@gmail.com.",
        ],
      },
    ],
  },
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "official",
    question: "Is IVE: Dive Archive an official Starship Entertainment app?",
    answer:
      "No. IVE: Dive Archive is an unofficial, 100% free, ad-free fan project built by Nadzz677 for DIVEs. It is not affiliated with or endorsed by IVE or Starship Entertainment, and all artist rights belong to their rightful owners.",
  },
  {
    id: "charts",
    question: "Do streams here count toward Spotify, Melon, or music-show charts?",
    answer:
      "No. Music playback inside this archive is for personal discovery and enjoyment only and does not count toward official streaming charts. Please support IVE by streaming and purchasing directly on official platforms (Melon, Genie, Spotify, Apple Music, and YouTube Official).",
  },
  {
    id: "sources",
    question: "Where do the music streams and lyrics come from?",
    answer:
      "Songs are played using embedded YouTube streams sourced from the official IVE and Starship Entertainment YouTube channels (plus linked cloud sources where configured). Original and Romanized lyrics are referenced from AZLyrics for non-commercial fan sing-along.",
  },
  {
    id: "account",
    question: "Do I need to create an account to save my Favorites and Era Theme?",
    answer:
      "No sign-up is needed! Your Favorites, chosen album theme, and playback preferences are saved automatically on your device and synced via an anonymous session.",
  },
  {
    id: "lyrics-sync",
    question: "Why aren't the lyrics synchronized line-by-line with the song?",
    answer:
      "Lyrics are currently presented as clean, scrollable Original and Romanized glassmorphism sheets (with fullscreen expand) rather than time-synced karaoke lines.",
  },
  {
    id: "privacy-ads",
    question: "Does this app collect personal data or show ads?",
    answer:
      "Never. The app has zero ads, zero paywalls, and never asks fan users for emails, names, phone numbers, or locations. Only your anonymous preferences (favorites, theme, and playback settings) are saved.",
  },
  {
    id: "takedown",
    question: "How do I report a bug, lyric correction, or copyright takedown request?",
    answer:
      "Email Nadzz677 directly at nadzhaa254@gmail.com. Bug reports, lyric fixes, and any copyright or attribution requests from rightful owners are reviewed and handled promptly.",
  },
];
