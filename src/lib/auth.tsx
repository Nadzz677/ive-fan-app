import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import { setActiveUserUid } from "./firestore-user";

const FALLBACK_ADMIN_UID =
  (import.meta.env["VITE_ADMIN_UID"] as string | undefined)?.trim() ||
  "y0vz40TxTze8W225zMK7As8o4Uz2";
const ONBOARDING_SEEN_KEY = "ive-dive-archive:onboarding-seen";
const GENERIC_AUTH_ERROR = "Invalid credentials or insufficient permissions.";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;

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
  const [isAdminState, setIsAdminState] = useState(false);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(readOnboardingFlag);
  const [isPreviewingFanApp, setPreviewingFanApp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const failedAttemptsRef = useRef(0);
  const lockoutUntilRef = useRef(0);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) {
      setActiveUserUid(null);
      setIsAdminState(false);
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

          if (user.isAnonymous) {
            setIsAdminState(false);
            setLoading(false);
          } else if (user.uid === FALLBACK_ADMIN_UID) {
            setIsAdminState(true);
            setLoading(false);
          } else {
            void user
              .getIdTokenResult()
              .then((tokenResult) => {
                setIsAdminState(tokenResult.claims["admin"] === true);
              })
              .catch(() => {
                setIsAdminState(false);
              })
              .finally(() => {
                setLoading(false);
              });
          }
        } else {
          setIsAdminState(false);
          // Silently start an anonymous guest session so the fan app works with zero sign-in friction
          signInAnonymously(firebaseAuth).catch(() => {
            setError("Unable to initialize cloud session.");
            setLoading(false);
          });
        }
      },
      () => {
        setIsAdminState(false);
        setError("Authentication state check failed.");
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
      throw new Error("Cloud authentication is not configured.");
    }

    const now = Date.now();
    if (now < lockoutUntilRef.current) {
      const waitSec = Math.max(1, Math.ceil((lockoutUntilRef.current - now) / 1000));
      throw new Error(`Too many sign-in attempts. Please wait ${waitSec}s and try again.`);
    }

    const normalizedEmail = adminEmail.trim();
    if (!normalizedEmail || !password) {
      throw new Error(GENERIC_AUTH_ERROR);
    }

    try {
      const cred = await Promise.race([
        signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password),
        new Promise<never>((_, reject) => {
          window.setTimeout(
            () =>
              reject(
                new Error(
                  "Sign-in timed out. Check your connection or browser shields and try again.",
                ),
              ),
            15_000,
          );
        }),
      ]);
      let authorized = cred.user.uid === FALLBACK_ADMIN_UID;
      if (!authorized) {
        const tokenResult = await cred.user.getIdTokenResult().catch(() => null);
        authorized = tokenResult?.claims["admin"] === true;
      }

      if (!authorized) {
        await signOut(firebaseAuth);
        failedAttemptsRef.current += 1;
        if (failedAttemptsRef.current >= MAX_FAILED_ATTEMPTS) {
          lockoutUntilRef.current = Date.now() + LOCKOUT_DURATION_MS;
          failedAttemptsRef.current = 0;
        }
        throw new Error(GENERIC_AUTH_ERROR);
      }

      failedAttemptsRef.current = 0;
      lockoutUntilRef.current = 0;
    } catch (err: unknown) {
      const code = (err as { code?: string } | null)?.code ?? "";
      if (code === "auth/too-many-requests") {
        lockoutUntilRef.current = Date.now() + LOCKOUT_DURATION_MS;
        throw new Error("Too many sign-in attempts. Please wait before trying again.");
      }
      if (err instanceof Error && err.message.startsWith("Sign-in timed out.")) {
        throw err;
      }
      if (err instanceof Error && err.message === GENERIC_AUTH_ERROR) {
        throw err;
      }
      failedAttemptsRef.current += 1;
      if (failedAttemptsRef.current >= MAX_FAILED_ATTEMPTS) {
        lockoutUntilRef.current = Date.now() + LOCKOUT_DURATION_MS;
        failedAttemptsRef.current = 0;
      }
      throw new Error(GENERIC_AUTH_ERROR);
    }
  }, []);

  const signOutAdmin = useCallback(async () => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    setPreviewingFanApp(false);
    setIsAdminState(false);
    await signOut(firebaseAuth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      uid,
      email,
      isAnonymous,
      isAdmin: isAdminState,
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
      isAdminState,
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
