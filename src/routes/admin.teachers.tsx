import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { UserManagement } from "@/components/admin/UserManagement";
import { teachers } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/teachers")({
  component: TeachersAdmin,
});

function TeachersAdmin() {
  const { t } = useTranslation();
  return (
    <UserManagement title={t("admin.teachers")} description={t("admin.teachersDesc")} seed={teachers} restrictRole="Teacher" />
  );
}
