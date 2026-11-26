import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "./firebase";
import { resolveDirectAudioUrl } from "./player";

const AUDIO_CACHE_NAME = "ive-dive-archive-audio-v1";
const MAX_CACHED_AUDIO_ENTRIES = 30;
const MAX_AUDIO_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED_AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
]);
const ALLOWED_AUDIO_EXT_RE = /\.(mp3|m4a|aac|wav|ogg|webm|flac)$/i;

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ALLOWED_IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif)$/i;

// Bounded in-memory map of network URL -> local Blob ObjectURL for 0ms synchronous playback
const blobUrlCache = new Map<string, string>();
const inFlightPrefetches = new Set<string>();

function setBoundedBlobUrl(networkUrl: string, objectUrl: string) {
  if (blobUrlCache.has(networkUrl)) {
    const prev = blobUrlCache.get(networkUrl);
    if (prev && prev !== objectUrl) {
      try {
        URL.revokeObjectURL(prev);
      } catch {
        /* ignore */
      }
    }
    blobUrlCache.delete(networkUrl);
  }
  while (blobUrlCache.size >= MAX_CACHED_AUDIO_ENTRIES) {
    const oldestKey = blobUrlCache.keys().next().value;
    if (!oldestKey) break;
    const oldestBlobUrl = blobUrlCache.get(oldestKey);
    blobUrlCache.delete(oldestKey);
    if (oldestBlobUrl) {
      try {
        URL.revokeObjectURL(oldestBlobUrl);
      } catch {
        /* ignore */
      }
    }
  }
  blobUrlCache.set(networkUrl, objectUrl);
}

/**
 * Helper to detect whether a track's `audioUrl` is a 30-second Apple/iTunes preview URL.
 */
export function isItunesPreviewUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes("itunes.apple.com") || lower.includes("mzstatic.com");
}

/**
 * Reads the exact duration (in seconds) of a local File or remote audio URL
 * using a temporary detached HTML5 <audio> element.
 */
export function probeAudioFileDuration(fileOrUrl: File | string): Promise<number | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const tempAudio = document.createElement("audio");
    tempAudio.preload = "metadata";
    const src = typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const shouldRevoke = typeof fileOrUrl !== "string";

    const cleanup = () => {
      tempAudio.onloadedmetadata = null;
      tempAudio.onerror = null;
      if (shouldRevoke) {
        try {
          URL.revokeObjectURL(src);
        } catch {
          /* ignore */
        }
      }
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, 6000);

    tempAudio.onloadedmetadata = () => {
      window.clearTimeout(timeoutId);
      const dur = tempAudio.duration;
      cleanup();
      if (dur && Number.isFinite(dur) && dur > 5) {
        resolve(Math.round(dur));
      } else {
        resolve(null);
      }
    };

    tempAudio.onerror = () => {
      window.clearTimeout(timeoutId);
      cleanup();
      resolve(null);
    };

    tempAudio.src = src;
  });
}

/**
 * Uploads a full-length .MP3 / .M4A / .WAV / .OGG audio file directly to Firebase Cloud Storage
 * (`tracks/<trackId>/<filename>`) and returns its permanent public CDN download URL + detected duration.
 */
export async function uploadTrackAudioToStorage(
  trackId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ downloadUrl: string; durationSeconds: number | null }> {
  if (!storage) {
    throw new Error(
      "Firebase Storage is not initialized. Check VITE_FIREBASE_STORAGE_BUCKET in .env.",
    );
  }

  if (file.size <= 0 || file.size > MAX_AUDIO_UPLOAD_BYTES) {
    throw new Error("Audio file must be greater than 0 bytes and at most 25 MB.");
  }
  const normalizedMime = file.type.trim().toLowerCase();
  if (
    !ALLOWED_AUDIO_EXT_RE.test(file.name) ||
    (normalizedMime && !ALLOWED_AUDIO_MIMES.has(normalizedMime))
  ) {
    throw new Error("Unsupported audio file format. Allowed: MP3, M4A, AAC, WAV, OGG, WEBM, FLAC.");
  }

  const safeTrackId =
    trackId
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "track";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
  const contentType = ALLOWED_AUDIO_MIMES.has(normalizedMime) ? normalizedMime : "audio/mpeg";
  const storageRef = ref(storage, `tracks/${safeTrackId}/${Date.now()}-${safeName}`);
  const durationPromise = probeAudioFileDuration(file);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType,
    cacheControl: "public, max-age=31536000, immutable",
  });

  const downloadUrl = await new Promise<string>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress?.(pct);
        }
      },
      (err) => {
        reject(err);
      },
      () => {
        void getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
      },
    );
  });

  const durationSeconds = await durationPromise;
  return { downloadUrl, durationSeconds };
}

