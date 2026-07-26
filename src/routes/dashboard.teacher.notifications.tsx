
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BellOff, BookOpen, Check, ClipboardList, Sparkles, Video } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getNotifications, setNotifications, type Notif } from "@/lib/lms-storage";

export const Route = createFileRoute("/dashboard/teacher/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherNotifications,
});

const iconFor = (k: Notif["kind"]) =>
  k === "course" ? BookOpen : k === "live" ? Video : k === "quiz" ? ClipboardList : Sparkles;

function TeacherNotifications() {
  const [items, setItems] = useState<Notif[]>([]);
  useEffect(() => setItems(getNotifications()), []);
  const persist = (next: Notif[]) => { setItems(next); setNotifications(next); };
  const unread = items.filter((n) => !n.read).length;
  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Notifications"
        description={`${unread} unread`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => persist(items.map((n) => ({ ...n, read: true })))}>
              <Check className="mr-1.5 h-4 w-4" /> Mark all read
            </Button>
            <Button variant="outline" size="sm" onClick={() => persist([])}>
              <BellOff className="mr-1.5 h-4 w-4" /> Clear
            </Button>
          </div>
        }
      />
      {items.length === 0 ? (
        <Card className="p-10 text-center border-border/60 shadow-card">
          <p className="text-sm font-semibold">You're all caught up</p>
        </Card>
      ) : (
        <Card className="border-border/60 divide-y divide-border/60 shadow-card">
          {items.map((n) => {
            const Icon = iconFor(n.kind);
            return (
              <button
                key={n.id}
                onClick={() => persist(items.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
                className={cn("flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40", !n.read && "bg-primary-soft/40")}
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.at}</p>
                </div>
              </button>
            );
          })}
        </Card>
      )}
    </RoleDashboardLayout>
  );
}
