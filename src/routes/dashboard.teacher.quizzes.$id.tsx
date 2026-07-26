import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QuizService } from "@/services";
import { type Question, type Quiz } from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/quizzes/$id")({
  head: () => ({ meta: [{ title: "Manage questions — Lumen" }, { name: "robots", content: "noindex" }] }),
  loader: ({ params }) => {
    const quiz = QuizService.get(params.id);
    if (!quiz) throw notFound();
    return { quiz };
  },
  component: ManageQuestions,
  notFoundComponent: () => (
    <RoleDashboardLayout role="teacher">
      <Card className="p-10 text-center border-border/60 shadow-card">Quiz not found</Card>
    </RoleDashboardLayout>
  ),
});

function ManageQuestions() {
  const { quiz } = Route.useLoaderData() as { quiz: Quiz };
  const [title, setTitle] = useState(quiz.title);
  const [items, setItems] = useState<Question[]>(quiz.questions);

  const addQ = () => setItems((all) => [...all, {
    id: `nq-${Date.now()}`, text: "New question", options: ["Option A", "Option B", "Option C", "Option D"], answer: 0,
  }]);
  const save = () => {
    QuizService.save({ ...quiz, title, questions: items });
    toast.success("Saved");
  };

  return (
    <RoleDashboardLayout role="teacher">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/dashboard/teacher/quizzes"><ChevronLeft className="mr-1 h-4 w-4" /> Quizzes</Link>
        </Button>
        <span>/</span><span className="truncate">{quiz.title}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-md text-lg font-semibold" />
          <p className="mt-1 text-sm text-muted-foreground">{quiz.course} · {items.length} questions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addQ}><Plus className="mr-1.5 h-4 w-4" /> Add question</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((q, qi) => (
          <Card key={q.id} className="border-border/60 p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{qi + 1}</Badge>
              <Input
                value={q.text}
                onChange={(e) => setItems((all) => all.map((x, i) => i === qi ? { ...x, text: e.target.value } : x))}
                className="flex-1 font-medium"
              />
              <Button variant="ghost" size="icon" onClick={() => setItems((all) => all.filter((_, i) => i !== qi))}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setItems((all) => all.map((x, i) => i === qi ? { ...x, answer: oi } : x))}
                    className={`grid h-8 w-8 place-items-center rounded-full border ${
                      q.answer === oi ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground"
                    }`}
                    aria-label="Correct answer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <Input
                    value={opt}
                    onChange={(e) => setItems((all) => all.map((x, i) => i === qi ? {
                      ...x, options: x.options.map((o, j) => j === oi ? e.target.value : o),
                    } : x))}
                  />
                </div>
              ))}
            </div>
            <Label className="mt-3 block text-xs text-muted-foreground">Click the check icon next to the correct answer.</Label>
          </Card>
        ))}
      </div>
    </RoleDashboardLayout>
  );
}
