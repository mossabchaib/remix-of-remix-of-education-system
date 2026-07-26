import { createFileRoute } from "@tanstack/react-router";
import { UserManagement } from "@/components/admin/UserManagement";
import { students } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/students")({
  component: () => (
    <UserManagement title="Students" description="Enrolled learners across your platform." seed={students} restrictRole="Student" />
  ),
});
