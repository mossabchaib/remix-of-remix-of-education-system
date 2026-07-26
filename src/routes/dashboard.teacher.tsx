import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher workspace — Lumen" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <Outlet />,
});
