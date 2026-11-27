import { lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import { createFileRoute, Navigate } from "@tanstack/react-router";

const LazyStudioWorkspaceView = lazy(() =>
  import("@/components/StudioWorkspaceView").then((m) => ({ default: m.StudioWorkspaceView })),
);

function StudioRouteComponent() {
  // Never expose the Studio Console inside the native mobile APK
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#1f262d] font-mono text-xs uppercase tracking-[0.22em] text-[#90a0b0]">
          Loading Workspace…
        </div>
      }
    >
      <LazyStudioWorkspaceView />
    </Suspense>
  );
}

export const Route = createFileRoute("/dive-studio-677")({
  head: () => ({
    meta: [{ title: "D.I.V.E. Workspace" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: StudioRouteComponent,
});
