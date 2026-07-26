import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, RotateCcw, Timer, XCircle } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getAttempts, saveAttempt, type Quiz } from "@/lib/lms-storage";
import { QuizService } from "@/services";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/quizzes/$id")({
  head: () => ({ meta: [{ title: "Quiz — Lumen" }, { name: "robots", content: "noindex" }] }),
  loader: ({ params }) => {
    const quiz = QuizService.get(params.id);
    if (!quiz) throw notFound();
    return { quiz };
  },

  component: QuizPage,
  notFoundComponent: () => (
    <RoleDashboardLayout role="student">
      <Card className="p-10 text-center border-border/60 shadow-card">
        <p className="text-lg font-semibold">Quiz not found</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard/student/quizzes">Back to quizzes</Link>
        </Button>
      </Card>
    </RoleDashboardLayout>
  ),
});

function QuizPage() {
  const { quiz } = Route.useLoaderData() as { quiz: Quiz };
  const existing = getAttempts()[quiz.id];
  const [mode, setMode] = useState<"take" | "results">(existing ? "results" : "take");
  const [answers, setAnswers] = useState<number[]>(existing?.answers ?? Array(quiz.questions.length).fill(-1));
  const [step, setStep] = useState(0);

  if (mode === "results") return <Results quiz={quiz} attempt={existing!} onRetake={() => { setAnswers(Array(quiz.questions.length).fill(-1)); setStep(0); setMode("take"); }} />;

  const q = quiz.questions[step];
  const pct = ((step + (answers[step] >= 0 ? 1 : 0)) / quiz.questions.length) * 100;


  const submit = () => {
    const score = answers.reduce((acc, a, i) => acc + (a === quiz.questions[i].answer ? 1 : 0), 0);
    saveAttempt(quiz.id, { score, total: quiz.questions.length, at: new Date().toISOString(), answers });
    toast.success(`You scored ${score}/${quiz.questions.length}`);
    setMode("results");
  };

  return (
    <RoleDashboardLayout role="student">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/dashboard/student/quizzes">
            <ChevronLeft className="mr-1 h-4 w-4" /> Quizzes
          </Link>
        </Button>
        <span>/</span>
        <span className="truncate">{quiz.title}</span>
      </div>

      <Card className="mx-auto max-w-3xl border-border/60 p-8 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{quiz.course}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{quiz.title}</h1>
          </div>
          <Badge variant="outline" className="gap-1"><Timer className="h-3 w-3" /> {quiz.minutes} min</Badge>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Question {step + 1} of {quiz.questions.length}</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        <div className="mt-8">
          <p className="text-base font-medium">{q.text}</p>
          <RadioGroup
            value={String(answers[step] ?? -1)}
            onValueChange={(v) => {
              const next = [...answers];
              next[step] = Number(v);
              setAnswers(next);
            }}
            className="mt-4 space-y-2"
          >
            {q.options.map((opt, i) => (
              <label
                key={i}
                htmlFor={`opt-${i}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40",
                  answers[step] === i && "border-primary bg-primary-soft",
                )}
              >
                <RadioGroupItem id={`opt-${i}`} value={String(i)} />
                <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer text-sm">{opt}</Label>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Previous
          </Button>
          {step === quiz.questions.length - 1 ? (
            <Button onClick={submit} disabled={answers.some((a) => a < 0)}>Submit quiz</Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} disabled={answers[step] < 0}>
              Next
            </Button>
          )}
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}

function Results({
  quiz,
  attempt,
  onRetake,
}: {
  quiz: Quiz;
  attempt: { score: number; total: number; at: string; answers: number[] };
  onRetake: () => void;
}) {
  const pct = useMemo(() => Math.round((attempt.score / attempt.total) * 100), [attempt]);
  const passed = pct >= 70;
  return (
    <RoleDashboardLayout role="student">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/dashboard/student/quizzes"><ChevronLeft className="mr-1 h-4 w-4" /> Quizzes</Link>
        </Button>
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="overflow-hidden border-border/60 p-0 shadow-card">
          <div className="gradient-brand p-8 text-primary-foreground">
            <p className="text-sm opacity-90">{quiz.course}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{quiz.title} · Results</h1>
            <div className="mt-6 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-5xl font-semibold tracking-tight">{pct}%</p>
                <p className="text-sm opacity-90">Score {attempt.score} / {attempt.total}</p>
              </div>
              <Badge className="bg-white/20 text-white hover:bg-white/20 border-transparent">
                {passed ? "Passed" : "Try again"}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 p-4">
            <Button onClick={onRetake}><RotateCcw className="mr-1.5 h-4 w-4" /> Retake</Button>
            <Button asChild variant="outline"><Link to="/dashboard/student/quizzes">All quizzes</Link></Button>
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">Review</p>
          <div className="mt-4 space-y-3">
            {quiz.questions.map((q, i) => {
              const chosen = attempt.answers[i];
              const correct = chosen === q.answer;
              return (
                <div key={q.id} className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-start gap-3">
                    {correct ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{i + 1}. {q.text}</p>
                      <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        {q.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className={cn(
                              "rounded-md border border-border px-3 py-2 text-xs",
                              oi === q.answer && "border-success/40 bg-success/10 text-success",
                              oi === chosen && !correct && "border-destructive/40 bg-destructive/10 text-destructive",
                            )}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </RoleDashboardLayout>
  );
}
