import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminUsers, type ProfileData } from "@/lib/lms-storage";

type Role = "admin" | "teacher" | "student";
type UserRow = ProfileData & { id: string };

/**
 * getAdminUsers can return the array directly, or wrap it inside
 * `{ users }`, `{ data: { users } }`, or `{ data }`. Normalize all
 * shapes into a single flat array so the rest of the component only
 * ever deals with ProfileData[].
 */
function normalizeUsersResponse(response: unknown): ProfileData[] {
  if (Array.isArray(response)) return response;

  if (response && typeof response === "object") {
    const payload = response as Record<string, unknown>;

    if (Array.isArray(payload.users)) return payload.users as ProfileData[];

    if (payload.data && typeof payload.data === "object") {
      const data = payload.data as Record<string, unknown>;
      if (Array.isArray(data.users)) return data.users as ProfileData[];
    }

    if (Array.isArray(payload.data)) return payload.data as ProfileData[];
  }

  return [];
}

function getInitials(fullName?: string) {
  if (!fullName) return "?";
  return fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function UserManagement({
  title,
  description,
  restrictRole,
}: {
  title: string;
  description: string;
  restrictRole?: Role;
}) {
  const { t } = useTranslation();

  const [users, setUsers] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setHasError(false);

    try {
      const response = await getAdminUsers();
      setUsers(normalizeUsersResponse(response));
    } catch (error) {
      console.error("Failed to fetch admin users:", error);
      setHasError(true);
      setUsers([]);
      toast.error(t("admin.userManagement.fetchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const rows = useMemo(
    () =>
      (restrictRole ? users.filter((u) => u.role === restrictRole) : users).filter(
        (u): u is UserRow => Boolean(u?.id),
      ),
    [users, restrictRole],
  );

  const columns: Column<UserRow>[] = useMemo(
    () => [
      {
        key: "full_name",
        header: t("admin.user"),
        sortable: true,
        render: (u) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.full_name ?? ""} />}
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {getInitials(u.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {u.full_name || t("admin.userManagement.unnamedUser")}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "email",
        header: t("admin.email"),
        sortable: true,
        render: (u) => <span className="text-sm text-muted-foreground">{u.email}</span>,
      },
      {
        key: "role",
        header: t("admin.role"),
        sortable: true,
        render: (u) => (
          <Badge variant="outline" className="capitalize">
            {t(`admin.roles.${u.role}`, { defaultValue: u.role })}
          </Badge>
        ),
      },
    ],
    [t],
  );

  return (
    <>
      <PageHeader title={title} description={description} />

      {hasError && !loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">{t("admin.userManagement.fetchErrorTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("admin.userManagement.fetchErrorDescription")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("admin.userManagement.retry")}
          </Button>
        </div>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          loading={loading}
          searchKeys={["full_name", "email"]}
          emptyMessage={t("admin.userManagement.emptyState")}
          filters={
            restrictRole
              ? []
              : [
                  {
                    key: "role" as const,
                    label: t("admin.userManagement.roleFilterLabel"),
                    options: ["admin", "teacher", "student"],
                  },
                ]
          }
        />
      )}
    </>
  );
}