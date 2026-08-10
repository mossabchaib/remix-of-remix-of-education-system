import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { getTeacherProgressRollup } from "@/lib/lms-storage";
import { BookOpen, CheckCircle2, TrendingUp, LineChart } from "lucide-react";

export const Route = createFileRoute("/dashboard/teacher/progress")({
  head: () => ({
    meta: [
      { title: "Student progress — Lumen" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeacherProgress,
});

type RollupRow = {
  course: { id: string; title: string; image_cover?: string };
  totalLessons: number;
  students: number;
  done: number;
  pct: number;
  avgQuizScore: number;
};

function TeacherProgress() {
  const { t } = useTranslation();
  const [rollup, setRollup] = useState<RollupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const data = await getTeacherProgressRollup();
        if (!cancelled) setRollup(data);
      } catch (err) {
        console.error("Failed to load progress rollup:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalLessons = rollup.reduce((sum, r) => sum + (r.totalLessons ?? 0), 0);
  const totalDone = rollup.reduce((sum, r) => sum + (r.done ?? 0), 0);
  const completionRate = totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0;

  const coursesWithQuiz = rollup.filter((r) => r.avgQuizScore > 0);
  const avgQuizScore =
    coursesWithQuiz.length > 0
      ? Math.round(
          coursesWithQuiz.reduce((sum, r) => sum + r.avgQuizScore, 0) / coursesWithQuiz.length
        )
      : 0;

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacherProgress.title")}
        description={t("teacherProgress.description")}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("teacherProgress.stats.lessonsTotal")} value={String(totalLessons)} icon={BookOpen} />
        <StatCard label={t("teacherProgress.stats.completionRate")} value={`${completionRate}%`} icon={TrendingUp} />
        <StatCard label={t("teacherProgress.stats.avgQuizScore")} value={`${avgQuizScore}%`} icon={CheckCircle2} />
      </div>

      <Card className="border-border/60 p-6 shadow-card">
        {loading ? (
          <div className="divide-y divide-border/60">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-wrap items-center gap-4 py-3">
                <Skeleton className="h-9 w-14 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-2 w-full sm:w-56" />
                <Skeleton className="h-5 w-10" />
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            title={t("teacherProgress.error.title")}
            description={t("teacherProgress.error.description")}
          />
        ) : rollup.length === 0 ? (
          <EmptyState
            icon={LineChart}
            title={t("teacherProgress.empty.title")}
            description={t("teacherProgress.empty.description")}
          />
        ) : (
          <div className="divide-y divide-border/60">
            {rollup.map((r) => (
              <div key={r.course.id} className="flex flex-wrap items-center gap-4 py-3">
                <div
                  className="h-9 w-14 shrink-0 rounded-md bg-muted bg-cover bg-center"
                  style={
                    r.course.image_cover
                      ? { backgroundImage: `url(${r.course.image_cover})` }
                      : undefined
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.course.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t("teacherProgress.rowSummary", {
                      students: r.students.toLocaleString(),
                      done: r.done,
                      total: r.totalLessons,
                    })}
                  </p>
                </div>
                <div className="w-full sm:w-56">
                  <Progress value={r.pct} className="h-2" />
                </div>
                <Badge variant="outline">{r.pct}%</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </RoleDashboardLayout>
  );
}