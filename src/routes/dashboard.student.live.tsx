import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, Video, History, Radio } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { useLiveReminders, useLiveSessions } from "@/hooks/useTeacherData";
import { type LiveSession } from "@/lib/lms-storage";
import {
  filterSessionsForEnrolledStudent,
  computeSessionStatus,
  hasReminder,
  type SessionStatus,
} from "@/services/live";
import { JoinLiveModal } from "@/components/student/JoinLiveModal";
import { RecordingPlayerModal } from "@/components/student/RecordingPlayerModal";
import { AddToCalendarModal } from "@/components/student/AddToCalendarButton";

export const Route = createFileRoute("/dashboard/student/live")({
  head: () => ({ meta: [{ title: "Live classes — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Live,
});

function parseDate(s: string) {
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function Live() {
  const allSessions = useLiveSessions();
  const now = Date.now();

  // فلترة إجبارية حسب تسجيل الطالب — لا جلسات ثابتة، كل شيء عبر LiveService
  const sessions = useMemo(() => filterSessionsForEnrolledStudent(allSessions), [allSessions]);

  const { upcoming, past } = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => parseDate(a.startsAt).getTime() - parseDate(b.startsAt).getTime()
    );
    return {
      upcoming: sorted.filter((s) => computeSessionStatus(s, now) !== "ended"),
      past: sorted.filter((s) => computeSessionStatus(s, now) === "ended").reverse(),
    };
  }, [sessions, now]);

  const [joinTarget, setJoinTarget] = useState<LiveSession | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<LiveSession | null>(null);
  const [calendarTarget, setCalendarTarget] = useState<LiveSession | null>(null);

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
            <EmptyState
              icon={CalendarClock}
              title="No upcoming sessions"
              description="Sessions from your enrolled courses will appear here."
            />
          ) : (
            <Grid
              list={upcoming}
              mode="upcoming"
              onJoin={setJoinTarget}
              onCalendar={setCalendarTarget}
            />
          )}
        </TabsContent>
        <TabsContent value="past">
          {past.length === 0 ? (
            <EmptyState icon={History} title="No past sessions" description="Your session history will appear here." />
          ) : (
            <Grid list={past} mode="past" onRecording={setRecordingTarget} />
          )}
        </TabsContent>
      </Tabs>

      <JoinLiveModal session={joinTarget} open={!!joinTarget} onOpenChange={(o) => !o && setJoinTarget(null)} />
      <RecordingPlayerModal
        session={recordingTarget}
        open={!!recordingTarget}
        onOpenChange={(o) => !o && setRecordingTarget(null)}
      />
      <AddToCalendarModal
        session={calendarTarget}
        open={!!calendarTarget}
        onOpenChange={(o) => !o && setCalendarTarget(null)}
      />
    </RoleDashboardLayout>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  if (status === "live") {
    return (
      <Badge className="gap-1 bg-red-500/10 text-red-600 hover:bg-red-500/10">
        <Radio className="h-3 w-3 animate-pulse" /> Live now
      </Badge>
    );
  }
  if (status === "upcoming") return <Badge variant="outline">Upcoming</Badge>;
  return <Badge variant="secondary">Recorded</Badge>;
}

function Grid({
  list,
  mode,
  onJoin,
  onRecording,
  onCalendar,
}: {
  list: LiveSession[];
  mode: "upcoming" | "past";
  onJoin?: (s: LiveSession) => void;
  onRecording?: (s: LiveSession) => void;
  onCalendar?: (s: LiveSession) => void;
}) {
  const reminders = useLiveReminders();
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {list.map((s) => {
        const status = computeSessionStatus(s);
        const reminded = mode === "upcoming" && reminders.includes(s.id);
        return (
          <Card key={s.id} className="border-border/60 p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Video className="h-5 w-5" />
              </div>
              <StatusBadge status={status} />
            </div>
            <p className="mt-3 text-sm font-semibold">{s.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.course}</p>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5" /> {s.startsAt}
              </div>
              <p>Hosted by {s.host} · {s.attendees} attendees</p>
            </div>
            <div className="mt-4 flex gap-2">
              {mode === "upcoming" ? (
                <>
                  <Button className="flex-1" onClick={() => onJoin?.(s)}>
                    {status === "live" ? "Join now" : "Join session"}
                  </Button>
                  <Button
                    variant={reminded ? "secondary" : "outline"}
                    onClick={() => onCalendar?.(s)}
                  >
                    {reminded ? "Reminder set" : "Remind me"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="flex-1" onClick={() => onRecording?.(s)}>
                  View recording
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}