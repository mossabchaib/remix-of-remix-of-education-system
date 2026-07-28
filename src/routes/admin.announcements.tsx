import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Trash2, DollarSign, UserCheck, ShieldAlert, ShoppingBag, AlertTriangle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deleteNotification, markNotificationRead, markAllNotificationsRead, type Notif } from "@/lib/lms-storage";
import { useKeyedStorage } from "@/hooks/useKeyedStorage";
import { storageKeys, getNotifications } from "@/lib/lms-storage";
import { EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Notifications — Admin · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: AdminNotifications,
});

// اختيار الأيقونة المناسبة لنوع إشعار الأحداث
function getNotificationIcon(kind?: string) {
  switch (kind) {
    case "payout":
      return <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case "verification":
      return <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case "order":
      return <ShoppingBag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
    case "system":
    case "security":
      return <ShieldAlert className="h-4 w-4 text-destructive" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  }
}

function AdminNotifications() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const list = useKeyedStorage(storageKeys.notifications, getNotifications);

  // استبعاد الإعلانات المصنوعة يدويًا والتركيز على إشعارات نظام الأدمن والأحداث
  const systemNotifications = list.filter((n) => n.kind !== "announcement");
  
  const filteredList = systemNotifications.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  const unreadCount = systemNotifications.filter((n) => !n.read).length;

  return (
    <AdminLayout>
      <PageHeader
        title="Notifications"
        description="Monitor system events, payout requests, and platform administrative alerts."
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAllNotificationsRead()}>
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all as read
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
          All ({systemNotifications.length})
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </Button>
      </div>

      {filteredList.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
          description="System events and administrative alerts will appear here automatically."
        />
      ) : (
        <Card className="border-border/60 divide-y divide-border/60 shadow-card">
          {filteredList.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 p-4 transition-colors",
                !n.read && "bg-primary/5 dark:bg-primary/10"
              )}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted shrink-0">
                {getNotificationIcon(n.kind)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  {!n.read && <Badge variant="default" className="h-2 w-2 rounded-full p-0" />}
                  {n.kind && (
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {n.kind}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.at}</p>
              </div>

              <div className="flex items-center gap-1">
                {/* رابط الإجراء الداخلي إن وجد في بيانات الإشعار */}
                {n.link && (
                  <Button asChild variant="ghost" size="sm" onClick={() => markNotificationRead(n.id)}>
                    <Link to={n.link}>View</Link>
                  </Button>
                )}
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => markNotificationRead(n.id)}
                    title="Mark as read"
                  >
                    <CheckCheck className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
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
    </AdminLayout>
  );
}