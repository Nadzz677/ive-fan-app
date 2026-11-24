import { cn } from "@/lib/utils";

export const APEX_COLORS = {
  pink: "#ff3565",
  blue: "#1992ff",
  purple: "#a845ff",
  yellow: "#f5c43d",
  green: "#13c276",
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
    ? "bg-[#eef1fb] text-[#1e2554]"
    : "bg-[#1a214d] text-[#eef1ff]";

  const chromeBg = isLight
    ? "bg-white border-[#dce2f7]"
    : "bg-[#1e2659] border-[#2c3778]";

  const chromeHeaderBg = isLight
    ? "bg-white/95 border-[#dce2f7]"
    : "bg-[#1e2659]/95 border-[#2c3778]";

  const panelBg = isLight
    ? "bg-white border-[#e1e6f7] shadow-[0_8px_24px_-12px_rgba(30,38,89,0.12)]"
    : "bg-[#222c63] border-[#2e3a7d] shadow-[0_12px_32px_-12px_rgba(7,11,34,0.65)]";

  const subPanelBg = isLight
    ? "bg-[#f5f7fe] border-[#dce2f7]"
    : "bg-[#181f4a] border-[#2c3778]";

  const dividerClass = isLight ? "divide-[#e6eaf8]" : "divide-[#2c3778]/85";
  const borderClass = isLight ? "border-[#dce2f7]" : "border-[#2e3a7d]";
  const headingText = isLight ? "text-[#1e2554]" : "text-white";
  const subText = isLight ? "text-[#5e689e]" : "text-[#9aa5d9]";
  const mutedMonoText = isLight ? "text-[#7a84b8]" : "text-[#7e8ac4]";
  const rowHover = isLight ? "hover:bg-[#f4f6fd]" : "hover:bg-[#283373]/70";

  const secondaryBtn = isLight
    ? "border-[#d5dcf4] bg-white text-[#2e3870] hover:bg-[#f4f6fd] hover:border-[#bfc9ee]"
    : "border-[#34418a] bg-[#1a2252] text-[#d5dcff] hover:bg-[#283373] hover:text-white";

  const primaryBtn =
    "bg-gradient-to-r from-[#ff3d71] to-[#ff2662] text-white shadow-[0_6px_18px_-4px_rgba(255,45,104,0.55)] hover:brightness-110";

  const activeRowBg = isLight
    ? "bg-[#fff0f4] ring-1 ring-inset ring-[#ff3565]/30"
    : "bg-[#ff3565]/15 ring-1 ring-inset ring-[#ff3565]/35";

  const badgeNeutral = isLight
    ? "bg-[#eef1fb] text-[#424d88]"
    : "bg-[#181f4a] text-[#b4bef0]";

  const inputClass = cn(
    "w-full rounded-lg border px-3 py-2 text-xs outline-none transition-colors focus:border-[#ff3d71] focus:ring-1 focus:ring-[#ff3d71]/35",
    isLight
      ? "border-[#d2daf3] bg-[#f8f9fe] text-[#1e2554] placeholder:text-[#8992c2]"
      : "border-[#313e85] bg-[#171e46] text-white placeholder:text-[#6f7bb6]",
  );

  const labelClass = cn(
    "mb-1.5 block text-[11px] font-semibold tracking-wide",
    isLight ? "text-[#5e689e]" : "text-[#9aa5d9]",
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
