export function formatDuration(seconds: number) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseCalendarDate(iso: string): Date | null {
  if (!iso) return null;
  const ymd = iso.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]) - 1;
    const day = Number(ymd[3]);
    const local = new Date(year, month, day);
    if (!Number.isNaN(local.getTime())) return local;
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatReleaseDate(iso: string) {
  const d = parseCalendarDate(iso);
  if (!d) return iso || "TBA";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function releaseYear(iso: string) {
  const match = iso?.trim().match(/^(\d{4})/);
  if (match?.[1]) return match[1];
  const d = parseCalendarDate(iso);
  return d ? d.getFullYear().toString() : "Archive";
}
