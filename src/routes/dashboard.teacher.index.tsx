import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, BookOpen, ClipboardList, DollarSign, ListChecks, Plus, Star, Users, Video,
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
  getAssignments,
  getNotifications,
  getTeacherProgressRollup,
  type LiveSession,
  type Assignment,
  type Notif,
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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [rollup, setRollup] = useState<RollupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [coursesRes, liveRes, rollupRes]:any = await Promise.all([
        getTeacherCourses(),
        getLiveSessions(),
        getTeacherProgressRollup(),
      ]);

      if (cancelled) return;

      setCourses(Array.isArray(coursesRes) ? coursesRes : (coursesRes?.data ?? []));
      setLiveSessions(Array.isArray(liveRes) ? liveRes : (liveRes?.data ?? []));
      setRollup(Array.isArray(rollupRes) ? rollupRes : (rollupRes?.data ?? []));

      const assignRes = getAssignments();
      setAssignments(Array.isArray(assignRes) ? assignRes : []);

      const notifRes = getNotifications();
      setNotifs(Array.isArray(notifRes) ? notifRes : []);

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Derived stats ---
  const totalStudents = courses.reduce((sum, c) => sum + (c?.students ?? 0), 0);
  const totalRevenue = courses.reduce((sum, c) => sum + (c?.price ?? 0) * (c?.students ?? 0), 0);
  const publishedCourses = courses.filter((c) => c?.status === "published" || c?.is_published).length;
  const draftCourses = courses.length - publishedCourses;
  const ratedCourses = courses.filter((c) => typeof c?.rating === "number");
  const averageRating =
    ratedCourses.length > 0
      ? ratedCourses.reduce((sum, c) => sum + c.rating, 0) / ratedCourses.length
      : 0;

  const totalLessons = rollup.reduce((sum, r) => sum + (r?.totalLessons ?? 0), 0);
  const totalDone = rollup.reduce((sum, r) => sum + (r?.done ?? 0), 0);
  const completionRate = totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0;

  const totalQuizzes = courses.reduce((sum, c) => sum + (c?.quizzesCount ?? 0), 0);
  const totalAssignments = assignments.length;
  const totalLiveSessions = liveSessions.length;

  const coursesWithQuiz = rollup.filter((r) => r?.avgQuizScore > 0);
  const avgQuizScore =
    coursesWithQuiz.length > 0
      ? Math.round(coursesWithQuiz.reduce((sum, r) => sum + r.avgQuizScore, 0) / coursesWithQuiz.length)
      : 0;

  // --- Chart data ---
  const chartData = rollup.map((r) => ({
    course: r?.course?.title ?? "",
    done: r?.done ?? 0,
    pct: r?.pct ?? 0,
  }));
  const hasProgressData = chartData.length > 0;

  const revenueByCourse = courses
    .filter((c) => c?.price != null)
    .map((c) => ({ course: c?.title ?? "", revenue: (c?.price ?? 0) * (c?.students ?? 0) }));
  const hasRevenueData = revenueByCourse.length > 0;

  const topCourses = [...courses].sort((a, b) => (b?.students ?? 0) - (a?.students ?? 0)).slice(0, 4);

  // Guarded against undefined startsAt values so localeCompare never throws on mixed/legacy data
  const upcomingLive = [...liveSessions]
    .filter((s) => !s?.status)
    .sort((a, b) => (a?.startsAt ?? "").localeCompare(b?.startsAt ?? ""))
    .slice(0, 4);

  const pendingAssignments = assignments.filter((a) => a?.status === "Pending");

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("admin.totalRevenue")} value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} />
        <StatCard label={t("admin.students")} value={totalStudents.toLocaleString()} icon={Users} />
        <StatCard label={t("admin.publishedCourses")} value={String(publishedCourses)} delta={draftCourses} icon={BookOpen} />
        <StatCard label={t("about.statRating")} value={averageRating.toFixed(2)} icon={Star} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("teacher.lessonsNav")} value={String(totalLessons)} icon={BookOpen} />
        <StatCard label={t("teacher.quizzes")} value={String(totalQuizzes)} icon={ListChecks} />
        <StatCard label={t("teacher.assignments")} value={String(totalAssignments)} icon={ClipboardList} />
        <StatCard label={t("teacher.liveSessions")} value={String(totalLiveSessions)} icon={Video} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
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

        <Card className="border-border/60 p-6 shadow-card transition-shadow hover:shadow-md">
          <p className="text-sm font-semibold">{t("teacher.overviewChart.revenueTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("teacher.overviewChart.revenueDesc")}</p>
          <div className="mt-4 h-72">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : hasRevenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByCourse}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="course" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium text-muted-foreground">{t("teacher.overviewChart.noRevenueTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("teacher.overviewChart.noRevenueDesc")}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 p-6 shadow-card transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t("teacher.topCourses.title")}</p>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/teacher/courses">{t("teacher.common.viewAll")}</Link>
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
                    <p className="truncate text-xs text-muted-foreground">
                      {t("teacher.topCourses.meta", {
                        students: (c?.students ?? 0).toLocaleString(),
                        rating: (c?.rating ?? 0).toFixed(1),
                      })}
                    </p>
                  </div>
                  <Badge variant="outline">${c?.price ?? 0}</Badge>
                </div>
              ))}
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t("teacher.upcomingLive.title")}</p>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/teacher/live">{t("common.viewAll")}</Link>
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              ))}
            {!loading && upcomingLive.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">{t("teacher.upcomingLive.empty")}</p>
            )}
            {!loading &&
              upcomingLive.map((s) => (
                <div key={s?.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s?.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t("teacher.upcomingLive.meta", { startsAt: s?.startsAt, attendees: s?.attendees })}
                    </p>
                  </div>
                  <Badge variant="outline">{s?.duration}</Badge>
                </div>
              ))}
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t("common.notifications")}</p>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/teacher/notifications">{t("common.viewAll")}</Link>
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 py-3">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            {!loading &&
              notifs.slice(0, 4).map((n) => (
                <div key={n?.id} className="py-3 text-sm">
                  <p className="truncate font-medium">{n?.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n?.body}</p>
                </div>
              ))}
            {!loading && notifs.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">{t("common.allCaughtUp")}</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="border-border/60 p-6 shadow-card transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t("teacher.pendingAssignments.title")}</p>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/teacher/assignments">{t("teacher.pendingAssignments.manage")}</Link>
          </Button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-3">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          {!loading &&
            pendingAssignments.slice(0, 6).map((a) => (
              <div
                key={a?.id}
                className="rounded-lg border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <p className="truncate text-sm font-medium">{a?.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t("teacher.pendingAssignments.meta", { course: a?.course, due: a?.due })}
                </p>
              </div>
            ))}
          {!loading && pendingAssignments.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("teacher.pendingAssignments.empty")}</p>
          )}
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}