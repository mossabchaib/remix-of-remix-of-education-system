import { createFileRoute } from "@tanstack/react-router";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/StatCard";
import { useCourseProgressRollup, useTeacherStats } from "@/hooks/useTeacherStats";
import { BookOpen, CheckCircle2, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/dashboard/teacher/progress")({
  head: () => ({ meta: [{ title: "Student progress — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherProgress,
});

function TeacherProgress() {
  const rollup = useCourseProgressRollup();
  const stats = useTeacherStats();
  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader title="Course progress" description="Aggregate lesson completion across your catalog." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Lessons total" value={String(stats.totalLessons)} icon={BookOpen} />
        <StatCard label="Completion rate" value={`${stats.completionRate}%`} icon={TrendingUp} />
        <StatCard label="Avg quiz score" value={`${stats.averageQuizScore}%`} icon={CheckCircle2} />
      </div>
      <Card className="border-border/60 p-6 shadow-card">
        <div className="divide-y divide-border/60">
          {rollup.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No courses yet.</p>}
          {rollup.map(({ course, done, totalLessons, pct }) => (
            <div key={course.id} className="flex flex-wrap items-center gap-4 py-3">
              <div className="h-9 w-14 shrink-0 rounded-md" style={{ backgroundImage: course.cover }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{course.title}</p>
                <p className="truncate text-xs text-muted-foreground">{course.students.toLocaleString()} students · {done}/{totalLessons} lessons complete</p>
              </div>
              <div className="w-full sm:w-56">
                <Progress value={pct} className="h-2" />
              </div>
              <Badge variant="outline">{pct}%</Badge>
            </div>
          ))}
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}
