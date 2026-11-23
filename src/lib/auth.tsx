import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import { setActiveUserUid } from "./firestore-user";

export const ADMIN_UID = "y0vz40TxTze8W225zMK7As8o4Uz2";
const ONBOARDING_SEEN_KEY = "ive-dive-archive:onboarding-seen";

interface AuthContextValue {
  uid: string | null;
  email: string | null;
  isAnonymous: boolean;
  isAdmin: boolean;
  loading: boolean;
  isCloudEnabled: boolean;
  hasCompletedOnboarding: boolean;
  isPreviewingFanApp: boolean;
  error: string | null;
  completeOnboarding: () => void;
  replayOnboarding: () => void;
  setPreviewingFanApp: (preview: boolean) => void;
  signInAdmin: (email: string, password: string) => Promise<void>;
  signOutAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readOnboardingFlag(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ONBOARDING_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

function writeOnboardingFlag(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    else window.localStorage.removeItem(ONBOARDING_SEEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(readOnboardingFlag);
  const [isPreviewingFanApp, setPreviewingFanApp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) {
      setActiveUserUid(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        if (user) {
          setUid(user.uid);
          setEmail(user.email);
          setIsAnonymous(user.isAnonymous);
          setActiveUserUid(user.uid);
          setError(null);
          setLoading(false);
        } else {
          // Silently start an anonymous guest session so the fan app works with zero sign-in friction
          signInAnonymously(firebaseAuth).catch((err: unknown) => {
            const message =
              err instanceof Error ? err.message : "Failed to start anonymous Firebase session";
            setError(message);
            setLoading(false);
          });
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const completeOnboarding = useCallback(() => {
    writeOnboardingFlag(true);
    setHasCompletedOnboarding(true);
  }, []);

  const replayOnboarding = useCallback(() => {
    writeOnboardingFlag(false);
    setHasCompletedOnboarding(false);
  }, []);

  const signInAdmin = useCallback(async (adminEmail: string, password: string) => {
    const firebaseAuth = auth;
    if (!firebaseAuth) {
      throw new Error("Firebase is not configured.");
    }
    const cred = await signInWithEmailAndPassword(firebaseAuth, adminEmail.trim(), password);
    if (cred.user.uid !== ADMIN_UID) {
      await signOut(firebaseAuth);
      throw new Error("This account does not have Admin permissions.");
    }
  }, []);

  const signOutAdmin = useCallback(async () => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    setPreviewingFanApp(false);
    await signOut(firebaseAuth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      uid,
      email,
      isAnonymous,
      isAdmin: Boolean(uid && uid === ADMIN_UID),
      loading,
      isCloudEnabled: isFirebaseConfigured && Boolean(uid),
      hasCompletedOnboarding,
      isPreviewingFanApp,
      error,
      completeOnboarding,
      replayOnboarding,
      setPreviewingFanApp,
      signInAdmin,
      signOutAdmin,
    }),
    [
      uid,
      email,
      isAnonymous,
      loading,
      hasCompletedOnboarding,
      isPreviewingFanApp,
      error,
      completeOnboarding,
      replayOnboarding,
      signInAdmin,
      signOutAdmin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
