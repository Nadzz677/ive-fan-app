import { cn } from "@/lib/utils";

/**
 * M.R.A. Reference Color Palette (from media_1795593444624_217181ba.jpg):
 * - Sidebar / Chrome: Matte Slate-Petrol `#22303c`
 * - Active Sidebar Pill: Pure White `#ffffff` with `#1b242d` dark charcoal text/icon
 * - Workspace Canvas: Deep Matte Charcoal-Slate `#1f262d`
 * - Card / Panel Surface: Elevated Dark Charcoal `#181e24`
 * - Search / Recessed Inputs: `#252e37`
 * - Primary Accent: Mint-Aqua Teal `#5ce1b8`
 * - Secondary / Badge Accent: Coral-Rose `#e04f67`
 * - Tertiary Tag Accent: Soft Periwinkle-Lavender `#c9c4f6`
 */
export const MRA_COLORS = {
  mint: "#5ce1b8",
  coral: "#e04f67",
  lavender: "#c9c4f6",
  amber: "#f5c43d",
} as const;

export interface AdminTheme {
  isLight: boolean;
  shellBg: string;
  chromeBg: string;
  chromeHeaderBg: string;
  panelBg: string;
  subPanelBg: string;
  dividerClass: string;
  borderClass: string;
  headingText: string;
  subText: string;
  mutedMonoText: string;
  rowHover: string;
  secondaryBtn: string;
  primaryBtn: string;
  activeRowBg: string;
  badgeNeutral: string;
  inputClass: string;
  labelClass: string;
}

export function getAdminTheme(isLight: boolean): AdminTheme {
  const shellBg = isLight
    ? "bg-[#f3f5f8] text-[#1b242d]"
    : "bg-[#1f262d] text-[#eef3f7]";

  const chromeBg = isLight
    ? "bg-[#22303c] border-[#2c3c4a] text-[#eef3f7]"
    : "bg-[#22303c] border-[#2c3c4a]";

  const chromeHeaderBg = isLight
    ? "bg-white/95 border-[#dfe5ec]"
    : "bg-[#1f262d]/95 border-[#2a343e]";

  const panelBg = isLight
    ? "bg-white border-[#e2e7ee] shadow-[0_8px_24px_-12px_rgba(24,30,36,0.08)]"
    : "bg-[#181e24] border-[#26303a] shadow-[0_14px_34px_-14px_rgba(0,0,0,0.65)]";

  const subPanelBg = isLight
    ? "bg-[#f6f8fa] border-[#dfe5ec]"
    : "bg-[#222a32] border-[#2f3a46]";

  const dividerClass = isLight ? "divide-[#e6ebf0]" : "divide-[#26303a]";
  const borderClass = isLight ? "border-[#dfe5ec]" : "border-[#28323c]";
  const headingText = isLight ? "text-[#181e24]" : "text-white";
  const subText = isLight ? "text-[#5f6e7d]" : "text-[#94a3b3]";
  const mutedMonoText = isLight ? "text-[#7c8b99]" : "text-[#6e7d8c]";
  const rowHover = isLight ? "hover:bg-[#f4f7f9]" : "hover:bg-[#202830]";

  const secondaryBtn = isLight
    ? "border-[#d5dde6] bg-white text-[#22303c] hover:bg-[#f3f5f8] hover:border-[#bcc8d4]"
    : "border-[#313d49] bg-[#222a32] text-[#d3dde6] hover:bg-[#2a343e] hover:text-white";

  const primaryBtn =
    "bg-[#5ce1b8] text-[#142026] font-semibold shadow-[0_6px_18px_-4px_rgba(92,225,184,0.42)] hover:bg-[#4dd4aa]";

  const activeRowBg = isLight
    ? "bg-[#5ce1b8]/15 ring-1 ring-inset ring-[#5ce1b8]/45"
    : "bg-[#5ce1b8]/12 ring-1 ring-inset ring-[#5ce1b8]/35";

  const badgeNeutral = isLight
    ? "bg-[#eef2f6] text-[#3b4a58]"
    : "bg-[#252e37] text-[#b8c5d1]";

  const inputClass = cn(
    "w-full rounded-xl border px-3 py-2 text-xs outline-none transition-colors focus:border-[#5ce1b8] focus:ring-1 focus:ring-[#5ce1b8]/35",
    isLight
      ? "border-[#d5dde6] bg-[#f8fafc] text-[#181e24] placeholder:text-[#8a99a8]"
      : "border-[#313d49] bg-[#252e37] text-[#eef3f7] placeholder:text-[#738291]",
  );

  const labelClass = cn(
    "mb-1.5 block text-[11px] font-semibold tracking-wide",
    isLight ? "text-[#5f6e7d]" : "text-[#94a3b3]",
  );

  return {
    isLight,
    shellBg,
    chromeBg,
    chromeHeaderBg,
    panelBg,
    subPanelBg,
    dividerClass,
    borderClass,
    headingText,
    subText,
    mutedMonoText,
    rowHover,
    secondaryBtn,
    primaryBtn,
    activeRowBg,
    badgeNeutral,
    inputClass,
    labelClass,
  };
}
