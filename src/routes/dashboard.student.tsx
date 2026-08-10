import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";

export const Route = createFileRoute("/dashboard/student")({
  beforeLoad: () => requireRole(["student"]),
  head: () => ({
    meta: [
      { title: "Student workspace — Lumen" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <Outlet />,
});