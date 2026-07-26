import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAssignments, useLiveSessions } from "@/hooks/useTeacherData";

export const Route = createFileRoute("/dashboard/student/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: CalendarPage,
});

type Event = { date: string; label: string; kind: "live" | "assignment" };

function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date(2026, 6, 1));
  const liveSessions = useLiveSessions();
  const assignments = useAssignments();

  const events: Event[] = useMemo(
    () => [
      ...liveSessions.map((l) => ({ date: l.startsAt.slice(0, 10), label: l.title, kind: "live" as const })),
      ...assignments.map((a) => ({ date: a.due, label: `Due: ${a.title}`, kind: "assignment" as const })),
    ],
    [liveSessions, assignments],
  );


  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7; // Mon=0

  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null as number | null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  const monthLabel = cursor.toLocaleString("en", { month: "long", year: "numeric" });

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title="Calendar"
        description="A monthly view of your live classes and assignment deadlines."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium">{monthLabel}</span>
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card className="border-border/60 p-6 shadow-card">
        <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (<div key={d}>{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((c, i) => {
            if (c === null) return <div key={i} className="h-24 rounded-lg bg-muted/20" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
            const dayEvents = events.filter((e) => e.date === dateStr);
            const today = new Date();
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === c;
            return (
              <div
                key={i}
                className={cn(
                  "flex h-24 flex-col rounded-lg border border-border/60 p-2 text-left text-xs",
                  isToday && "border-primary/50 bg-primary-soft",
                )}
              >
                <span className={cn("mb-1 text-xs font-semibold", isToday && "text-primary")}>{c}</span>
                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((e, ei) => (
                    <div
                      key={ei}
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-[10px] font-medium",
                        e.kind === "live" ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning",
                      )}
                    >
                      {e.label}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-border/60 p-6 shadow-card">
        <p className="text-sm font-semibold">This month at a glance</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-transparent">
            {liveSessions.length} live classes
          </Badge>
          <Badge className="bg-warning/15 text-warning hover:bg-warning/15 border-transparent">
            {assignments.length} assignments
          </Badge>
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}
