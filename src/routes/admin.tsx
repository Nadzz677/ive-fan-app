import { lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import { createFileRoute, Navigate } from "@tanstack/react-router";

const LazyAdminStudioView = lazy(() =>
  import("@/components/AdminStudioView").then((m) => ({ default: m.AdminStudioView })),
);

function AdminRouteComponent() {
  // Never expose the Admin Console inside the native mobile APK
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#1f262d] font-mono text-xs uppercase tracking-[0.22em] text-[#90a0b0]">
          Loading Admin Studio…
        </div>
      }
    >
      <LazyAdminStudioView />
    </Suspense>
  );
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Studio — IVE: Dive Archive" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRouteComponent,
});
