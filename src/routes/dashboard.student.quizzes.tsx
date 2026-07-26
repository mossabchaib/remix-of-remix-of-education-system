import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, ListChecks, TrendingUp } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/StatCard";
import { getAttempts } from "@/lib/lms-storage";
import { useQuizzes } from "@/hooks/useTeacherData";

export const Route = createFileRoute("/dashboard/student/quizzes")({
  head: () => ({ meta: [{ title: "Quizzes — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Quizzes,
});

function Quizzes() {
  const quizzes = useQuizzes();
  const attempts = getAttempts();

  const taken = Object.keys(attempts).length;
  const avg =
    taken === 0
      ? 0
      : Math.round(
          (Object.values(attempts).reduce((acc, a) => acc + (a.score / a.total) * 100, 0) / taken) * 10,
        ) / 10;

  return (
    <RoleDashboardLayout role="student">
      <PageHeader title="Quizzes" description="Test what you've learned and review past attempts." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Available" value={String(quizzes.length)} icon={ListChecks} />
        <StatCard label="Attempts" value={String(taken)} icon={Clock} />
        <StatCard label="Average score" value={`${avg}%`} icon={TrendingUp} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quizzes.map((q) => {
          const a = attempts[q.id];
          return (
            <Card key={q.id} className="border-border/60 p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{q.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{q.course}</p>
                </div>
                {a ? (
                  <Badge
                    variant="outline"
                    className={
                      (a.score / a.total) >= 0.7
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    }
                  >
                    {a.score}/{a.total}
                  </Badge>
                ) : (
                  <Badge variant="outline">Not taken</Badge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{q.questions.length} questions</Badge>
                <Badge variant="outline">{q.minutes} min</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild className="flex-1">
                  <Link to="/dashboard/student/quizzes/$id" params={{ id: q.id }}>
                    {a ? "Retake" : "Start quiz"}
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </RoleDashboardLayout>
  );
}
