import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Award, CheckCircle2, ClipboardList, Download, History, ListChecks, TrendingUp,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { courses } from "@/lib/mock-data";
import { courseProgress, flatLessons, getAttempts, storageKeys } from "@/lib/lms-storage";
import { useEnrollmentIds, useIssuedCertificates, useProgress, useActivity } from "@/hooks/useStudentData";
import { useAssignments, useQuizzes } from "@/hooks/useTeacherData";
import { useKeyedStorage } from "@/hooks/useKeyedStorage";
import { exportProgressReport, type CourseRow } from "@/services/progressReport";
import { ProgressDetailModal } from "@/components/student/ProgressDetailModal";

export const Route = createFileRoute("/dashboard/student/progress")({
  head: () => ({ meta: [{ title: "Progress — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: ProgressPage,
});

type Range = "7d" | "30d" | "all";
const RANGE_LABEL: Record<Range, string> = { "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" };
const RANGE_MS: Record<Range, number> = { "7d": 7 * 86400000, "30d": 30 * 86400000, all: Infinity };

function ProgressPage() {
  const ids = useEnrollmentIds();
  useProgress(); // اشتراك فقط لإعادة الرسم عند تغيّر lms.progress؛ القيمة الفعلية تُقرأ عبر courseProgress
  const certs = useIssuedCertificates();
  const assignments = useAssignments();
  const quizzes = useQuizzes();
  const attempts = useKeyedStorage(storageKeys.quizAttempts, getAttempts);
  const activity = useActivity();

  const [range, setRange] = useState<Range>("all");
  const [detailCourse, setDetailCourse] = useState<CourseRow | null>(null);

  const now = Date.now();
  const withinRange = (iso: string) => range === "all" || now - new Date(iso).getTime() <= RANGE_MS[range];

  const rows: CourseRow[] = useMemo(
    () =>
      courses
        .filter((c) => ids.includes(c.id))
        .map((c) => {
          const total = flatLessons(c.id).length;
          const p = courseProgress(c.id, total);
          return { id: c.id, title: c.title, teacher: c.teacher, level: c.level, ...p };
        }),
    [ids]
  );

  const totalLessons = rows.reduce((a, r) => a + r.total, 0);
  const doneLessons = rows.reduce((a, r) => a + r.done, 0);
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;

  // فلترة الاختبارات والواجبات حسب المدى الزمني المختار (لها timestamp فعلي بعكس lms.progress)
  const takenIdsInRange = Object.keys(attempts).filter((id) => withinRange(attempts[id].at));
  const avgScore =
    takenIdsInRange.length === 0
      ? 0
      : Math.round(
          takenIdsInRange.reduce((acc, id) => acc + (attempts[id].score / attempts[id].total) * 100, 0) /
            takenIdsInRange.length
        );

  const submittedAssignments = assignments.filter((a) => a.status !== "Pending").length;

  const recentActivity = useMemo(
    () =>
      activity
        .filter((a) => ["lesson", "quiz", "assignment", "certificate"].includes(a.kind))
        .filter((a) => withinRange(a.at))
        .slice(0, 12),
    [activity, range]
  );

  const chart = rows.map((r) => ({ name: r.title.split(" ").slice(0, 2).join(" "), pct: r.pct }));

  const handleExport = () => {
    exportProgressReport({
      rangeLabel: RANGE_LABEL[range],
      avgProgress: avg,
      doneLessons,
      totalLessons,
      avgQuizScore: avgScore,
      quizzesTaken: takenIdsInRange.length,
      totalQuizzes: quizzes.length,
      submittedAssignments,
      totalAssignments: assignments.length,
      certificatesCount: certs.length,
      rows,
    });
  };

  return (
    <RoleDashboardLayout role="student">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Progress" description="See how you're moving through every enrolled course." />
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList>
              <TabsTrigger value="7d">7 days</TabsTrigger>
              <TabsTrigger value="30d">30 days</TabsTrigger>
              <TabsTrigger value="all">All time</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Average progress" value={`${avg}%`} icon={TrendingUp} />
        <StatCard label="Lessons completed" value={`${doneLessons}/${totalLessons}`} icon={CheckCircle2} />
        <StatCard label={`Quiz average (${RANGE_LABEL[range].toLowerCase()})`} value={`${avgScore}%`} icon={ListChecks} />
        <StatCard label="Certificates" value={String(certs.length)} icon={Award} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label={`Quizzes taken (${RANGE_LABEL[range].toLowerCase()})`}
          value={`${takenIdsInRange.length}/${quizzes.length}`}
          icon={ListChecks}
        />
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
        <p className="text-xs text-muted-foreground">
          Overall completion is a live snapshot and isn't affected by the time filter above.
        </p>
        <div className="mt-4 divide-y divide-border/60">
          {rows.map((c) => {
            const course = courses.find((x) => x.id === c.id)!;
            return (
              <button
                key={c.id}
                onClick={() => setDetailCourse(c)}
                className="flex w-full flex-wrap items-center gap-4 py-3 text-left transition-colors hover:bg-muted/30"
              >
                <div className="h-10 w-14 shrink-0 rounded-md" style={{ backgroundImage: course.cover }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.teacher} · {c.done}/{c.total} lessons</p>
                </div>
                <Badge variant="outline">{c.level}</Badge>
                <div className="w-56"><Progress value={c.pct} className="h-1.5" /></div>
                <div className="w-10 text-right text-sm font-semibold">{c.pct}%</div>
              </button>
            );
          })}
          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Enroll in a course to start tracking progress.
            </p>
          )}
        </div>
      </Card>

      <Card className="border-border/60 p-6 shadow-card">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <History className="h-4 w-4" /> Recent activity — {RANGE_LABEL[range]}
        </p>
        <div className="mt-4 space-y-2">
          {recentActivity.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
              <span>{a.label}</span>
              <span className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</span>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No activity in this range.</p>
          )}
        </div>
      </Card>

      <ProgressDetailModal
        course={detailCourse}
        quizzes={quizzes}
        assignments={assignments}
        attempts={attempts}
        open={!!detailCourse}
        onOpenChange={(o) => !o && setDetailCourse(null)}
      />
    </RoleDashboardLayout>
  );
}