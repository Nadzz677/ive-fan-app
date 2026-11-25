const MAX_URL_LENGTH = 2048;

/**
 * Checks whether a hostname resolves to a loopback, private, link-local, or cloud metadata address.
 */
export function isPrivateOrLoopbackHost(rawHost: string): boolean {
  const host = rawHost.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "::" ||
    host.startsWith("fe80:") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    return true;
  }

  // IPv4 private / loopback / link-local ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const a = Number(ipv4Match[1]);
    const b = Number(ipv4Match[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  return false;
}

/**
 * Strictly validates that a URL uses `https:` on a public hostname (or an optional safe local `/...` path).
 * Blocks `http:`, `javascript:`, `data:`, `blob:`, `file:`, credentials-in-URL, and private/loopback IPs.
 */
export function sanitizeHttpsUrl(
  raw?: string | null,
  options?: { allowRelative?: boolean },
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

  // Reject control characters
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;

  if (options?.allowRelative && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.includes("..") || trimmed.includes("\\")) return null;
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    if (isPrivateOrLoopbackHost(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates optional Admin CMS URL fields. Empty strings are permitted (clears field);
 * non-empty strings must be valid public `https://` URLs.
 */
export function validateAdminHttpsInput(
  raw: string,
  fieldLabel: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: "" };
  const safe = sanitizeHttpsUrl(trimmed);
  if (!safe) {
    return {
      ok: false,
      error: `${fieldLabel} must be a valid public https:// URL.`,
    };
  }
  return { ok: true, value: safe };
}
