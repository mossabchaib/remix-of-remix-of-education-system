import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, RotateCcw, Timer, XCircle } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getAttempts, saveAttempt, type Quiz, type Question, type QuestionAnswer } from "@/lib/lms-storage";
import { QuizService } from "@/services/quizService";
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

function emptyAnswer(q: Question): QuestionAnswer {
  if (q.type === "qcm") return { type: "qcm", selected: [] };
  if (q.type === "true_false") return { type: "true_false", selected: undefined as unknown as boolean };
  return { type: "matching", selected: {} };
}

function isAnswered(q: Question, a: QuestionAnswer | undefined): boolean {
  if (!a) return false;
  if (a.type === "qcm") return a.selected.length > 0;
  if (a.type === "true_false") return a.selected === true || a.selected === false;
  if (a.type === "matching") return (q.pairs ?? []).every((p) => !!a.selected[p.id]);
  return false;
}

function QuizPage() {
  const { quiz } = Route.useLoaderData() as { quiz: Quiz };
  const existing = getAttempts()[quiz.id];

  const [mode, setMode] = useState<"take" | "results">(existing ? "results" : "take");
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>(
    existing?.answers ?? Object.fromEntries(quiz.questions.map((q) => [q.id, emptyAnswer(q)]))
  );
  const [step, setStep] = useState(0);

  if (mode === "results" && existing) {
    return (
      <Results
        quiz={quiz}
        attempt={existing}
        onRetake={() => {
          setAnswers(Object.fromEntries(quiz.questions.map((q) => [q.id, emptyAnswer(q)])));
          setStep(0);
          setMode("take");
        }}
      />
    );
  }

  const q = quiz.questions[step];
  const answered = quiz.questions.filter((qq) => isAnswered(qq, answers[qq.id])).length;
  const pct = (answered / quiz.questions.length) * 100;
  const currentAnswered = isAnswered(q, answers[q.id]);

  function updateAnswer(next: QuestionAnswer) {
    setAnswers((prev) => ({ ...prev, [q.id]: next }));
  }

  function submit() {
    const { score, total } = QuizService.gradeAttempt(quiz, answers);
    saveAttempt(quiz.id, { score, total, at: new Date().toISOString(), answers });
    toast.success(`You scored ${score}/${total}`);
    setMode("results");
  }

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
            <span>{Math.round(pct)}% answered</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        <div className="mt-8">
          <p className="text-base font-medium">{q.text}</p>
          <QuestionInput question={q} answer={answers[q.id]} onChange={updateAnswer} />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Previous
          </Button>
          {step === quiz.questions.length - 1 ? (
            <Button onClick={submit} disabled={!currentAnswered}>Submit quiz</Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!currentAnswered}>
              Next
            </Button>
          )}
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}

