import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Bell, 
  BookOpen, 
  Check, 
  ClipboardList, 
  Sparkles, 
  Video, 
  Trash2, 
  DollarSign, 
  UserCheck 
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deleteNotification, markAllNotificationsRead, markNotificationRead, type Notif } from "@/lib/lms-storage";
import { useNotifications } from "@/hooks/useNotifications";
import { EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/dashboard/teacher/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherNotifications,
});

// تحديد الأيقونة المناسبة لأحداث المعلم
function getTeacherNotifIcon(kind?: Notif["kind"]) {
  switch (kind) {
    case "order":
    case "revenue":
      return <DollarSign className="h-4 w-4 text-emerald-500" />;
    case "enrollment":
      return <UserCheck className="h-4 w-4 text-blue-500" />;
    case "live":
      return <Video className="h-4 w-4 text-indigo-500" />;
    case "quiz":
    case "assignment":
    case "submission":
      return <ClipboardList className="h-4 w-4 text-amber-500" />;
    case "course":
    case "lesson":
      return <BookOpen className="h-4 w-4 text-primary" />;
    default:
      return <Sparkles className="h-4 w-4 text-primary" />;
  }
}

function TeacherNotifications() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { list: items, unread } = useNotifications();

  // تصفية الإشعارات واستبعاد الإعلانات اليدوية إن وجدت
  const teacherEvents = items.filter((n) => n.kind !== "announcement");

  const filteredItems = teacherEvents.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Notifications"
        description={`${unread} unread · ${teacherEvents.length} total`}
        actions={
          unread > 0 ? (
            <Button variant="outline" size="sm" onClick={markAllNotificationsRead}>
              <Check className="mr-1.5 h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {/* شريط الفلترة */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({teacherEvents.length})
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          Unread ({unread})
        </Button>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState 
          icon={Bell} 
          title={filter === "unread" ? "No unread notifications" : "You're all caught up"} 
          description={filter === "unread" ? "All notifications have been marked as read." : "Automatic course events, sales, and student submissions will appear here."} 
        />
      ) : (
        <Card className="border-border/60 divide-y divide-border/60 shadow-card">
          {filteredItems.map((n) => (
            <div 
              key={n.id} 
              className={cn(
                "group flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40", 
                !n.read && "bg-primary-soft/30"
              )}
            >
              {/* أيقونة نوع الحدث */}
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft">
                {getTeacherNotifIcon(n.kind)}
              </div>

              {/* تفاصيل الإشعار */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  {n.kind && (
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {n.kind}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.at}</p>
              </div>

              {/* الإجراءات والروابط */}
              <div className="flex items-center gap-1">
                {n.link && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    onClick={() => markNotificationRead(n.id, true)}
                  >
                    <Link to={n.link}>Open</Link>
                  </Button>
                )}
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markNotificationRead(n.id, true)}
                  >
                    Mark read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => deleteNotification(n.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </RoleDashboardLayout>
  );
}