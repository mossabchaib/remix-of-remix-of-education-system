import { createFileRoute } from "@tanstack/react-router";
import { UserManagement } from "@/components/admin/UserManagement";
import { users } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/users")({
  component: () => (
    <UserManagement title="Users" description="Manage all people with access to your workspace." seed={users} />
  ),
});
