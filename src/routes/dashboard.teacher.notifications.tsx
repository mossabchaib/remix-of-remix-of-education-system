import { createFileRoute } from "@tanstack/react-router";
import { BellOff, BookOpen, Check, ClipboardList, Sparkles, Video, Trash2 } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteNotification, markAllNotificationsRead, markNotificationRead, type Notif } from "@/lib/lms-storage";
import { useNotifications } from "@/hooks/useNotifications";
import { EmptyState } from "@/components/common/EmptyState";
import { AnnouncementComposer } from "@/components/notifications/AnnouncementComposer";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";

export const Route = createFileRoute("/dashboard/teacher/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherNotifications,
});

const iconFor = (k: Notif["kind"]) =>
  k === "course" || k === "lesson" ? BookOpen
  : k === "live" ? Video
  : k === "quiz" ? ClipboardList
  : Sparkles;

function TeacherNotifications() {
  const { list: items, unread } = useNotifications();
  const courses = useTeacherCourses();
  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Notifications"
        description={`${unread} unread · ${items.length} total`}
        actions={
          <div className="flex flex-wrap gap-2">
            <AnnouncementComposer
              presetScopes={["role-student", "course", "user"]}
              courseOptions={courses.map((c) => ({ id: c.id, title: c.title }))}
              defaultScope="role-student"
            />
            <Button variant="outline" size="sm" onClick={markAllNotificationsRead} disabled={unread === 0}>
              <Check className="mr-1.5 h-4 w-4" /> Mark all read
            </Button>
          </div>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={BellOff} title="You're all caught up" description="Announcements you send and automatic events will appear here." />
      ) : (
        <Card className="border-border/60 divide-y divide-border/60 shadow-card">
          {items.map((n) => {
            const Icon = iconFor(n.kind);
            return (
              <div key={n.id} className={cn("group flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40", !n.read && "bg-primary-soft/40")}>
                <button
                  onClick={() => markNotificationRead(n.id, true)}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"
                  aria-label="Mark read"
                >
                  <Icon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => markNotificationRead(n.id, !n.read)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.at}</p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => deleteNotification(n.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </Card>
      )}
    </RoleDashboardLayout>
  );
}
