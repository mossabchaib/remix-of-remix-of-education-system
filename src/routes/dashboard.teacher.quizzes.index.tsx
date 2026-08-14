import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ListChecks, Trash2, Clock } from "lucide-react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import {
  getQuizzesByCourse, upsertQuiz, deleteQuiz, getTeacherCourses, storageKeys, STORAGE_EVENT,
  type Quiz,
} from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/quizzes/")({
  head: () => ({ meta: [{ title: "Quizzes — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherQuizzes,
});

// Minimal shape we rely on for a teacher's course. Kept local since the
// removed hook did not expose a dedicated type for it.
interface TeacherCourse {
  id: string;
  title: string;
}

function TeacherQuizzes() {
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

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Combined loading flag: quizzes can't be fetched until courses have
  // resolved, so the skeletons should stay up for both phases.
  const loading = coursesLoading || quizzesLoading;

  async function loadQuizzes() {
    if (!courses || courses.length === 0) {
      setQuizzes([]);
      setQuizzesLoading(false);
      return;
    }
    setQuizzesLoading(true);
    try {
      const results = await Promise.all(
        courses.map((c) => getQuizzesByCourse(c.id))
      );
      setQuizzes(results.flat());
    } catch (err) {
      console.error("Failed to load quizzes:", err);
      toast.error(t("teacherQuizzes.toast.loadFailed"));
    } finally {
      setQuizzesLoading(false);
    }
  }

  useEffect(() => {
    if (coursesLoading) return;
    loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coursesLoading, courses.length]);

  async function handleCreate(v: { title: string; courseId: string; courseTitle: string; minutes: number }) {
    setCreating(true);
    try {
      const created = await upsertQuiz({
        title: v.title,
        courseId: v.courseId,
        minutes: v.minutes,
      });
      toast.success(t("teacherQuizzes.toast.created"));
      setOpen(false);
      loadQuizzes();
    } catch (err) {
      console.error("Failed to create quiz:", err);
      toast.error(t("teacherQuizzes.toast.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteQuiz(pendingDeleteId);
      setQuizzes((prev) => prev.filter((q) => q.id !== pendingDeleteId));
      toast.success(t("teacherQuizzes.toast.removed"));
    } catch (err) {
      console.error("Failed to remove quiz:", err);
      toast.error(t("teacherQuizzes.toast.removeFailed"));
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  }

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacherQuizzes.title")}
        description={t("teacherQuizzes.description")}
        actions={
          <Button onClick={() => setOpen(true)} disabled={!courses || courses.length === 0}>
            <Plus className="mr-1.5 h-4 w-4" /> {t("teacherQuizzes.newQuiz")}
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/60 p-5 shadow-card">
              <div className="flex items-start gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={t("teacherQuizzes.empty.title")}
          description={
            !courses || courses.length === 0
              ? t("teacherQuizzes.empty.noCourses")
              : t("teacherQuizzes.empty.noQuizzes")
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((q) => (
            <Card key={q.id} className="group border-border/60 p-5 shadow-card transition-shadow hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <ListChecks className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{q.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{q.course}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setPendingDeleteId(q.id)}
                  title={t("teacherQuizzes.deleteQuiz")}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <ListChecks className="h-3 w-3" /> {t("teacherQuizzes.questionsCount", { count: q.questions?.length ?? 0 })}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" /> {t("teacherQuizzes.minutes", { count: q.minutes })}
                </Badge>
                <Badge variant="outline" className="border-success/20 bg-success/10 text-success">
                  {t("teacherQuizzes.published")}
                </Badge>
              </div>

              <div className="mt-4 flex gap-2">
                <Button asChild className="flex-1">
                  <Link to="/dashboard/teacher/quizzes/$id" params={{ id: q.id }}>{t("teacherQuizzes.manageQuestions")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard/student/quizzes/$id" params={{ id: q.id }}>{t("teacherQuizzes.preview")}</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("teacherQuizzes.newDialog.title")}</DialogTitle></DialogHeader>
          <NewQuizForm courses={courses ?? []} onSubmit={handleCreate} submitting={creating} t={t} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(v) => !v && !deleting && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacherQuizzes.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacherQuizzes.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("teacherQuizzes.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              <Trash2 className="mr-1.5 h-4 w-4" /> {deleting ? t("teacherQuizzes.deleteDialog.deleting") : t("teacherQuizzes.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleDashboardLayout>
  );
}

function NewQuizForm({
  courses,
  onSubmit,
  submitting,
  t,
}: {
  courses: { id: string; title: string }[];
  onSubmit: (v: { title: string; courseId: string; courseTitle: string; minutes: number }) => void;
  submitting: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [minutes, setMinutes] = useState("10");

  const selectedCourse = courses.find((c) => c.id === courseId);

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selectedCourse) {
          toast.error(t("teacherQuizzes.newDialog.selectCourseFirst"));
          return;
        }
        onSubmit({ title, courseId, courseTitle: selectedCourse.title, minutes: Number(minutes) || 10 });
      }}
    >
      <div className="space-y-1.5">
        <Label>{t("teacherQuizzes.newDialog.titleField")}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("teacherQuizzes.newDialog.titlePlaceholder")}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("teacherQuizzes.newDialog.course")}</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue placeholder={t("teacherQuizzes.newDialog.selectCourse")} /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherQuizzes.newDialog.duration")}</Label>
          <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? t("teacherQuizzes.newDialog.creating") : t("teacherQuizzes.newDialog.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}