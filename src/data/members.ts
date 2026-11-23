import type { Member } from "@/types";
import { getMemberImage } from "@/data/imageAssets";

/**
 * Static member data. Only publicly documented facts are stored here — keep it
 * that way when extending (no invented personal details).
 */
export const members: Member[] = [
  {
    id: "yujin",
    name: "An Yujin",
    koreanName: "안유진",
    fullName: "An Yu-jin",
    nationality: "South Korean",
    birthday: "2003-09-01",
    position: "Leader, Vocalist",
    birthYear: 2003,
    tagline: "The steady centre of the group",
    bio: "Yujin leads IVE with a warm, unshakeable presence. Known for her stage command and bright vocal tone, she anchors the group's live performances and variety appearances.",
    journey:
      "Yujin debuted as a member of IZ*ONE in 2018 after competing on Produce 48, then debuted again with IVE in December 2021 as the group's leader. She has led every IVE comeback since, and is also active as a music-show and variety host.",
    facts: [
      "Leader of IVE since the group's 2021 debut.",
      "Former member of the project group IZ*ONE (2018–2021).",
      "Trained under Starship Entertainment before her first debut.",
      "Frequently appears as a music-show and awards host.",
    ],
    color: "270 85% 62%",
    get image() {
      return getMemberImage("yujin");
    },
  },
  {
    id: "gaeul",
    name: "Gaeul",
    koreanName: "가을",
    fullName: "Kim Ga-eul",
    nationality: "South Korean",
    birthday: "2002-09-24",
    position: "Main Rapper, Dancer",
    birthYear: 2002,
    tagline: "Sharp lines, sharper delivery",
    bio: "Gaeul brings the crisp rap verses and dance precision that give IVE choreography its edge. The eldest member, she is often described as the group's calm strategist.",
    journey:
      "Gaeul is the oldest member of IVE and debuted with the group in December 2021. She handles the majority of IVE's rap parts and has become a fixture of the group's dance-focused stages and fashion appearances.",
    facts: [
      "The eldest member of IVE.",
      "Takes the main rap position in IVE's title tracks.",
      "Known for dance-practice and choreography-focused content.",
    ],
    color: "185 70% 52%",
    get image() {
      return getMemberImage("gaeul");
    },
  },
  {
    id: "rei",
    name: "Rei",
    koreanName: "레이",
    fullName: "Naoi Rei",
    nationality: "Japanese",
    birthday: "2004-02-03",
    position: "Rapper, Vocalist",
    birthYear: 2004,
    tagline: "Playful energy with a soft rasp",
    bio: "Rei's distinctive tone and bilingual charm make her one of IVE's most recognisable voices. She writes lyrics and shapes much of the group's lighter, cheerful moments.",
    journey:
      "Rei joined IVE as its Japanese member and debuted in December 2021. She contributes rap and vocal parts, has taken part in writing lyrics for IVE songs, and often leads the group's Japanese-language promotions.",
    facts: [
      "The Japanese member of IVE.",
      "Has participated in writing lyrics for IVE releases.",
      "Speaks Japanese, Korean and English in group content.",
    ],
    color: "340 85% 68%",
    get image() {
      return getMemberImage("rei");
    },
  },
  {
    id: "wonyoung",
    name: "Jang Wonyoung",
    koreanName: "장원영",
    fullName: "Jang Won-Young",
    nationality: "South Korean",
    birthday: "2004-08-31",
    position: "Centre, Vocalist, Dancer",
    birthYear: 2004,
    tagline: "Visual centre and stage presence",
    bio: "Wonyoung is IVE's centre, known worldwide for her stage aura and precise performance lines. Her expressive delivery defines the visual language of the group's title tracks.",
    journey:
      "Wonyoung placed first on Produce 48 and debuted as the centre of IZ*ONE in 2018. She re-debuted with IVE in December 2021 and holds the centre position, and is one of the most in-demand brand ambassadors in K-pop.",
    facts: [
      "Placed first on Produce 48 and centred IZ*ONE.",
      "Holds the centre position in IVE.",
      "Ambassador for several global fashion and beauty brands.",
    ],
    color: "40 80% 65%",
    get image() {
      return getMemberImage("wonyoung");
    },
  },
  {
    id: "liz",
    name: "Liz",
    koreanName: "리즈",
    fullName: "Kim Ji-won",
    nationality: "South Korean",
    birthday: "2004-11-21",
    position: "Main Vocalist",
    birthYear: 2004,
    tagline: "Crystalline high notes",
    bio: "Liz carries many of IVE's most delicate vocal lines, with a clear, airy timbre that cuts through dense productions. A frequent choice for OST features.",
    journey:
      "Liz debuted with IVE in December 2021 as a main vocalist. She takes many of the group's highest vocal lines and has recorded solo OST and cover performances alongside IVE activities.",
    facts: [
      "One of IVE's main vocalists.",
      "Has released OST and cover vocal performances.",
      "Known for handling the high notes in live stages.",
    ],
    color: "205 85% 62%",
    get image() {
      return getMemberImage("liz");
    },
  },
  {
    id: "leeseo",
    name: "Leeseo",
    koreanName: "이서",
    fullName: "Lee Hyunseo",
    nationality: "South Korean",
    birthday: "2007-02-21",
    position: "Maknae, Vocalist, Dancer",
    birthYear: 2007,
    tagline: "Youngest, boldest performer",
    bio: "Leeseo joined IVE as the youngest member and has grown into a confident performer with striking dance ability and a rich lower register.",
    journey:
      "Leeseo debuted with IVE in December 2021 as the youngest member, aged 14. Across the group's releases she has taken on progressively larger vocal and dance parts, and has also appeared as a host and in acting-adjacent projects.",
    facts: [
      "The maknae (youngest member) of IVE.",
      "Debuted at 14 years old.",
      "Known for her lower vocal register and dance parts.",
    ],
    color: "285 75% 70%",
    get image() {
      return getMemberImage("leeseo");
    },
  },
];

export const getMember = (id: string) => {
  const member = members.find((m) => m.id === id);
  if (!member) return undefined;
  return {
    ...member,
    image: getMemberImage(member.id),
  };
};
