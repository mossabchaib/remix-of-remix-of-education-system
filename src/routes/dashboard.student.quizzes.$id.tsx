import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronLeft, RotateCcw, Timer, XCircle, Loader2 } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  getQuiz, getMyAttempts, saveAttempt,
  type Quiz, type Question, type QuestionAnswer, type QuizAttempt,
} from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/quizzes/$id")({
  head: () => ({ meta: [{ title: "Quiz — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: QuizPage,
});

/* =========================================================
   Normalizer — full protection against incomplete API data
   ========================================================= */
function normalizeQuestion(raw: any): Question {
  const base = { id: raw?.id, type: raw?.type ?? "qcm", text: raw?.text ?? "" };

  if (base.type === "qcm") {
    const opts = (raw?.question_options ?? raw?.options ?? []).slice().sort(
      (a: any, b: any) => (a?.order_index ?? 0) - (b?.order_index ?? 0)
    );
    if (typeof opts[0] === "string") {
      return { ...base, options: opts, correctOptionIndexes: raw?.correctOptionIndexes ?? [] } as Question;
    }
    return {
      ...base,
      options: opts.map((o: any) => o?.option_text ?? ""),
      correctOptionIndexes: opts
        .map((o: any, idx: number) => (o?.is_correct ? idx : -1))
        .filter((idx: number) => idx !== -1),
    } as Question;
  }

  if (base.type === "true_false") {
    if (typeof raw?.correctBoolean === "boolean") return { ...base, correctBoolean: raw.correctBoolean } as Question;
    const tf = Array.isArray(raw?.question_true_false) ? raw.question_true_false[0] : raw?.question_true_false;
    return { ...base, correctBoolean: tf?.correct_boolean ?? false } as Question;
  }

  if (base.type === "matching") {
    if (Array.isArray(raw?.pairs) && raw.pairs[0]?.left !== undefined) {
      return { ...base, pairs: raw.pairs } as Question;
    }
    return {
      ...base,
      pairs: (raw?.matching_pairs ?? []).map((p: any) => ({ id: p?.id, left: p?.left_text ?? "", right: p?.right_text ?? "" })),
    } as Question;
  }

  return base as Question;
}

function normalizeQuiz(raw: any): Quiz {
  return {
    id: raw?.id ?? "",
    title: raw?.title ?? "",
    course: raw?.course ?? raw?.course_title ?? "",
    minutes: raw?.minutes ?? 0,
    questions: (raw?.questions ?? [])
      .slice()
      .sort((a: any, b: any) => (a?.order_index ?? 0) - (b?.order_index ?? 0))
      .map(normalizeQuestion),
  };
}

function emptyAnswer(q: Question): QuestionAnswer {
  const type = q?.type ?? "qcm";
  if (type === "qcm") return { type: "qcm", selected: [] };
  if (type === "true_false") return { type: "true_false", selected: undefined as unknown as boolean };
  return { type: "matching", selected: {} };
}

function isAnswered(q: Question, a: QuestionAnswer | undefined): boolean {
  if (!q || !a) return false;
  if (a.type === "qcm") return Array.isArray(a.selected) && a.selected.length > 0;
  if (a.type === "true_false") return a.selected === true || a.selected === false;
  if (a.type === "matching") return (q.pairs ?? []).every((p) => p?.id && !!a.selected?.[p.id]);
  return false;
}

function gradeAttempt(quiz: Quiz, answers: Record<string, QuestionAnswer>) {
  let score = 0;
  const questions = quiz?.questions ?? [];
  for (const q of questions) {
    if (!q?.id) continue;
    const a = answers[q.id];
    if (!a) continue;
    if (q.type === "qcm" && a.type === "qcm") {
      const expected = [...(q.correctOptionIndexes ?? [])].sort();
      const got = [...(a.selected ?? [])].sort();
      if (expected.length === got.length && expected.every((v, i) => v === got[i])) score++;
    } else if (q.type === "true_false" && a.type === "true_false") {
      if (a.selected === q.correctBoolean) score++;
    } else if (q.type === "matching" && a.type === "matching") {
      const allCorrect = (q.pairs ?? []).every((p) => p?.id && a.selected?.[p.id] === p?.right);
      if (allCorrect) score++;
    }
  }
  return { score, total: questions.length };
}

function formatDuration(seconds: number) {
  const safeSecs = isNaN(seconds) ? 0 : seconds;
  const m = Math.floor(safeSecs / 60);
  const s = safeSecs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function QuizPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [existing, setExisting] = useState<QuizAttempt & { quizId?: string; durationSeconds?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [mode, setMode] = useState<"take" | "results">("take");
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);

  async function load() {
    setLoading(true);
    try {
      const raw = await getQuiz(id);
      if (!raw) {
        setNotFound(true);
        return;
      }
      const data = normalizeQuiz(raw);
      setQuiz(data);

      const attempts = await getMyAttempts();
      const found = (attempts as any[] || []).find((a) => a?.quiz_id === id || a?.quizId === id);

      if (found) {
        setExisting(found);
        setMode("results");
      } else {
        setAnswers(Object.fromEntries((data.questions ?? []).map((q) => [q?.id, emptyAnswer(q)])));
        setMode("take");
        startTimer();
      }
    } catch (err) {
      console.error("Failed to load quiz:", err);
      toast.error(t("quizPage.toast.loadError"));
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function startTimer() {
    stopTimer();
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    autoSubmittedRef.current = false;
    timerIdRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(secs);
    }, 1000);
  }

  function stopTimer() {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  }

  function getElapsedSeconds() {
    if (!startTimeRef.current) return elapsedSeconds;
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }

  const timeLimitSeconds = (quiz?.minutes ?? 0) * 60;
  const timeLeft = Math.max(0, timeLimitSeconds - elapsedSeconds);

  useEffect(() => {
    if (mode !== "take" || !quiz) return;
    if (timeLimitSeconds > 0 && elapsedSeconds >= timeLimitSeconds && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      toast.warning(t("quizPage.toast.timeUp"));
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, mode, quiz]);

  if (loading) {
    return (
      <RoleDashboardLayout role="student">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-6 w-40" />
          <Card className="border-border/60 p-8 shadow-card">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="mt-4 h-2 w-full" />
            <Skeleton className="mt-8 h-5 w-3/4" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </Card>
        </div>
      </RoleDashboardLayout>
    );
  }

  if (notFound || !quiz) {
    return (
      <RoleDashboardLayout role="student">
        <Card className="border-border/60 p-10 text-center shadow-card">
          <p className="text-lg font-semibold">{t("quizPage.notFound")}</p>
          <Button asChild className="mt-4">
            <Link to="/dashboard/student/quizzes">{t("quizPage.backToQuizzes")}</Link>
          </Button>
        </Card>
      </RoleDashboardLayout>
    );
  }

  if (mode === "results" && existing) {
    return (
      <Results
        quiz={quiz}
        attempt={existing}
        onRetake={() => {
          setAnswers(Object.fromEntries((quiz.questions ?? []).map((q) => [q?.id, emptyAnswer(q)])));
          setStep(0);
          setExisting(null);
          setMode("take");
          startTimer();
        }}
      />
    );
  }

  const questions = quiz.questions ?? [];
  const q = questions[step] ?? questions[0];
  const answered = questions.filter((qq) => isAnswered(qq, answers[qq?.id])).length;
  const totalQuestions = questions.length || 1;
  const pct = (answered / totalQuestions) * 100;
  const currentAnswered = isAnswered(q, answers[q?.id]);

  function updateAnswer(next: QuestionAnswer) {
    if (!q?.id) return;
    setAnswers((prev) => ({ ...prev, [q.id]: next }));
  }

  async function submit() {
    if (submitting || !quiz) return;
    setSubmitting(true);
    stopTimer();
    try {
      const durationSeconds = getElapsedSeconds();
      const { score, total } = gradeAttempt(quiz, answers);
      const saved = await saveAttempt(quiz.id, { score, total, answers, durationSeconds } as any);
      setExisting({
        score,
        total,
        at: new Date().toISOString(),
        answers,
        durationSeconds,
        ...saved,
      });
      toast.success(t("quizPage.toast.submitSuccess", { score, total, duration: formatDuration(durationSeconds) }));
      setMode("results");
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      toast.error(t("quizPage.toast.submitError"));
      startTimer();
    } finally {
      setSubmitting(false);
    }
  }

  const timeIsLow = timeLimitSeconds > 0 && timeLeft <= 30;

  if (!q) {
    return (
      <RoleDashboardLayout role="student">
        <Card className="border-border/60 p-10 text-center shadow-card">
          <p className="text-lg font-semibold">{t("quizPage.noQuestions")}</p>
          <Button asChild className="mt-4">
            <Link to="/dashboard/student/quizzes">{t("quizPage.backToQuizzes")}</Link>
          </Button>
        </Card>
      </RoleDashboardLayout>
    );
  }

  return (
    <RoleDashboardLayout role="student">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/dashboard/student/quizzes">
            <ChevronLeft className="mr-1 h-4 w-4" /> {t("quizPage.quizzes")}
          </Link>
        </Button>
        <span>/</span>
        <span className="truncate">{quiz?.title}</span>
      </div>

      <Card className="mx-auto max-w-3xl border-border/60 p-8 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{quiz?.course}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{quiz?.title}</h1>
          </div>
          <Badge
            variant="outline"
            className={cn("gap-1 tabular-nums", timeIsLow && "border-destructive/40 bg-destructive/10 text-destructive")}
          >
            <Timer className="h-3 w-3" />
            {timeLimitSeconds > 0 ? formatDuration(timeLeft) : formatDuration(elapsedSeconds)}
          </Badge>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("quizPage.questionOf", { current: step + 1, total: totalQuestions })}</span>
            <span>{t("quizPage.percentAnswered", { pct: Math.round(pct) })}</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        <div className="mt-8">
          <p className="text-base font-medium">{q?.text ?? ""}</p>
          <QuestionInput question={q} answer={answers[q?.id]} onChange={updateAnswer} />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
            {t("quizPage.previous")}
          </Button>
          {step === totalQuestions - 1 ? (
            <Button onClick={submit} disabled={!currentAnswered || submitting}>
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {submitting ? t("quizPage.submitting") : t("quizPage.submitQuiz")}
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!currentAnswered}>
              {t("quizPage.next")}
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
  question?: Question;
  answer?: QuestionAnswer;
  onChange: (a: QuestionAnswer) => void;
}) {
  const { t } = useTranslation();
  const type = question?.type ?? "qcm";

  // Hooks must run unconditionally on every render, regardless of question type,
  // so this is computed up front even when the value isn't used for qcm/true_false.
  const pairs = question?.pairs ?? [];
  const rightOptions = useMemo(() => pairs.map((p) => p?.right ?? "").filter(Boolean), [pairs]);

  if (!question) return null;

  if (type === "qcm") {
    const selected = answer?.type === "qcm" ? (answer?.selected ?? []) : [];
    const options = question?.options ?? [];
    return (
      <div className="mt-4 space-y-2">
        {options.map((opt, i) => {
          const isChosen = selected?.includes(i);
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
        <p className="pt-1 text-xs text-muted-foreground">{t("quizPage.multiSelectHint")}</p>
      </div>
    );
  }

  if (type === "true_false") {
    const selected = answer?.type === "true_false" ? answer?.selected : undefined;
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
            {val ? t("quizPage.true") : t("quizPage.false")}
          </button>
        ))}
      </div>
    );
  }

  const selected = answer?.type === "matching" ? (answer?.selected ?? {}) : {};

  return (
    <div className="mt-4 space-y-3">
      {pairs.map((p) => {
        if (!p?.id) return null;
        return (
          <div key={p.id} className="flex items-center gap-3">
            <div className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
              {p?.left ?? ""}
            </div>
            <span className="text-muted-foreground">↔</span>
            <Select
              value={selected[p.id] ?? ""}
              onValueChange={(v) => onChange({ type: "matching", selected: { ...selected, [p.id]: v } })}
            >
              <SelectTrigger className="flex-1"><SelectValue placeholder={t("quizPage.chooseMatch")} /></SelectTrigger>
              <SelectContent>
                {rightOptions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

function Results({
  quiz,
  attempt,
  onRetake,
}: {
  quiz: Quiz;
  attempt: {
    score: number;
    total: number;
    at?: string;
    answers: Record<string, QuestionAnswer>;
    durationSeconds?: number;
  };
  onRetake: () => void;
}) {
  const { t } = useTranslation();
  const safeTotal = attempt?.total || 1;
  const safeScore = attempt?.score || 0;
  const pct = useMemo(() => Math.round((safeScore / safeTotal) * 100), [safeScore, safeTotal]);
  const passed = pct >= 70;
  const questions = quiz?.questions ?? [];

  return (
    <RoleDashboardLayout role="student">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/dashboard/student/quizzes"><ChevronLeft className="mr-1 h-4 w-4" /> {t("quizPage.quizzes")}</Link>
        </Button>
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="overflow-hidden border-border/60 p-0 shadow-card">
          <div className="gradient-brand p-8 text-primary-foreground">
            <p className="text-sm opacity-90">{quiz?.course ?? ""}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {t("quizPage.results.heading", { title: quiz?.title ?? "" })}
            </h1>
            <div className="mt-6 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-5xl font-semibold tracking-tight">{pct}%</p>
                <p className="text-sm opacity-90">
                  {t("quizPage.results.scoreLabel", { score: safeScore, total: safeTotal })}
                </p>
              </div>
              {typeof attempt?.durationSeconds === "number" && (
                <div>
                  <p className="flex items-center gap-1 text-2xl font-semibold tracking-tight">
                    <Timer className="h-5 w-5" /> {formatDuration(attempt.durationSeconds)}
                  </p>
                  <p className="text-sm opacity-90">{t("quizPage.results.timeTaken")}</p>
                </div>
              )}
              <Badge className="border-transparent bg-white/20 text-white hover:bg-white/20">
                {passed ? t("quizPage.results.passed") : t("quizPage.results.tryAgain")}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 p-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> {t("quizPage.results.retake")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("quizPage.results.retakeConfirm.title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("quizPage.results.retakeConfirm.description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("quizPage.results.retakeConfirm.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={onRetake}>
                    {t("quizPage.results.retakeConfirm.confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button asChild variant="outline">
              <Link to="/dashboard/student/quizzes">{t("quizPage.results.allQuizzes")}</Link>
            </Button>
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">{t("quizPage.results.review")}</p>
          <div className="mt-4 space-y-3">
            {questions.map((q, i) => {
              if (!q?.id) return null;
              return <QuestionReview key={q.id} index={i} question={q} answer={attempt?.answers?.[q.id]} />;
            })}
          </div>
        </Card>
      </div>
    </RoleDashboardLayout>
  );
}

function QuestionReview({ index, question, answer }: { index: number; question?: Question; answer?: QuestionAnswer }) {
  const { t } = useTranslation();
  if (!question) return null;

  let correct = false;
  const type = question?.type;

  if (type === "qcm" && answer?.type === "qcm") {
    const expected = [...(question.correctOptionIndexes ?? [])].sort();
    const got = [...(answer?.selected ?? [])].sort();
    correct = expected.length === got.length && expected.every((v, idx) => v === got[idx]);
  } else if (type === "true_false" && answer?.type === "true_false") {
    correct = answer?.selected === question?.correctBoolean;
  } else if (type === "matching" && answer?.type === "matching") {
    correct = (question.pairs ?? []).every((p) => p?.id && answer?.selected?.[p.id] === p?.right);
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
          <p className="text-sm font-medium">{index + 1}. {question?.text ?? ""}</p>

          {type === "qcm" && answer?.type === "qcm" && (
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {(question.options ?? []).map((opt, oi) => {
                const isCorrectOpt = (question.correctOptionIndexes ?? []).includes(oi);
                const wasChosen = (answer?.selected ?? []).includes(oi);
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

          {type === "true_false" && answer?.type === "true_false" && (
            <div className="mt-2 flex gap-2">
              <div className={cn(
                "rounded-md border px-3 py-2 text-xs",
                question.correctBoolean ? "border-success/40 bg-success/10 text-success" : "border-border"
              )}>
                {t("quizPage.true")} {question.correctBoolean && `· ${t("quizPage.results.correctAnswer")}`}
              </div>
              <div className={cn(
                "rounded-md border px-3 py-2 text-xs",
                !question.correctBoolean ? "border-success/40 bg-success/10 text-success" : "border-border"
              )}>
                {t("quizPage.false")} {!question.correctBoolean && `· ${t("quizPage.results.correctAnswer")}`}
              </div>
              {!correct && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {t("quizPage.results.youAnswered", { value: answer?.selected ? t("quizPage.true") : t("quizPage.false") })}
                </div>
              )}
            </div>
          )}

          {type === "matching" && answer?.type === "matching" && (
            <div className="mt-2 space-y-1.5">
              {(question.pairs ?? []).map((p) => {
                if (!p?.id) return null;
                const yourMatch = answer?.selected?.[p.id];
                const isRight = yourMatch === p?.right;
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-muted/40 px-2 py-1">{p?.left ?? ""}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={cn(
                      "rounded-md border px-2 py-1",
                      isRight ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"
                    )}>
                      {yourMatch || t("quizPage.results.noAnswer")}
                    </span>
                    {!isRight && (
                      <span className="rounded-md border border-success/40 bg-success/10 px-2 py-1 text-success">
                        {t("quizPage.results.correctValue", { value: p?.right ?? "" })}
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