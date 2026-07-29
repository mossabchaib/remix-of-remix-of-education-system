import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { UserManagement } from "@/components/admin/UserManagement";
import { users } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/users/")({
  component: UsersAdmin,
});

function UsersAdmin() {
  const { t } = useTranslation();
  return (
    <UserManagement title={t("admin.users")} description={t("admin.usersDesc")} seed={users} />
  );
}
