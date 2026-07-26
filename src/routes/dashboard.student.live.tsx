import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CalendarClock, Video, History } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { useLiveSessions } from "@/hooks/useTeacherData";
import { type LiveSession, logActivity } from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/live")({
  head: () => ({ meta: [{ title: "Live classes — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Live,
});

function parseDate(s: string) {
  // Format e.g. "2026-07-27 18:00"
  const iso = s.replace(" ", "T");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function Live() {
  const sessions = useLiveSessions();
  const now = Date.now();

  const { upcoming, past } = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => parseDate(a.startsAt).getTime() - parseDate(b.startsAt).getTime());
    return {
      upcoming: sorted.filter((s) => parseDate(s.startsAt).getTime() >= now - 60 * 60 * 1000),
      past: sorted.filter((s) => parseDate(s.startsAt).getTime() < now - 60 * 60 * 1000).reverse(),
    };
  }, [sessions, now]);

  return (
    <RoleDashboardLayout role="student">
      <PageHeader title="Live classes" description="Join interactive sessions with instructors and classmates." />
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No upcoming sessions" description="Check back later or explore your calendar." />
          ) : (
            <Grid list={upcoming} upcoming />
          )}
        </TabsContent>
        <TabsContent value="past">
          {past.length === 0 ? (
            <EmptyState icon={History} title="No past sessions" description="Your session history will appear here." />
          ) : (
            <Grid list={past} />
          )}
        </TabsContent>
      </Tabs>
    </RoleDashboardLayout>
  );
}

function Grid({ list, upcoming }: { list: LiveSession[]; upcoming?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {list.map((s) => (
        <Card key={s.id} className="border-border/60 p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
              <Video className="h-5 w-5" />
            </div>
            <Badge variant="outline">{s.duration}</Badge>
          </div>
          <p className="mt-3 text-sm font-semibold">{s.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{s.course}</p>
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5" /> {s.startsAt}</div>
            <p>Hosted by {s.host} · {s.attendees} attendees</p>
          </div>
          <div className="mt-4 flex gap-2">
            {upcoming ? (
              <>
                <Button className="flex-1" onClick={() => { toast.success(`Joining ${s.title}`); logActivity({ kind: "lesson", label: `Joined live · ${s.title}`, refId: s.id }); }}>
                  Join session
                </Button>
                <Button variant="outline" onClick={() => toast.info("Reminder set")}>Remind me</Button>
              </>
            ) : (
              <Button variant="outline" className="flex-1" onClick={() => toast.info("Recording coming soon")}>
                View recording
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
