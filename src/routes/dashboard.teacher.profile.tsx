import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "./dashboard.student.profile";

export const Route = createFileRoute("/dashboard/teacher/profile")({
  head: () => ({ meta: [{ title: "Profile — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: () => <ProfilePage role="teacher" />,
});
