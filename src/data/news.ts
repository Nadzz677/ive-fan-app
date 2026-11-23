import type { NewsItem } from "@/types";
import { getNewsImage } from "@/data/imageAssets";

export const newsItems: NewsItem[] = [
  {
    id: "ive-empathy-release",
    category: "Release",
    title: "IVE 3rd Mini Album 'IVE EMPATHY' Released",
    date: "2025-02-03",
    summary:
      "IVE returns with their 3rd mini album led by the title track 'REBEL HEART' and 'ATTITUDE', exploring mature confidence and empathy.",
    details: [
      "Led by double title tracks 'REBEL HEART' and 'ATTITUDE'.",
      "Features dynamic visual storytelling with high-contrast crimson and metallic aesthetics.",
      "Available across streaming platforms with dedicated fan archive tracks.",
    ],
    get image() {
      return getNewsImage("ive-empathy-release");
    },
    tag: "Comeback",
    albumId: "ive-empathy",
  },
  {
    id: "world-tour-encore",
    category: "Tour & Live",
    title: "1st World Tour 'SHOW WHAT I HAVE' Global Finale",
    date: "2024-09-15",
    summary:
      "IVE successfully concluded their landmark 27-city world tour across Asia, the Americas, and Europe, celebrating special encore stages with DIVEs worldwide.",
    details: [
      "Over 420,000 global fans attended across 19 countries.",
      "Features live band rearrangements of 'ELEVEN', 'LOVE DIVE', 'I AM', and 'HEYA'.",
      "Special encore performances delivered in Seoul and Tokyo Dome.",
    ],
    get image() {
      return getNewsImage("world-tour-encore");
    },
    tag: "World Tour",
  },
  {
    id: "switch-heya-promotion",
    category: "Performance",
    title: "'HEYA' & 'Accendio' Special Stages & Accolades",
    date: "2024-05-12",
    summary:
      "The 2nd mini album IVE SWITCH captivated global audiences with traditional Korean visual elements woven into bold contemporary pop choreography.",
    details: [
      "Multiple music show trophies achieved during promotion cycle.",
      "Praised for innovative stage costumes and traditional folklore-inspired art direction.",
      "Dual title track promotion with 'HEYA' and the dark fantasy 'Accendio'.",
    ],
    get image() {
      return getNewsImage("switch-heya-promotion");
    },
    tag: "Milestone",
    albumId: "ive-switch",
  },
  {
    id: "dive-global-archive",
    category: "Official",
    title: "IVE Official DIVE Digital Archive & Community",
    date: "2024-11-01",
    summary:
      "A dedicated platform for DIVEs to explore discography milestones, member journeys, and interactive track listening all in one place.",
    details: [
      "Comprehensive song catalog from debut 'ELEVEN' to latest mini albums.",
      "Detailed member profiles, birthday countdowns, and behind-the-scenes eras.",
      "Continuous sound and archive updates curated for fans.",
    ],
    get image() {
      return getNewsImage("dive-global-archive");
    },
    tag: "Archive",
  },
];

export const getNewsItem = (id: string) => {
  const item = newsItems.find((n) => n.id === id);
  if (!item) return undefined;
  return {
    ...item,
    image: getNewsImage(item.id),
  };
};
