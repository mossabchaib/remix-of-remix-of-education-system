import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { QuestionForm } from "@/components/teacher/quiz/QuestionForm";
import { QuestionList } from "@/components/teacher/quiz/QuestionList";
import {
  getQuiz, upsertQuiz, addQuizQuestion, updateQuizQuestion, removeQuizQuestion,
  type Quiz, type Question,
} from "@/lib/lms-storage";

export const Route = createFileRoute("/dashboard/teacher/quizzes/$id")({
  head: () => ({ meta: [{ title: "Quiz Editor — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherQuizDetail,
});

/* =========================================================
   Normalizer: converts the shape of data returned by the backend
   (question_options / question_true_false / matching_pairs)
   into the shape the frontend expects
   (options / correctOptionIndexes / correctBoolean / pairs).
   ========================================================= */
function normalizeQuestion(raw: any): Question {
  const base = {
    id: raw.id,
    type: raw.type,
    text: raw.text,
  };

  if (raw.type === "qcm") {
    const opts = (raw.question_options ?? []).sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
    return {
      ...base,
      options: opts.map((o: any) => o.option_text),
      correctOptionIndexes: opts
        .map((o: any, idx: number) => (o.is_correct ? idx : -1))
        .filter((idx: number) => idx !== -1),
    } as Question;
  }

  if (raw.type === "true_false") {
    const tf = Array.isArray(raw.question_true_false)
      ? raw.question_true_false[0]
      : raw.question_true_false;
    return {
      ...base,
      correctBoolean: tf?.correct_boolean ?? false,
    } as Question;
  }

  if (raw.type === "matching") {
    return {
      ...base,
      pairs: (raw.matching_pairs ?? []).map((p: any) => ({
        id: p.id,
        left: p.left_text,
        right: p.right_text,
      })),
    } as Question;
  }

  return base as Question;
}

function normalizeQuiz(raw: any): Quiz {
  return {
    id: raw.id,
    title: raw.title,
    course: raw.course ?? raw.course_title ?? "",
    minutes: raw.minutes,
    questions: (raw.questions ?? [])
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(normalizeQuestion),
  };
}

function TeacherQuizDetail() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getQuiz(id);
      setQuiz(data ? normalizeQuiz(data) : null);
    } catch (err) {
      console.error("Failed to load quiz:", err);
      toast.error(t("teacherQuizEditor.toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <RoleDashboardLayout role="teacher">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Card className="border-border/60 p-5 shadow-card">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto]">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-20" />
            </div>
          </Card>
          <Skeleton className="h-40 w-full" />
        </div>
      </RoleDashboardLayout>
    );
  }

  if (!quiz) {
    return (
      <RoleDashboardLayout role="teacher">
        <EmptyState
          title={t("teacherQuizEditor.notFound.title")}
          description={t("teacherQuizEditor.notFound.description")}
        />
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/dashboard/teacher/quizzes">{t("teacherQuizEditor.notFound.back")}</Link>
          </Button>
        </div>
      </RoleDashboardLayout>
    );
  }

  return <QuizEditor quiz={quiz} setQuiz={setQuiz} />;
}

function QuizEditor({
  quiz,
  setQuiz,
}: {
  quiz: Quiz;
  setQuiz: React.Dispatch<React.SetStateAction<Quiz | null>>;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [titleDraft, setTitleDraft] = useState(quiz.title);
  const [minutesDraft, setMinutesDraft] = useState(String(quiz.minutes));
  const [savingMeta, setSavingMeta] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);

  useEffect(() => {
    setTitleDraft(quiz.title);
    setMinutesDraft(String(quiz.minutes));
  }, [quiz.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = titleDraft !== quiz.title || minutesDraft !== String(quiz.minutes);

  async function saveMeta() {
    setSavingMeta(true);
    try {
      const newTitle = titleDraft.trim() || quiz.title;
      const newMinutes = Number(minutesDraft) || quiz.minutes;
      await upsertQuiz({ id: quiz.id, title: newTitle, minutes: newMinutes });
      // Local update — no page reload needed.
      setQuiz((prev) => (prev ? { ...prev, title: newTitle, minutes: newMinutes } : prev));
      toast.success(t("teacherQuizEditor.toast.metaUpdated"));
    } catch (err) {
      console.error("Failed to save quiz:", err);
      toast.error(t("teacherQuizEditor.toast.metaSaveFailed"));
    } finally {
      setSavingMeta(false);
    }
  }

  function handleAddClick() {
    setEditingQuestion(null);
    setDialogOpen(true);
  }

  function handleEditClick(q: Question) {
    setEditingQuestion(q);
    setDialogOpen(true);
  }

  async function confirmDeleteQuestion() {
    if (!pendingDeleteId) return;
    setDeletingQuestion(true);
    try {
      await removeQuizQuestion(quiz.id, pendingDeleteId);
      // Immediate local update.
      setQuiz((prev) =>
        prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== pendingDeleteId) } : prev
      );
      toast.success(t("teacherQuizEditor.toast.questionRemoved"));
    } catch (err) {
      console.error("Failed to remove question:", err);
      toast.error(t("teacherQuizEditor.toast.questionRemoveFailed"));
    } finally {
      setDeletingQuestion(false);
      setPendingDeleteId(null);
    }
  }

  async function handleFormSubmit(payload: Omit<Question, "id"> & { id?: string }) {
    setSubmittingQuestion(true);
    try {
      if (payload.id) {
        const raw = await updateQuizQuestion(quiz.id, payload as Question);
        const normalized = normalizeQuestion(raw);
        setQuiz((prev) =>
          prev
            ? {
                ...prev,
                questions: prev.questions.map((q) => (q.id === normalized.id ? normalized : q)),
              }
            : prev
        );
        toast.success(t("teacherQuizEditor.toast.questionUpdated"));
      } else {
        const raw = await addQuizQuestion(quiz.id, payload);
        const normalized = normalizeQuestion(raw);
        setQuiz((prev) =>
          prev ? { ...prev, questions: [...prev.questions, normalized] } : prev
        );
        toast.success(t("teacherQuizEditor.toast.questionAdded"));
      }
      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to save question:", err);
      toast.error(t("teacherQuizEditor.toast.questionSaveFailed"));
    } finally {
      setSubmittingQuestion(false);
    }
  }

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={quiz.title}
        description={quiz.course}
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard/teacher/quizzes" })}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {t("teacherQuizEditor.backToQuizzes")}
          </Button>
        }
      />

      <Card className="border-border/60 p-5 shadow-card">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>{t("teacherQuizEditor.meta.quizTitle")}</Label>
            <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("teacherQuizEditor.meta.duration")}</Label>
            <Input type="number" min={1} value={minutesDraft} onChange={(e) => setMinutesDraft(e.target.value)} />
          </div>
          <Button onClick={saveMeta} disabled={!isDirty || savingMeta}>
            {savingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : t("teacherQuizEditor.meta.save")}
          </Button>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t("teacherQuizEditor.questions.heading")}</h3>
          <Badge variant="outline">{quiz.questions?.length ?? 0}</Badge>
        </div>
        <Button onClick={handleAddClick} disabled={submittingQuestion}>
          <Plus className="mr-1.5 h-4 w-4" /> {t("teacherQuizEditor.questions.newQuestion")}
        </Button>
      </div>

      <div className="mt-3">
        {!quiz.questions || quiz.questions.length === 0 ? (
          <EmptyState
            title={t("teacherQuizEditor.questions.emptyTitle")}
            description={t("teacherQuizEditor.questions.emptyDescription")}
          />
        ) : (
          <QuestionList
            questions={quiz.questions}
            onEdit={handleEditClick}
            onDelete={(qid) => setPendingDeleteId(qid)}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => !submittingQuestion && setDialogOpen(v)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? t("teacherQuizEditor.questionDialog.editTitle") : t("teacherQuizEditor.questionDialog.newTitle")}
            </DialogTitle>
          </DialogHeader>
          <QuestionForm
            initial={editingQuestion ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setDialogOpen(false)}
            submitting={submittingQuestion}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(v) => !v && !deletingQuestion && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacherQuizEditor.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("teacherQuizEditor.deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingQuestion}>{t("teacherQuizEditor.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteQuestion} disabled={deletingQuestion}>
              {deletingQuestion ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              {deletingQuestion ? t("teacherQuizEditor.deleteDialog.deleting") : t("teacherQuizEditor.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleDashboardLayout>
  );
}