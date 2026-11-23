import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import type { FavoriteKind } from "@/types";
import type { Settings } from "./settings";
import { db } from "./firebase";

export interface UserDocData {
  favorites?: Record<FavoriteKind, string[]>;
  theme?: string;
  settings?: Settings;
  recentlyPlayed?: string[];
  updatedAt?: unknown;
}

let activeUid: string | null = null;
const uidListeners = new Set<(uid: string | null) => void>();

export function setActiveUserUid(uid: string | null) {
  activeUid = uid;
  uidListeners.forEach((listener) => listener(uid));
}

export function getActiveUserUid(): string | null {
  return activeUid;
}

export function onActiveUserUidChange(listener: (uid: string | null) => void): () => void {
  uidListeners.add(listener);
  return () => {
    uidListeners.delete(listener);
  };
}

export async function syncUserFields(
  uid: string | null,
  patch: Partial<UserDocData>,
): Promise<void> {
  if (!db || !uid) return;
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        ...patch,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("[Firestore] Failed to sync user fields:", err);
  }
}

export function subscribeUserDoc(
  uid: string | null,
  onData: (data: UserDocData) => void,
): () => void {
  if (!db || !uid) return () => {};
  return onSnapshot(
    doc(db, "users", uid),
    (snapshot) => {
      if (!snapshot.exists()) return;
      onData(snapshot.data() as UserDocData);
    },
    (err) => {
      console.warn("[Firestore] User doc subscription error:", err);
    },
  );
}
