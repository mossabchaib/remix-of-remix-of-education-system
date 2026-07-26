import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Award, CheckCircle2, ClipboardList, ListChecks, TrendingUp } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { courses } from "@/lib/mock-data";
import { courseProgress, flatLessons, getAttempts } from "@/lib/lms-storage";
import { useEnrollmentIds, useIssuedCertificates, useProgress } from "@/hooks/useStudentData";
import { useAssignments, useQuizzes } from "@/hooks/useTeacherData";
import { useKeyedStorage } from "@/hooks/useKeyedStorage";
import { storageKeys } from "@/lib/lms-storage";

export const Route = createFileRoute("/dashboard/student/progress")({
  head: () => ({ meta: [{ title: "Progress — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const ids = useEnrollmentIds();
  useProgress();
  const certs = useIssuedCertificates();
  const assignments = useAssignments();
  const quizzes = useQuizzes();
  const attempts = useKeyedStorage(storageKeys.quizAttempts, getAttempts);

  const rows = useMemo(() =>
    courses.filter((c) => ids.includes(c.id)).map((c) => {
      const total = flatLessons(c.id).length;
      return { ...c, ...courseProgress(c.id, total) };
    }),
    [ids],
  );

  const totalLessons = rows.reduce((a, r) => a + r.total, 0);
  const doneLessons = rows.reduce((a, r) => a + r.done, 0);
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;

  const takenIds = Object.keys(attempts);
  const avgScore =
    takenIds.length === 0
      ? 0
      : Math.round(
          takenIds.reduce((acc, id) => acc + (attempts[id].score / attempts[id].total) * 100, 0) /
            takenIds.length,
        );
  const submittedAssignments = assignments.filter((a) => a.status !== "Pending").length;

  const chart = rows.map((r) => ({ name: r.title.split(" ").slice(0, 2).join(" "), pct: r.pct }));

  return (
    <RoleDashboardLayout role="student">
      <PageHeader title="Progress" description="See how you're moving through every enrolled course." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Average progress" value={`${avg}%`} icon={TrendingUp} />
        <StatCard label="Lessons completed" value={`${doneLessons}/${totalLessons}`} icon={CheckCircle2} />
        <StatCard label="Quiz average" value={`${avgScore}%`} icon={ListChecks} />
        <StatCard label="Certificates" value={String(certs.length)} icon={Award} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard label="Quizzes taken" value={`${takenIds.length}/${quizzes.length}`} icon={ListChecks} />
        <StatCard
          label="Assignments submitted"
          value={`${submittedAssignments}/${assignments.length}`}
          icon={ClipboardList}
        />
        <StatCard label="Courses completed" value={String(rows.filter((r) => r.pct === 100).length)} icon={CheckCircle2} />
      </div>

      {rows.length > 0 && (
        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">Progress by course</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="pct" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="border-border/60 p-6 shadow-card">
        <p className="text-sm font-semibold">Course progress</p>
        <div className="mt-4 divide-y divide-border/60">
          {rows.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-4 py-3">
              <div className="h-10 w-14 shrink-0 rounded-md" style={{ backgroundImage: c.cover }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="truncate text-xs text-muted-foreground">{c.teacher} · {c.done}/{c.total} lessons</p>
              </div>
              <Badge variant="outline">{c.level}</Badge>
              <div className="w-56"><Progress value={c.pct} className="h-1.5" /></div>
              <div className="w-10 text-right text-sm font-semibold">{c.pct}%</div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Enroll in a course to start tracking progress.
            </p>
          )}
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}