/**
 * Uploads a Home Screen Hero Banner photo (.JPG / .PNG / .WEBP / .AVIF) directly to Firebase Cloud Storage
 * (`hero/<timestamp>-<filename>`) and returns its permanent public CDN download URL.
 */
export async function uploadHeroImageToStorage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (!storage) {
    throw new Error(
      "Firebase Storage is not initialized. Check VITE_FIREBASE_STORAGE_BUCKET in .env.",
    );
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Image file must be greater than 0 bytes and at most 8 MB.");
  }
  const normalizedMime = file.type.trim().toLowerCase();
  if (!ALLOWED_IMAGE_EXT_RE.test(file.name) || !ALLOWED_IMAGE_MIMES.has(normalizedMime)) {
    throw new Error("Unsupported image format. Allowed: JPG, PNG, WEBP, AVIF.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
  const storageRef = ref(storage, `hero/${Date.now()}-${safeName}`);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: normalizedMime,
    cacheControl: "public, max-age=31536000, immutable",
  });

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress?.(pct);
        }
      },
      (err) => reject(err),
      () => {
        void getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
      },
    );
  });
}

/**
 * On-Device Audio Cache & Next-Track Preloader (`CacheStorage`).
 * Returns a local `blob:` ObjectURL if the track is already cached on the phone/browser (0ms!),
 * or returns the resolved network URL while caching it in the background for next time.
 */
export function getInstantAudioSrc(rawAudioUrl?: string): string | null {
  const resolved = resolveDirectAudioUrl(rawAudioUrl);
  if (!resolved) return null;

  const cachedBlob = blobUrlCache.get(resolved);
  if (cachedBlob) return cachedBlob;

  void warmAudioCacheInBackground(resolved);
  return resolved;
}

export async function warmAudioCacheInBackground(rawAudioUrl?: string): Promise<void> {
  if (typeof window === "undefined") return;
  const resolved = resolveDirectAudioUrl(rawAudioUrl);
  if (!resolved) return;
  if (blobUrlCache.has(resolved) || inFlightPrefetches.has(resolved)) return;

  inFlightPrefetches.add(resolved);
  try {
    if ("caches" in window) {
      const cache = await window.caches.open(AUDIO_CACHE_NAME);
      const existing = await cache.match(resolved);
      if (existing) {
        const blob = await existing.blob();
        if (blob.size > 1024 && blob.size <= MAX_AUDIO_UPLOAD_BYTES) {
          setBoundedBlobUrl(resolved, URL.createObjectURL(blob));
          return;
        }
      }

      const response = await fetch(resolved, {
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (response.ok) {
        const contentLength = Number(response.headers.get("content-length") || "0");
        if (contentLength > MAX_AUDIO_UPLOAD_BYTES) return;

        const clone = response.clone();
        const blob = await response.blob();
        if (blob.size > 1024 && blob.size <= MAX_AUDIO_UPLOAD_BYTES) {
          const keys = await cache.keys();
          if (keys.length >= MAX_CACHED_AUDIO_ENTRIES) {
            const overflow = keys.length - MAX_CACHED_AUDIO_ENTRIES + 1;
            for (let i = 0; i < overflow; i++) {
              const req = keys[i];
              if (req) await cache.delete(req);
            }
          }
          await cache.put(resolved, clone);
          setBoundedBlobUrl(resolved, URL.createObjectURL(blob));
        }
      }
    }
  } catch {
    /* CORS-opaque or offline URLs still stream fine directly via <audio src={resolved}> */
  } finally {
    inFlightPrefetches.delete(resolved);
  }
}
