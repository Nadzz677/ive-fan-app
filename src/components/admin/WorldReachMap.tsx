import { useState } from "react";
import { APEX_COLORS } from "./apex-theme";

interface MapBeacon {
  id: string;
  region: string;
  detail: string;
  cx: number;
  cy: number;
}

const BEACONS: MapBeacon[] = [
  {
    id: "kr",
    region: "Seoul · South Korea",
    detail: "Starship HQ · Korean Releases",
    cx: 392,
    cy: 96,
  },
  {
    id: "jp",
    region: "Tokyo · Japan",
    detail: "Japanese EPs & Dome Tour",
    cx: 422,
    cy: 102,
  },
  {
    id: "na",
    region: "North America",
    detail: "English Singles & US Arena Tour",
    cx: 112,
    cy: 98,
  },
  {
    id: "sa",
    region: "Latin America",
    detail: "South America World Tour",
    cx: 158,
    cy: 186,
  },
  {
    id: "af",
    region: "EMEA & Africa",
    detail: "Global Streaming Distribution",
    cx: 266,
    cy: 152,
  },
  {
    id: "au",
    region: "Asia-Pacific & Oceania",
    detail: "APAC Tour & DIVE Hub",
    cx: 418,
    cy: 196,
  },
];

interface WorldReachMapProps {
  isLight: boolean;
}

/**
 * Apex-style two-tone SVG World Map (Coral-Pink Americas/Africa + Sky-Blue Europe/Asia/Oceania)
 * with glowing white-core + pink-halo beacons matching the Apex "Global" card.
 */
export function WorldReachMap({ isLight }: WorldReachMapProps) {
  const [activeId, setActiveId] = useState<string>("kr");
  const activeBeacon = BEACONS.find((b) => b.id === activeId) ?? BEACONS[0]!;

  return (
    <div className="relative flex h-full w-full flex-col justify-between">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-1 py-1">
        <svg
          viewBox="0 0 480 245"
          className="h-full max-h-[210px] w-full select-none"
          aria-label="Global reach map"
        >
          <defs>
            <radialGradient id="apex-beacon-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="38%" stopColor={APEX_COLORS.pink} stopOpacity="0.88" />
              <stop offset="100%" stopColor={APEX_COLORS.pink} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Subtle latitude / longitude backdrop lines */}
          <g
            stroke={isLight ? "#dce2f7" : "#2d387a"}
            strokeWidth="0.6"
            strokeDasharray="2 4"
            opacity="0.6"
          >
            <line x1="20" y1="60" x2="460" y2="60" />
            <line x1="20" y1="120" x2="460" y2="120" />
            <line x1="20" y1="180" x2="460" y2="180" />
            <line x1="130" y1="20" x2="130" y2="225" />
            <line x1="250" y1="20" x2="250" y2="225" />
            <line x1="370" y1="20" x2="370" y2="225" />
          </g>

          {/* CORAL-PINK HEMISPHERE: North America, Greenland, South America, Africa (matches Apex left & center-south pink continents) */}
          <g fill={APEX_COLORS.pink} opacity="0.95">
            {/* North America */}
            <path d="M 32,48 L 62,38 L 96,42 L 128,54 L 154,48 L 166,64 L 146,84 L 138,105 L 122,120 L 106,134 L 92,130 L 80,114 L 68,94 L 46,74 L 28,64 Z" />
            {/* Alaska & Northern Canada Islands */}
            <path d="M 16,52 L 30,44 L 38,56 L 22,62 Z M 112,26 L 144,22 L 156,34 L 126,40 Z" />
            {/* Greenland */}
            <path d="M 164,20 L 204,16 L 214,32 L 194,48 L 168,42 Z" />
            {/* Central America & Caribbean */}
            <path d="M 104,132 L 124,136 L 136,148 L 118,150 Z" />
            {/* South America */}
            <path d="M 132,148 L 164,146 L 190,164 L 196,184 L 178,214 L 156,232 L 144,226 L 142,196 L 128,170 Z" />
            {/* Africa */}
            <path d="M 228,108 L 262,104 L 290,116 L 306,136 L 298,162 L 286,194 L 268,208 L 254,196 L 248,168 L 226,144 L 218,124 Z" />
            {/* Madagascar */}
            <path d="M 304,178 L 312,174 L 314,192 L 304,194 Z" />
          </g>

          {/* SKY-BLUE HEMISPHERE: Europe, Asia, Japan, Korea, Southeast Asia, Australia (matches Apex right blue continents) */}
          <g fill={APEX_COLORS.blue} opacity="0.95">
            {/* UK & Scandinavia & Western Europe */}
            <path d="M 224,56 L 244,44 L 274,36 L 294,44 L 292,68 L 276,88 L 248,96 L 226,92 L 220,76 Z" />
            {/* Eurasia / Russia / China / Korea / India */}
            <path d="M 288,42 L 336,34 L 392,36 L 444,46 L 458,64 L 432,84 L 416,106 L 398,124 L 372,136 L 352,146 L 338,128 L 316,124 L 298,110 L 284,88 Z" />
            {/* Korean Peninsula & Japanese Archipelago highlight */}
            <path d="M 390,90 L 398,88 L 402,102 L 392,104 Z" />
            <path d="M 416,84 L 428,88 L 432,106 L 418,112 L 412,100 Z" />
            {/* Southeast Asia & Indonesia / Philippines */}
            <path d="M 366,144 L 392,146 L 408,162 L 386,168 L 364,158 Z M 412,152 L 434,158 L 436,168 L 414,166 Z" />
            {/* Australia & New Zealand */}
            <path d="M 384,176 L 424,172 L 446,188 L 444,212 L 416,222 L 386,210 L 378,192 Z" />
            <path d="M 454,214 L 466,208 L 468,222 L 456,226 Z" />
          </g>

          {/* Glowing Apex Circular Beacons */}
          {BEACONS.map((beacon) => {
            const isSelected = beacon.id === activeId;
            return (
              <g
                key={beacon.id}
                className="cursor-pointer"
                onMouseEnter={() => setActiveId(beacon.id)}
                onClick={() => setActiveId(beacon.id)}
              >
                {/* Outer radial glow */}
                <circle
                  cx={beacon.cx}
                  cy={beacon.cy}
                  r={isSelected ? 18 : 14}
                  fill="url(#apex-beacon-glow)"
                />
                {/* Translucent pink ring */}
                <circle
                  cx={beacon.cx}
                  cy={beacon.cy}
                  r={isSelected ? 10.5 : 8.5}
                  fill={APEX_COLORS.pink}
                  fillOpacity="0.45"
                  stroke={APEX_COLORS.pink}
                  strokeWidth="1.5"
                />
                {/* Crisp white inner core */}
                <circle
                  cx={beacon.cx}
                  cy={beacon.cy}
                  r={isSelected ? 5 : 4.2}
                  fill="#ffffff"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom active beacon caption pill */}
      <div className="flex items-center justify-between px-2 pt-1 text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#ff3565]">
          <span className="h-2 w-2 rounded-full bg-[#ff3565]" />
          {activeBeacon.region}
        </span>
        <span className={isLight ? "text-[#5e689e]" : "text-[#9aa5d9]"}>
          {activeBeacon.detail}
        </span>
      </div>
    </div>
  );
}
