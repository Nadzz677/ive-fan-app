import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { useRouter } from "@tanstack/react-router";
import { usePlayerControls } from "@/lib/player";

/**
 * Intercepts Android's hardware/gesture back button inside Capacitor:
 * 1. Allows topmost overlays listening to `ive:android-back` (Fullscreen Lyrics, News modal) to close first.
 * 2. Minimizes the full-screen ExpandedPlayer if open.
 * 3. Navigates back in TanStack Router history (or falls back to Home).
 * 4. Exits the app only when already on Home with no overlays open.
 */
export function AndroidBackHandler() {
  const router = useRouter();
  const { expanded, setExpanded } = usePlayerControls();
  const expandedRef = useRef(expanded);

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      // 1. Let active topmost sub-overlays (Fullscreen Lyrics, News Details modal) consume Back first
      const backEvent = new CustomEvent("ive:android-back", { cancelable: true });
      const notCancelled = window.dispatchEvent(backEvent);
      if (!notCancelled) {
        return;
      }

      // 2. Minimize the full-screen music player if open
      if (expandedRef.current) {
        setExpanded(false);
        return;
      }

      // 3. Navigate back if not on Home, or exit cleanly from Home
      const pathname = router.state.location.pathname;
      if (pathname !== "/") {
        if (canGoBack || window.history.length > 1) {
          router.history.back();
        } else {
          void router.navigate({ to: "/" });
        }
        return;
      }

      void CapacitorApp.exitApp();
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, [router, setExpanded]);

  return null;
}
