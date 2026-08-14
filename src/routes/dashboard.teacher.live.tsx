import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarPlus, Trash2, Video, Link as LinkIcon, Loader2 } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import {
  getLiveSessions,
  upsertLiveSession,
  deleteLiveSession,
  getProfile,
  getTeacherCourses,
  storageKeys,
  STORAGE_EVENT,
  type LiveSession,
} from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/live")({
  head: () => ({ meta: [{ title: "Live sessions — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Live,
});

// Minimal shape we rely on for a teacher's course. Kept local since the
// removed hook did not expose a dedicated type for it.
interface TeacherCourse {
  id: string;
  title: string;
}

function Live() {
  const { t } = useTranslation();

  // --- Courses: previously sourced from useTeacherCourses(), now read
  // directly from lms-storage and kept in sync via its storage events. ---
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        const result = await getTeacherCourses();
        if (!isMounted) return;
        const list: TeacherCourse[] = Array.isArray(result)
          ? result
          : (result as any)?.data || (result as any)?.courses || [];
        setCourses(list);
      } catch (err) {
        console.error("Failed to load teacher courses:", err);
        if (isMounted) setCourses([]);
      } finally {
        if (isMounted) setCoursesLoading(false);
      }
    }

    loadCourses();

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (!detail || detail.key === storageKeys.teacherCourses) loadCourses();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === storageKeys.teacherCourses) loadCourses();
    };

    window.addEventListener(STORAGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);

    return () => {
      isMounted = false;
      window.removeEventListener(STORAGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LiveSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LiveSession | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const data = await getLiveSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load live sessions:", err);
      toast.error(t("teacherLive.toast.loadFailed"));
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const courseTitle = (courseId: string) =>
    courses.find((c) => c.id === courseId)?.title ?? "—";

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLiveSession(deleteTarget.id);
      toast.success(t("teacherLive.toast.removed"));
      setDeleteTarget(null);
      loadSessions();
    } catch {
      toast.error(t("teacherLive.toast.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleStart(s: LiveSession) {
    if (!s.join_url) {
      toast.error(t("teacherLive.toast.noJoinUrl"));
      return;
    }
    setStartingId(s.id);
    try {
      // Open the meeting link in a new tab.
      window.open(s.join_url, "_blank", "noopener,noreferrer");
      // Mark the session as actually started.
      await upsertLiveSession({ id: s.id, status: true });
      toast.success(t("teacherLive.toast.started", { title: s.title }));
      loadSessions();
    } catch {
      toast.error(t("teacherLive.toast.startFailed"));
    } finally {
      setStartingId(null);
    }
  }

  const loading = coursesLoading || sessionsLoading;

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacherLive.title")}
        description={t("teacherLive.description")}
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <CalendarPlus className="mr-1.5 h-4 w-4" /> {t("teacherLive.schedule")}
          </Button>
        }
      />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/60 p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState title={t("teacherLive.empty.title")} description={t("teacherLive.empty.description")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s:any) => (
            <Card key={s.id} className="border-border/60 p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Video className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{s.duration}</Badge>
                  {s.status && (
                    <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/10">
                      {t("teacherLive.started")}
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)} title={t("teacherLive.deleteSession")}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold">{s.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{courseTitle(s.course_id)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("teacherLive.attendeesLine", { startsAt: s.startsAt, count: s.attendees })}
              </p>
              {s.joinUrl && (
                <a
                  href={s.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <LinkIcon className="h-3.5 w-3.5" /> {s.joinUrl}
                </a>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1"
                  disabled={startingId === s.id}
                  onClick={() => handleStart(s)}
                >
                  {startingId === s.id ? (
                    <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("teacherLive.starting")}</>
                  ) : (
                    t("teacherLive.startSession")
                  )}
                </Button>
                <Button variant="outline" onClick={() => { setEditing(s); setOpen(true); }}>
                  {t("teacherLive.edit")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!saving) setOpen(o); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t("teacherLive.dialog.editTitle") : t("teacherLive.dialog.newTitle")}</DialogTitle></DialogHeader>
          <Form
            initial={editing ?? undefined}
            courses={courses.map((c) => ({ id: c.id, title: c.title }))}
            saving={saving}
            t={t}
            onSubmit={async (payload) => {
              setSaving(true);
              try {
                if (editing) {
                  await upsertLiveSession({ ...editing, ...payload });
                  toast.success(t("teacherLive.toast.updated"));
                } else {
                  const created = await upsertLiveSession(payload);
                  toast.success(t("teacherLive.toast.scheduled"));
                }
                setOpen(false); setEditing(null);
                loadSessions();
              } catch {
                toast.error(t("teacherLive.toast.saveFailed"));
              } finally {
                setSaving(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacherLive.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? t("teacherLive.deleteDialog.description", { title: deleteTarget.title }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("teacherLive.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (<><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("teacherLive.deleteDialog.deleting")}</>) : t("teacherLive.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleDashboardLayout>
  );
}

function Form({ initial, courses, saving, onSubmit, t }: {
  initial?: LiveSession;
  courses: { id: string; title: string }[];
  saving: boolean;
  onSubmit: (l: Omit<LiveSession, "id" | "course" | "status">) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [courseId, setCourseId] = useState(initial?.course_id ?? courses[0]?.id ?? "");
 const [host, setHost] = useState<string>(initial?.host ?? (getProfile() as any)?.name ?? "");
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? new Date().toISOString().slice(0, 16).replace("T", " "));
  const [duration, setDuration] = useState(initial?.duration ?? "60 min");
  const [attendees, setAttendees] = useState(String(initial?.attendees ?? 0));
  const [joinUrl, setJoinUrl] = useState(initial?.joinUrl ?? "");

  return (
    <form className="grid gap-4" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        title,
        course_id: courseId,
        host,
        startsAt,
        duration,
        attendees: Number(attendees) || 0,
        joinUrl: joinUrl.trim() || undefined,
      });
    }}>
      <div className="space-y-1.5">
        <Label>{t("teacherLive.form.title")}</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required disabled={saving} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("teacherLive.form.course")}</Label>
          <Select value={courseId} onValueChange={setCourseId} disabled={saving}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherLive.form.host")}</Label>
          <Input value={host} onChange={(e) => setHost(e.target.value)} disabled={saving} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherLive.form.startsAt")}</Label>
          <Input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} placeholder="2026-08-01 18:00" disabled={saving} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherLive.form.duration")}</Label>
          <Input value={duration} onChange={(e) => setDuration(e.target.value)} disabled={saving} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherLive.form.attendees")}</Label>
          <Input type="number" value={attendees} onChange={(e) => setAttendees(e.target.value)} disabled={saving} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t("teacherLive.form.joinUrl")}</Label>
          <Input
            value={joinUrl}
            onChange={(e) => setJoinUrl(e.target.value)}
            placeholder="https://meet.google.com/xxx-yyyy-zzz"
            disabled={saving}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? (<><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("teacherLive.form.saving")}</>) : t("teacherLive.form.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}