import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { UserManagement } from "@/components/admin/UserManagement";
import { students } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/students")({
  component: StudentsAdmin,
});

function StudentsAdmin() {
  const { t } = useTranslation();
  return (
    <UserManagement title={t("admin.students")} description={t("admin.studentsDesc")} seed={students} restrictRole="Student" />
  );
}
