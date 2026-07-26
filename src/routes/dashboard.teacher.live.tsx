import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarPlus, Trash2, Video } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { useLiveSessions } from "@/hooks/useTeacherData";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { LiveService } from "@/services";
import { getProfile, type LiveSession } from "@/lib/lms-storage";
import { notifyLiveScheduled } from "@/lib/notification-events";
import { courses as allCourses } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/live")({
  head: () => ({ meta: [{ title: "Live sessions — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Live,
});

function Live() {
  const sessions = useLiveSessions();
  const courses = useTeacherCourses();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LiveSession | null>(null);

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Live sessions"
        description="Schedule and manage live classes with your students."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><CalendarPlus className="mr-1.5 h-4 w-4" /> Schedule</Button>}
      />
      {sessions.length === 0 ? (
        <EmptyState title="No sessions yet" description="Schedule your first live class." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => (
            <Card key={s.id} className="border-border/60 p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Video className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{s.duration}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => { LiveService.remove(s.id); toast.success("Session removed"); }}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold">{s.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.course}</p>
              <p className="mt-2 text-xs text-muted-foreground">{s.startsAt} · {s.attendees} registered</p>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={() => toast.success(`${s.title} started`)}>Start session</Button>
                <Button variant="outline" onClick={() => { setEditing(s); setOpen(true); }}>Edit</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit session" : "New session"}</DialogTitle></DialogHeader>
          <Form
            initial={editing ?? undefined}
            courses={courses.map((c) => c.title)}
            onSubmit={(payload) => {
              if (editing) { LiveService.save({ ...editing, ...payload }); toast.success("Session updated"); }
              else {
                const created = LiveService.create(payload);
                notifyLiveScheduled({
                  courseId: allCourses.find((c) => c.title === created.course)?.id,
                  courseTitle: created.course,
                  sessionId: created.id,
                  title: created.title,
                  startsAt: created.startsAt,
                  host: created.host,
                });
                toast.success("Session scheduled — students notified");
              }
              setOpen(false); setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </RoleDashboardLayout>
  );
}

function Form({ initial, courses, onSubmit }: {
  initial?: LiveSession; courses: string[]; onSubmit: (l: Omit<LiveSession, "id">) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [course, setCourse] = useState(initial?.course ?? courses[0] ?? "");
  const [host, setHost] = useState(initial?.host ?? getProfile().name);
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? new Date().toISOString().slice(0, 16).replace("T", " "));
  const [duration, setDuration] = useState(initial?.duration ?? "60 min");
  const [attendees, setAttendees] = useState(String(initial?.attendees ?? 0));
  return (
    <form className="grid gap-4" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ title, course, host, startsAt, duration, attendees: Number(attendees) || 0 });
    }}>
      <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Course</Label>
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Host</Label><Input value={host} onChange={(e) => setHost(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Starts at</Label><Input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} placeholder="2026-08-01 18:00" /></div>
        <div className="space-y-1.5"><Label>Duration</Label><Input value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Attendees</Label><Input type="number" value={attendees} onChange={(e) => setAttendees(e.target.value)} /></div>
      </div>
      <DialogFooter><Button type="submit">Save</Button></DialogFooter>
    </form>
  );
}
