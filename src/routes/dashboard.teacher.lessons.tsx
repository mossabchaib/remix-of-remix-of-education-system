import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileVideo, ListChecks, BookOpen, Plus, Loader2, Layers, Clock, ArrowUpRight, Trash2,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  resolvedModules, addStoredLesson, updateStoredLesson, deleteStoredLesson,
  getTeacherCourses, storageKeys, STORAGE_EVENT,
  type Module, type Lesson,
} from "@/lib/lms-storage";
import { notifyLessonPublished } from "@/lib/notification-events";
import { toast } from "sonner";

// Minimal shape we rely on for a teacher's course. Kept local since the
// removed hook did not expose a dedicated type for it.
interface TeacherCourse {
  id: string;
  title: string;
}

type Row = Lesson & {
  course: string;
  courseId: string;
  module: string;
  moduleId: string;
};

export const Route = createFileRoute("/dashboard/teacher/lessons")({
  head: () => ({ meta: [{ title: "Lessons — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Lessons,
});

function Lessons() {
  const { t } = useTranslation();

  const KIND_META: Record<Lesson["kind"], { label: string; icon: typeof FileVideo; className: string }> = {
    video: { label: t("teacherLessons.kind.video"), icon: FileVideo, className: "border-blue-500/30 bg-blue-500/10 text-blue-600" },
   article: { label: t("teacherLessons.kind.article"), icon: BookOpen, className: "border-violet-500/30 bg-violet-500/10 text-violet-600" },
  };

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

  const [modulesByCourse, setModulesByCourse] = useState<Record<string, Module[]>>({});
  const [modulesLoading, setModulesLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loading = coursesLoading || modulesLoading;

  const loadCourseModules = async (courseId: string) => {
    const mods = await resolvedModules(courseId);
    setModulesByCourse((prev) => ({ ...prev, [courseId]: mods }));
  };

  useEffect(() => {
    if (coursesLoading) return;

    if (!courses.length) {
      setModulesByCourse({});
      setModulesLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setModulesLoading(true);
      try {
        const entries = await Promise.all(
          courses.map(async (c) => [c.id, await resolvedModules(c.id)] as const),
        );
        if (!cancelled) setModulesByCourse(Object.fromEntries(entries));
      } catch (err) {
        console.error("Failed to load lessons:", err);
        toast.error(t("teacherLessons.toast.loadFailed"));
      } finally {
        if (!cancelled) setModulesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courses, coursesLoading, t]);

  const rows = useMemo<Row[]>(() => {
    return courses.flatMap((c) =>
      (modulesByCourse[c.id] || []).flatMap((m) =>
        (m.lessons || []).map((l) => ({
          ...l, course: c.title, courseId: c.id, module: m.title, moduleId: m.id,
        })),
      ),
    );
  }, [courses, modulesByCourse]);

  const stats = useMemo(() => {
    const byKind = { video: 0, quiz: 0, article: 0 } as Record<Lesson["kind"], number>;
    rows.forEach((r) => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
    return { total: rows.length, ...byKind };
  }, [rows]);

  const cols: Column<Row>[] = [
    {
      key: "title", header: t("teacherLessons.table.lesson"), sortable: true, render: (r) => {
        const meta = KIND_META[r.kind] || KIND_META.video;
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-2.5">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${meta.className}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{r.title}</p>
              {r.is_preview && (
                <span className="text-[11px] font-medium text-emerald-600">
                  {t("teacherLessons.freePreview")}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    { key: "course", header: t("teacherLessons.table.course"), sortable: true, render: (r) => (
      <span className="text-sm text-muted-foreground">{r.course}</span>
    ) },
    { key: "module", header: t("teacherLessons.table.module"), render: (r) => (
      <span className="text-sm text-muted-foreground">{r.module}</span>
    ) },
    { key: "kind", header: t("teacherLessons.table.type"), render: (r) => {
      const meta = KIND_META[r.kind] || KIND_META.video;
      return <Badge variant="outline" className={meta.className}>{meta.label}</Badge>;
    } },
    { key: "duration", header: t("teacherLessons.table.duration"), render: (r) => (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> {r.duration || "—"}
      </span>
    ) },
  ];

  async function saveEdit(next: Lesson) {
    if (!editing) return;
    try {
      setSavingEdit(true);
      await updateStoredLesson(editing.id, {
        title: next.title,
        duration: next.duration,
        kind: next.kind,
        content_url: next.content_url,
        is_preview: next.is_preview,
      });
      await loadCourseModules(editing.courseId);
      toast.success(t("teacherLessons.toast.updated"));
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.message || t("teacherLessons.toast.updateFailed"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteStoredLesson(deleteTarget.id);
      await loadCourseModules(deleteTarget.courseId);
      toast.success(t("teacherLessons.toast.removed"));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || t("teacherLessons.toast.removeFailed"));
    } finally {
      setDeleting(false);
    }
  }

  async function createLesson(payload: {
    courseId: string; moduleId: string; title: string; duration: string; kind: Lesson["kind"];
  }) {
    try {
      setSavingCreate(true);
      await addStoredLesson(payload.moduleId, {
        title: payload.title,
        duration: payload.duration,
        kind: payload.kind,
        content_url: "",
        is_preview: false,
      });
      await loadCourseModules(payload.courseId);
      const course = courses.find((c) => c.id === payload.courseId);
      if (course) notifyLessonPublished({ courseId: course.id, courseTitle: course.title, lessonTitle: payload.title });
      toast.success(t("teacherLessons.toast.created"));
      setCreating(false);
    } catch (err: any) {
      toast.error(err?.message || t("teacherLessons.toast.createFailed"));
    } finally {
      setSavingCreate(false);
    }
  }

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacherLessons.title")}
        description={t("teacherLessons.description")}
        actions={
          <Button onClick={() => setCreating(true)} disabled={!courses.length}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("teacherLessons.newLesson")}
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/60 p-4 transition-colors hover:border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" /><span className="text-xs">{t("teacherLessons.stats.total")}</span>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{stats.total}</p>
        </Card>
        <Card className="border-border/60 p-4 transition-colors hover:border-border">
          <div className="flex items-center gap-2 text-blue-600">
            <FileVideo className="h-4 w-4" /><span className="text-xs">{t("teacherLessons.stats.videos")}</span>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{stats.video}</p>
        </Card>
      
        <Card className="border-border/60 p-4 transition-colors hover:border-border">
          <div className="flex items-center gap-2 text-violet-600">
            <BookOpen className="h-4 w-4" /><span className="text-xs">{t("teacherLessons.stats.articles")}</span>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{stats.article}</p>
        </Card>
      </div>

      {loading ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-border/60 p-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("teacherLessons.loading")}</p>
        </Card>
      ) : !courses.length ? (
        <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-border/60 p-16 text-center">
          <Layers className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t("teacherLessons.emptyCourses.title")}</p>
          <p className="text-xs text-muted-foreground">{t("teacherLessons.emptyCourses.description")}</p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to="/dashboard/teacher/courses">
              {t("teacherLessons.emptyCourses.cta")} <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </Card>
      ) : !rows.length ? (
        <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-border/60 p-16 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">{t("teacherLessons.emptyLessons.title")}</p>
          <p className="text-xs text-muted-foreground">{t("teacherLessons.emptyLessons.description")}</p>
          <Button size="sm" className="mt-2" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("teacherLessons.newLesson")}
          </Button>
        </Card>
      ) : (
        <Card className="border-border/60 p-1 shadow-card">
          <DataTable
            data={rows} columns={cols} searchKeys={["title", "course"]}
            filters={[{ key: "kind", label: t("teacherLessons.table.type"), options: ["video", "article"] }]}
            pageSize={10}
            onEdit={(r) => setEditing(r)}
            onDelete={(r) => setDeleteTarget(r)}
          />
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacherLessons.editDialog.title")}</DialogTitle>
            <DialogDescription>{editing?.course} · {editing?.module}</DialogDescription>
          </DialogHeader>
          {editing && <LessonForm initial={editing} saving={savingEdit} onSubmit={saveEdit} t={t} />}
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacherLessons.newDialog.title")}</DialogTitle>
            <DialogDescription>{t("teacherLessons.newDialog.description")}</DialogDescription>
          </DialogHeader>
          <NewLessonForm
            courses={courses}
            modulesByCourse={modulesByCourse}
            saving={savingCreate}
            onSubmit={createLesson}
            t={t}
          />
        </DialogContent>
      </Dialog>

      {/* Destructive action always requires explicit confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacherLessons.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacherLessons.deleteDialog.description", { title: deleteTarget?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("teacherLessons.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              {deleting ? t("teacherLessons.deleteDialog.deleting") : t("teacherLessons.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleDashboardLayout>
  );
}

function LessonForm({ initial, saving, onSubmit, t }: {
  initial: Lesson; saving: boolean; onSubmit: (l: Lesson) => void; t: (key: string) => string;
}) {
  const [f, setF] = useState<Lesson>(initial);
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}>
      <div className="space-y-1.5">
        <Label>{t("teacherLessons.form.title")}</Label>
        <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.type")}</Label>
          <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v as Lesson["kind"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="video">{t("teacherLessons.kind.video")}</SelectItem>
              <SelectItem value="article">{t("teacherLessons.kind.article")}</SelectItem>
              {/* <SelectItem value="quiz">{t("teacherLessons.kind.quiz")}</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.duration")}</Label>
          <Input
            value={f.duration || ""}
            onChange={(e) => setF({ ...f, duration: e.target.value })}
            placeholder={t("teacherLessons.form.durationPlaceholder")}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t("teacherLessons.form.contentUrl")}</Label>
        <Input
          value={f.content_url || ""}
          onChange={(e) => setF({ ...f, content_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={!!f.is_preview}
          onChange={(e) => setF({ ...f, is_preview: e.target.checked })}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        {t("teacherLessons.form.allowPreview")}
      </label>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {saving ? t("teacherLessons.form.saving") : t("teacherLessons.form.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function NewLessonForm({ courses, modulesByCourse, saving, onSubmit, t }: {
  courses: TeacherCourse[];
  modulesByCourse: Record<string, Module[]>;
  saving: boolean;
  onSubmit: (p: { courseId: string; moduleId: string; title: string; duration: string; kind: Lesson["kind"] }) => void;
  t: (key: string) => string;
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const mods = courseId ? modulesByCourse[courseId] || [] : [];
  const [moduleId, setModuleId] = useState(mods[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("10 min");
  const [kind, setKind] = useState<Lesson["kind"]>("video");

  useEffect(() => {
    const list = courseId ? modulesByCourse[courseId] || [] : [];
    setModuleId(list[0]?.id ?? "");
  }, [courseId, modulesByCourse]);

  const noModules = !!courseId && mods.length === 0;

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!moduleId) return;
        onSubmit({ courseId, moduleId, title, duration, kind });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.course")}</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.module")}</Label>
          <Select value={moduleId} onValueChange={setModuleId} disabled={noModules}>
            <SelectTrigger>
              <SelectValue placeholder={noModules ? t("teacherLessons.form.noModules") : undefined} />
            </SelectTrigger>
            <SelectContent>{mods.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {noModules && (
        <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t("teacherLessons.form.noModulesHint")}
        </p>
      )}

      <div className="space-y-1.5">
        <Label>{t("teacherLessons.form.title")}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder={t("teacherLessons.form.titlePlaceholder")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.type")}</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as Lesson["kind"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="video">{t("teacherLessons.kind.video")}</SelectItem>
              <SelectItem value="article">{t("teacherLessons.kind.article")}</SelectItem>
              {/* <SelectItem value="quiz">{t("teacherLessons.kind.quiz")}</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.duration")}</Label>
          <Input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder={t("teacherLessons.form.durationPlaceholder")}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving || noModules}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {saving ? t("teacherLessons.form.creating") : t("teacherLessons.form.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}