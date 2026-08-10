import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { requireRole } from "@/lib/route-guards";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireRole(["admin"]),
  head: () => ({
    meta: [
      { title: "Admin — Lumen" },
      { name: "description", content: "Lumen admin workspace" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});