import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/student")({
  head: () => ({
    meta: [
      { title: "Student workspace — Lumen" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <Outlet />,
});
