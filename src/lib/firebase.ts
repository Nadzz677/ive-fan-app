import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const env = import.meta.env as Record<string, string | undefined>;

const apiKey = env["VITE_FIREBASE_API_KEY"]?.trim();
const authDomain = env["VITE_FIREBASE_AUTH_DOMAIN"]?.trim();
const projectId = env["VITE_FIREBASE_PROJECT_ID"]?.trim();
const storageBucket = env["VITE_FIREBASE_STORAGE_BUCKET"]?.trim();
const messagingSenderId = env["VITE_FIREBASE_MESSAGING_SENDER_ID"]?.trim();
const appId = env["VITE_FIREBASE_APP_ID"]?.trim();

/**
 * True when the minimum Firebase environment variables are present.
 * When false, the app gracefully runs on static catalog data + localStorage.
 */
export const isFirebaseConfigured = Boolean(apiKey && projectId);

const firebaseConfig = {
  ...(apiKey ? { apiKey } : {}),
  ...(authDomain ? { authDomain } : {}),
  ...(projectId ? { projectId } : {}),
  ...(storageBucket ? { storageBucket } : {}),
  ...(messagingSenderId ? { messagingSenderId } : {}),
  ...(appId ? { appId } : {}),
};

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let firebaseAuth: Auth | null = null;

if (typeof window !== "undefined" && isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firestore = getFirestore(app);
  firebaseAuth = getAuth(app);
}

export const firebaseApp = app;
export const db = firestore;
export const auth = firebaseAuth;
