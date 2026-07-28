import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { useQuiz } from "@/hooks/useTeacherData";
import { QuizService } from "@/services/quizService";
import { QuestionForm } from "@/components/teacher/quiz/QuestionForm";
import { QuestionList } from "@/components/teacher/quiz/QuestionList";
import type { Question } from "@/lib/lms-storage";

export const Route = createFileRoute("/dashboard/teacher/quizzes/$id")({
  head: () => ({ meta: [{ title: "Quiz Editor — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherQuizDetail,
});

function TeacherQuizDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const quiz = useQuiz(id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (!quiz) {
    return (
      <RoleDashboardLayout role="teacher">
        <EmptyState title="Quiz not found" description="It may have been deleted, or the link is invalid." />
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/dashboard/teacher/quizzes">Back to quizzes</Link>
          </Button>
        </div>
      </RoleDashboardLayout>
    );
  }

  return <QuizEditor quiz={quiz} />;
}

function QuizEditor({ quiz }: { quiz: NonNullable<ReturnType<typeof useQuiz>> }) {
  const navigate = useNavigate();
  const [titleDraft, setTitleDraft] = useState(quiz.title);
  const [minutesDraft, setMinutesDraft] = useState(String(quiz.minutes));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const isDirty = titleDraft !== quiz.title || minutesDraft !== String(quiz.minutes);

  function saveMeta() {
    QuizService.save({ ...quiz, title: titleDraft.trim() || quiz.title, minutes: Number(minutesDraft) || quiz.minutes });
    toast.success("Quiz details updated");
  }

  function handleAddClick() {
    setEditingQuestion(null);
    setDialogOpen(true);
  }

  function handleEditClick(q: Question) {
    setEditingQuestion(q);
    setDialogOpen(true);
  }

  function confirmDeleteQuestion() {
    if (!pendingDeleteId) return;
    QuizService.removeQuestion(quiz.id, pendingDeleteId);
    toast.success("Question removed");
    setPendingDeleteId(null);
  }

  function handleFormSubmit(payload: Omit<Question, "id"> & { id?: string }) {
    if (payload.id) {
      QuizService.updateQuestion(quiz.id, payload as Question);
      toast.success("Question updated");
    } else {
      QuizService.addQuestion(quiz.id, payload);
      toast.success("Question added");
    }
    setDialogOpen(false);
  }

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={quiz.title}
        description={quiz.course}
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard/teacher/quizzes" })}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to quizzes
          </Button>
        }
      />

      <Card className="border-border/60 p-5 shadow-card">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Quiz title</Label>
            <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Input type="number" min={1} value={minutesDraft} onChange={(e) => setMinutesDraft(e.target.value)} />
          </div>
          <Button onClick={saveMeta} disabled={!isDirty}>Save</Button>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Questions</h3>
          <Badge variant="outline">{quiz.questions.length}</Badge>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-1.5 h-4 w-4" /> New question
        </Button>
      </div>

      <div className="mt-3">
        <QuestionList
          questions={quiz.questions}
          onEdit={handleEditClick}
          onDelete={(qid) => setPendingDeleteId(qid)}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit question" : "New question"}</DialogTitle>
          </DialogHeader>
          <QuestionForm
            initial={editingQuestion ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(v) => !v && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteQuestion}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleDashboardLayout>
  );
}