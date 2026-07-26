import { createFileRoute } from "@tanstack/react-router";
import { Megaphone, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deleteNotification, type Notif } from "@/lib/lms-storage";
import { useKeyedStorage } from "@/hooks/useKeyedStorage";
import { storageKeys, getNotifications } from "@/lib/lms-storage";
import { EmptyState } from "@/components/common/EmptyState";
import { AnnouncementComposer } from "@/components/notifications/AnnouncementComposer";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Admin · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: AdminAnnouncements,
});

function audienceLabel(a: Notif["audience"]) {
  if (!a) return "Students";
  if (a.scope === "all") return "Everyone";
  if (a.scope === "role") return `All ${a.role}s`;
  if (a.scope === "course") return `Course ${a.courseId}`;
  return `User ${a.userId}`;
}

function AdminAnnouncements() {
  const list = useKeyedStorage(storageKeys.notifications, getNotifications);
  const announcements = list.filter((n) => n.kind === "announcement" || n.kind === "system");

  return (
    <AdminLayout>
      <PageHeader
        title="Announcements"
        description="Send platform-wide announcements, maintenance notices and role updates."
        actions={
          <AnnouncementComposer
            presetScopes={["all", "role-student", "role-teacher", "user"]}
            defaultScope="all"
          />
        }
      />
      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Compose your first platform announcement." />
      ) : (
        <Card className="border-border/60 divide-y divide-border/60 shadow-card">
          {announcements.map((n) => (
            <div key={n.id} className={cn("flex items-start gap-3 p-4", !n.read && "bg-primary-soft/30")}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  <Badge variant="outline">{audienceLabel(n.audience)}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.at}{n.createdBy ? ` · ${n.createdBy.name}` : ""}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteNotification(n.id)} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </Card>
      )}
    </AdminLayout>
  );
}