function QuestionInput({
  question,
  answer,
  onChange,
}: {
  question: Question;
  answer: QuestionAnswer;
  onChange: (a: QuestionAnswer) => void;
}) {
  if (question.type === "qcm") {
    const selected = answer.type === "qcm" ? answer.selected : [];
    return (
      <div className="mt-4 space-y-2">
        {(question.options ?? []).map((opt, i) => {
          const isChosen = selected.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                const next = isChosen ? selected.filter((s) => s !== i) : [...selected, i];
                onChange({ type: "qcm", selected: next });
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/40",
                isChosen && "border-primary bg-primary-soft"
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  isChosen ? "border-primary bg-primary" : "border-border"
                )}
              >
                {isChosen && <CheckCircle2 className="h-4 w-4 text-primary-foreground" />}
              </span>
              <span className="flex-1 text-sm">{opt}</span>
            </button>
          );
        })}
        <p className="pt-1 text-xs text-muted-foreground">You can select more than one option if applicable.</p>
      </div>
    );
  }

  if (question.type === "true_false") {
    const selected = answer.type === "true_false" ? answer.selected : undefined;
    return (
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[true, false].map((val) => (
          <button
            key={String(val)}
            type="button"
            onClick={() => onChange({ type: "true_false", selected: val })}
            className={cn(
              "rounded-xl border border-border p-5 text-center text-sm font-medium transition-colors hover:bg-muted/40",
              selected === val && "border-primary bg-primary-soft text-primary"
            )}
          >
            {val ? "True" : "False"}
          </button>
        ))}
      </div>
    );
  }

  // matching
  const pairs = question.pairs ?? [];
  const selected = answer.type === "matching" ? answer.selected : {};
  const rightOptions = useMemo(() => pairs.map((p) => p.right), [pairs]);

  return (
    <div className="mt-4 space-y-3">
      {pairs.map((p) => (
        <div key={p.id} className="flex items-center gap-3">
          <div className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
            {p.left}
          </div>
          <span className="text-muted-foreground">↔</span>
          <Select
            value={selected[p.id] ?? ""}
            onValueChange={(v) => onChange({ type: "matching", selected: { ...selected, [p.id]: v } })}
          >
            <SelectTrigger className="flex-1"><SelectValue placeholder="Choose a match…" /></SelectTrigger>
            <SelectContent>
              {rightOptions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

function Results({
  quiz,
  attempt,
  onRetake,
}: {
  quiz: Quiz;
  attempt: { score: number; total: number; at: string; answers: Record<string, QuestionAnswer> };
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
            {quiz.questions.map((q, i) => (
              <QuestionReview key={q.id} index={i} question={q} answer={attempt.answers[q.id]} />
            ))}
          </div>
        </Card>
      </div>
    </RoleDashboardLayout>
  );
}

function QuestionReview({ index, question, answer }: { index: number; question: Question; answer?: QuestionAnswer }) {
  let correct = false;

  if (question.type === "qcm" && answer?.type === "qcm") {
    const expected = [...(question.correctOptionIndexes ?? [])].sort();
    const got = [...answer.selected].sort();
    correct = expected.length === got.length && expected.every((v, idx) => v === got[idx]);
  } else if (question.type === "true_false" && answer?.type === "true_false") {
    correct = answer.selected === question.correctBoolean;
  } else if (question.type === "matching" && answer?.type === "matching") {
    correct = (question.pairs ?? []).every((p) => answer.selected[p.id] === p.right);
  }

  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="flex items-start gap-3">
        {correct ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{index + 1}. {question.text}</p>

          {question.type === "qcm" && answer?.type === "qcm" && (
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {(question.options ?? []).map((opt, oi) => {
                const isCorrectOpt = (question.correctOptionIndexes ?? []).includes(oi);
                const wasChosen = answer.selected.includes(oi);
                return (
                  <div
                    key={oi}
                    className={cn(
                      "rounded-md border border-border px-3 py-2 text-xs",
                      isCorrectOpt && "border-success/40 bg-success/10 text-success",
                      wasChosen && !isCorrectOpt && "border-destructive/40 bg-destructive/10 text-destructive"
                    )}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          )}

          {question.type === "true_false" && answer?.type === "true_false" && (
            <div className="mt-2 flex gap-2">
              <div className={cn(
                "rounded-md border px-3 py-2 text-xs",
                question.correctBoolean ? "border-success/40 bg-success/10 text-success" : "border-border"
              )}>
                True {question.correctBoolean && "· Correct answer"}
              </div>
              <div className={cn(
                "rounded-md border px-3 py-2 text-xs",
                !question.correctBoolean ? "border-success/40 bg-success/10 text-success" : "border-border"
              )}>
                False {!question.correctBoolean && "· Correct answer"}
              </div>
              {!correct && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  You answered: {answer.selected ? "True" : "False"}
                </div>
              )}
            </div>
          )}

          {question.type === "matching" && answer?.type === "matching" && (
            <div className="mt-2 space-y-1.5">
              {(question.pairs ?? []).map((p) => {
                const yourMatch = answer.selected[p.id];
                const isRight = yourMatch === p.right;
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-muted/40 px-2 py-1">{p.left}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={cn(
                      "rounded-md border px-2 py-1",
                      isRight ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"
                    )}>
                      {yourMatch || "No answer"}
                    </span>
                    {!isRight && (
                      <span className="rounded-md border border-success/40 bg-success/10 px-2 py-1 text-success">
                        Correct: {p.right}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}