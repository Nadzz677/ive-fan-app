import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "./firebase";
import { resolveDirectAudioUrl } from "./player";

const AUDIO_CACHE_NAME = "ive-dive-archive-audio-v1";

// In-memory map of network URL -> local Blob ObjectURL for 0ms synchronous playback
const blobUrlCache = new Map<string, string>();
const inFlightPrefetches = new Set<string>();

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

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const storageRef = ref(storage, `tracks/${trackId}/${Date.now()}-${safeName}`);
  const durationPromise = probeAudioFileDuration(file);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || "audio/mpeg",
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
        if (blob.size > 1024) {
          blobUrlCache.set(resolved, URL.createObjectURL(blob));
          return;
        }
      }

      const response = await fetch(resolved, { mode: "cors", credentials: "omit" });
      if (response.ok) {
        await cache.put(resolved, response.clone());
        const blob = await response.blob();
        if (blob.size > 1024) {
          blobUrlCache.set(resolved, URL.createObjectURL(blob));
        }
      }
    }
  } catch {
    /* CORS-opaque or offline URLs still stream fine directly via <audio src={resolved}> */
  } finally {
    inFlightPrefetches.delete(resolved);
  }
}
