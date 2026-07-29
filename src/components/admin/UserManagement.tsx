import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { User } from "@/lib/mock-data";
import { UserService } from "@/services";
import { useAdminUsers } from "@/hooks/useAdminUsers";

export function UserManagement({
  title,
  description,
  restrictRole,
}: {
  title: string;
  description: string;
  /** Legacy prop kept for backward-compat; ignored (single source of truth is UserService). */
  seed?: User[];
  restrictRole?: User["role"];
}) {
  const { t } = useTranslation();
  const all = useAdminUsers();
  const rows = restrictRole ? all.filter((u) => u.role === restrictRole) : all;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const navigate = useNavigate();

  const columns: Column<User>[] = useMemo(
    () => [
      {
        key: "name",
        header: t("admin.user"),
        sortable: true,
        render: (u) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{u.name.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{u.name}</p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
          </div>
        ),
      },
      { key: "role", header: t("admin.role"), sortable: true, render: (u) => <Badge variant="outline">{u.role}</Badge> },
      { key: "status", header: t("common.status"), sortable: true, render: (u) => <StatusPill value={u.status} /> },
      { key: "joined", header: t("admin.joined"), sortable: true, render: (u) => <span className="text-sm text-muted-foreground">{u.joined}</span> },
    ],
    [t],
  );

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="me-1.5 h-4 w-4" /> {t("admin.addUser")}</Button>
            </DialogTrigger>
            <DialogContent>
              <UserForm
                initial={editing ?? undefined}
                restrictRole={restrictRole}
                onSubmit={(u) => {
                  if (editing) {
                    UserService.save({ ...editing, ...u });
                    toast.success(t("admin.userUpdated"));
                  } else {
                    UserService.create(u);
                    toast.success(t("admin.userAdded"));
                  }
                  setOpen(false);
                  setEditing(null);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        searchKeys={["name", "email"]}
        filters={[
          ...(restrictRole ? [] : [{ key: "role" as const, label: "Role", options: ["Admin", "Teacher", "Student"] }]),
          { key: "status", label: "Status", options: ["Active", "Suspended", "Pending"] },
        ]}
        onView={(u) => navigate({ to: "/admin/users/$id", params: { id: u.id } })}
        onEdit={(u) => { setEditing(u); setOpen(true); }}
        onDelete={(u) => { UserService.remove(u.id); toast.success(t("admin.userDeleted")); }}
      />
    </>
  );
}

function UserForm({
  initial,
  restrictRole,
  onSubmit,
}: {
  initial?: User;
  restrictRole?: User["role"];
  onSubmit: (u: Omit<User, "id">) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<User["role"]>(initial?.role ?? restrictRole ?? "Student");
  const [status, setStatus] = useState<User["status"]>(initial?.status ?? "Active");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? t("admin.editUser") : t("admin.addUser")}</DialogTitle>
        <DialogDescription>{t("admin.fillDetails")}</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name || !email) return toast.error(t("admin.allFieldsRequired"));
          onSubmit({ name, email, role, status, joined: initial?.joined ?? new Date().toISOString().slice(0, 10) });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="n">{t("admin.fullName")}</Label>
          <Input id="n" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e">{t("login.emailLabel")}</Label>
          <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {!restrictRole && (
            <div className="space-y-1.5">
              <Label>{t("admin.role")}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as User["role"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Admin","Teacher","Student"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as User["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Active","Suspended","Pending"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit"><Plus className="me-1.5 h-4 w-4" /> {t("common.saveChanges")}</Button>
        </DialogFooter>
      </form>
    </>
  );
}
