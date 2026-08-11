import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, BookOpen, Plus, Video,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTeacherCourses,
  getLiveSessions,
  getTeacherProgressRollup,
  type LiveSession,
} from "@/lib/lms-storage";

export const Route = createFileRoute("/dashboard/teacher/")({
  head: () => ({ meta: [{ title: "Overview — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherOverview,
});

type RollupRow = {
  course: { id: string; title: string; image_cover?: string };
  totalLessons: number;
  students: number;
  done: number;
  pct: number;
  avgQuizScore: number;
};

function TeacherOverview() {
  const { t } = useTranslation();

  const [courses, setCourses] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [rollup, setRollup] = useState<RollupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [coursesRes, liveRes, rollupRes]: any = await Promise.all([
        getTeacherCourses(),
        getLiveSessions(),
        getTeacherProgressRollup(),
      ]);

      if (cancelled) return;

      setCourses(Array.isArray(coursesRes) ? coursesRes : (coursesRes?.data ?? []));
      setLiveSessions(Array.isArray(liveRes) ? liveRes : (liveRes?.data ?? []));
      setRollup(Array.isArray(rollupRes) ? rollupRes : (rollupRes?.data ?? []));

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Derived stats ---
  const totalStudents = courses.reduce((sum, c) => sum + (c?.students ?? 0), 0);
  const publishedCourses = courses.filter((c) => c?.status === "published" || c?.is_published).length;
  const draftCourses = courses.length - publishedCourses;

  const totalLessons = rollup.reduce((sum, r) => sum + (r?.totalLessons ?? 0), 0);
  const totalDone = rollup.reduce((sum, r) => sum + (r?.done ?? 0), 0);
  const completionRate = totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0;
  const totalLiveSessions = liveSessions.length;

  // --- Chart data ---
  const chartData = rollup.map((r) => ({
    course: r?.course?.title ?? "",
    done: r?.done ?? 0,
    pct: r?.pct ?? 0,
  }));
  const hasProgressData = chartData.length > 0;

  const topCourses = [...courses].sort((a, b) => (b?.students ?? 0) - (a?.students ?? 0)).slice(0, 4);

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacher.overview")}
        description={t("teacher.overviewDesc")}
        actions={
          <Button asChild size="sm">
            <Link to="/dashboard/teacher/courses/new">
              <Plus className="me-1.5 h-4 w-4" /> {t("teacher.createCourse")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("teacher.lessonsNav")} value={String(totalLessons)} icon={BookOpen} />
        <StatCard label={t("admin.publishedCourses")} value={String(publishedCourses)} delta={draftCourses} icon={BookOpen} />
        <StatCard label={t("teacher.liveSessions")} value={String(totalLiveSessions)} icon={Video} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* قسم الـ Chart */}
        <Card className="border-border/60 p-6 shadow-card transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{t("teacher.overviewChart.lessonsTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {t("teacher.overviewChart.lessonsDesc", {
                  students: totalStudents.toLocaleString(),
                  courses: courses.length,
                })}
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <ArrowUpRight className="h-3 w-3" />
              {t("teacher.overviewChart.completionBadge", { rate: completionRate })}
            </Badge>
          </div>
          <div className="mt-4 h-72">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : hasProgressData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="lessonsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="course" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="done" stroke="var(--primary)" strokeWidth={2} fill="url(#lessonsGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium text-muted-foreground">{t("teacher.overviewChart.noEnrollmentTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("teacher.overviewChart.noEnrollmentDesc")}</p>
              </div>
            )}
          </div>
        </Card>

        {/* قسم أفضل الدورات (Top Courses) بجانب الرسم البياني */}
        <Card className="border-border/60 p-6 shadow-card transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t("teacher.topCourses.title")}</p>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/teacher/courses">{t("common.viewAll")}</Link>
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-9 w-14 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            {!loading && topCourses.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">{t("teacher.topCourses.empty")}</p>
            )}
            {!loading &&
              topCourses.map((c) => (
                <div key={c?.id} className="flex items-center gap-3 py-3">
                  <div
                    className="h-9 w-14 shrink-0 rounded-md bg-muted bg-cover bg-center"
                    style={c?.image_cover ? { backgroundImage: `url(${c.image_cover})` } : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c?.title}</p>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </RoleDashboardLayout>
  );
}