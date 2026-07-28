import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  BellOff, 
  BookOpen, 
  Check, 
  ClipboardList, 
  Sparkles, 
  Video, 
  Trash2, 
  Award, 
  ShoppingBag,
  Bell
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { setNotifications, markNotificationRead, deleteNotification, type Notif } from "@/lib/lms-storage";
import { useNotifications } from "@/hooks/useNotifications";
import { EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/dashboard/student/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Student · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: StudentNotifications,
});

// تحديد الأيقونة المناسبة لنوع الحدث الخاص بالطالب
function getStudentNotifIcon(kind?: Notif["kind"]) {
  switch (kind) {
    case "course":
      return <BookOpen className="h-4 w-4 text-primary" />;
    case "live":
      return <Video className="h-4 w-4 text-blue-500" />;
    case "quiz":
    case "assignment":
      return <ClipboardList className="h-4 w-4 text-amber-500" />;
    case "grade":
    case "certificate":
      return <Award className="h-4 w-4 text-emerald-500" />;
    case "order":
      return <ShoppingBag className="h-4 w-4 text-indigo-500" />;
    default:
      return <Sparkles className="h-4 w-4 text-primary" />;
  }
}

function StudentNotifications() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { list: items, unread } = useNotifications();

  // فلترة القائمة حسب الخيار المختار
  const filteredItems = items.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title="Notifications"
        description={`${unread} unread · ${items.length} total`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNotifications(items.map((n) => ({ ...n, read: true })))}
              disabled={unread === 0}
            >
              <Check className="mr-1.5 h-4 w-4" /> Mark all read
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setNotifications([])} 
              disabled={items.length === 0}
            >
              <BellOff className="mr-1.5 h-4 w-4" /> Clear
            </Button>
          </div>
        }
      />

      {/* شريط الفلترة */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({items.length})
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
          description={filter === "unread" ? "All your notifications have been read." : "New activity and course updates will appear here."}
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
              {/* أيقونة نوع الإشعار */}
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft">
                {getStudentNotifIcon(n.kind)}
              </div>

              {/* محتوى الإشعار ورابطه */}
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

              {/* الأزرار والإجراءات */}
              <div className="flex items-center gap-1">
                {/* توجيه الطالب للرابط المتعلق بالحدث فور الضغط */}
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