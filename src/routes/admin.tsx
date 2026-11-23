import { createFileRoute } from "@tanstack/react-router";
import { AdminStudioView } from "@/components/AdminStudioView";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin Studio — IVE: Dive Archive" }],
  }),
  component: AdminStudioView,
});
