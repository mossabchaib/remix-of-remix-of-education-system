import { createFileRoute } from "@tanstack/react-router";
import { UserManagement } from "@/components/admin/UserManagement";
import { teachers } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/teachers")({
  component: () => (
    <UserManagement title="Teachers" description="Instructors creating and delivering courses." seed={teachers} restrictRole="Teacher" />
  ),
});
