import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Award, BookOpen, CheckCircle2, Clock, Crown, Heart, ListChecks,
  Lock, PlayCircle, Sparkles, Video,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { revenueSeries } from "@/lib/mock-data";
import {
  courseProgress,
  getAllCourses,
  getLiveSessions,
  getMyAttempts,
  getMySubscription,
  hasActiveAccess,
  getWishlist,
  toggleWishlist,
  type LiveSession,
  type QuizAttempt,
  type Subscription,
} from "@/lib/lms-storage";
import { JoinLiveSessionDialog } from "@/components/student/JoinLiveSessionDialog";

export const Route = createFileRoute("/dashboard/student/")({
  head: () => ({ meta: [{ title: "Overview — Student · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: StudentOverview,
});

/* ============ Local types (API course shape can vary slightly) ============ */
type ApiCourse = {
  id: string;
  title: string;
  teacher?: string;
  category?: string;
  cover?: string;
};

type CourseRow = ApiCourse & { done: number; total: number; pct: number };

function StudentOverview() {
  const { t } = useTranslation();

  const [checking, setChecking] = useState(true);
  const [access, setAccess] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [rows, setRows] = useState<CourseRow[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [live, setLive] = useState<LiveSession[]>([]);
  const [wishlist, setWishlistState] = useState<string[]>([]);
  const [joinSession, setJoinSession] = useState<LiveSession | null>(null);
  // Tracks which course id is mid-toggle so we can disable its heart button
  // and avoid a double-click race against localStorage writes.
  const [wishlistPendingId, setWishlistPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setChecking(true);
      setWishlistState(getWishlist());

      try {
        // Fetch subscription + access flag together, same as the live page.
        const [sub, ok]: any = await Promise.all([getMySubscription(), hasActiveAccess()]);
        if (cancelled) return;

        // Store only the plan object, not the whole {plan, courses} shape.
        setSubscription(sub.plan);

        // Individually purchased courses that are currently active.
        const activeCourseIds = (sub.courses ?? [])
          .filter((c: any) => c.status === "active")
          .map((c: any) => String(c.course_id));
        setOwnedCourseIds(activeCourseIds);
        setHasPlan(ok);

        // Access is granted either via an active plan OR at least one active course purchase.
        const hasAnyAccess = ok || activeCourseIds.length > 0;
        setAccess(hasAnyAccess);
        setChecking(false);

        if (!hasAnyAccess) {
          setRows([]);
          setAttempts([]);
          setLive([]);
          return;
        }

        const [allCourses, myAttempts, liveSessions] = await Promise.all([
          getAllCourses().catch(() => []),
          getMyAttempts().catch(() => []),
          getLiveSessions({ status: false }).catch(() => []),
        ]);
        if (cancelled) return;

        const allCourseList = (Array.isArray(allCourses) ? allCourses : []) as ApiCourse[];

        // Plan holders see the full catalog. Course-only buyers only see
        // (and get progress for) the courses they actually purchased.
        const courseList = ok
          ? allCourseList
          : allCourseList.filter((c) => activeCourseIds.includes(String(c.id)));

        const built = await Promise.all(
          courseList.map(async (c) => {
            const p = await courseProgress(c.id);
            return { ...c, done: p.done, total: p.total, pct: p.pct } as CourseRow;
          })
        );

        if (cancelled) return;

        // Plan holders see every live session. Course-only buyers only see
        // sessions that belong to a course they actually purchased.
        const visibleLive = ok
          ? liveSessions
          : liveSessions.filter((s: any) => {
              const courseId = String(s.course_id || s.courseId || "");
              return activeCourseIds.includes(courseId);
            });

        // Quiz attempts scoped to the visible courses' quizzes only.
        // (courseProgress doesn't return quiz ids here, so scope by course
        // ownership directly when there's no plan.)
        const visibleCourseIds = new Set(courseList.map((c) => String(c.id)));
        const scopedAttempts = ok
          ? myAttempts
          : myAttempts.filter((a: any) => visibleCourseIds.has(String(a.course_id ?? a.courseId ?? "")));

        setRows(built);
        setAttempts(scopedAttempts);
        setLive(visibleLive);
      } catch (err) {
        console.error("Failed to load student overview data:", err);
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleWishlist = async (id: string) => {
    setWishlistPendingId(id);
    try {
      const next = toggleWishlist(id);
      setWishlistState(next);
    } finally {
      setWishlistPendingId(null);
    }
  };

  const completedCount = rows.filter((r) => r.pct === 100).length;
  const inProgressCount = rows.filter((r) => r.pct > 0 && r.pct < 100).length;

  const avgScore = useMemo(() => {
    if (attempts.length === 0) return 0;
    const sum = attempts.reduce((acc, a) => acc + (a.score / a.total) * 100, 0);
    return Math.round(sum / attempts.length);
  }, [attempts]);

  const continueLearning = useMemo(
    () => [...rows].sort((a, b) => (a.pct === b.pct ? 0 : a.pct - b.pct)).filter((r) => r.pct < 100).slice(0, 3),
    [rows]
  );

  const upcoming = live.slice(0, 3);
  const recentAttempts = attempts.slice(0, 4);

  const weekdayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const weeklyHours = revenueSeries.slice(-7).map((r, i) => ({
    day: t(`common.weekdaysShort.${weekdayKeys[i]}`),
    hours: 1 + (r.signups % 4),
  }));

  const daysLeft = subscription?.ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.ends_at).getTime() - Date.now()) / 86400000))
    : null;

  if (checking) {
    return (
      <RoleDashboardLayout role="student">
        <OverviewSkeleton />
      </RoleDashboardLayout>
    );
  }

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title={t("student.overview")}
        description={
          hasPlan
            ? t("student.overviewDesc")
            : t("student.overviewDescCourseOnly", "An overview of the courses you have purchased.")
        }
        actions={
          <div className="flex items-center gap-2">
            {access && hasPlan && (
              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
                  daysLeft !== null && daysLeft <= 7
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                    : "border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 text-primary"
                }`}
              >
                <Crown className="h-3.5 w-3.5" />
                <span className="font-semibold">{subscription?.plan_name}</span>
                <span className="h-3 w-px bg-current opacity-30" />
                <span className="tabular-nums">
                  {t("student.daysLeft", { count: daysLeft ?? 0 })}
                </span>
              </div>
            )}
            {access && !hasPlan && (
              <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-1.5 text-xs font-medium text-primary shadow-sm">
                <Crown className="h-3.5 w-3.5" />
                <span className="font-semibold">
                  {t("student.courseAccessOnly", {
                    count: ownedCourseIds.length,
                    defaultValue: `${ownedCourseIds.length} course(s) purchased`,
                  })}
                </span>
              </div>
            )}
            <Button asChild size="sm">
              <Link to="/courses">
                <Sparkles className="me-1.5 h-4 w-4" /> {t("student.discover")}
              </Link>
            </Button>
          </div>
        }
      />

      {!access && <NoSubscriptionState subscription={subscription} />}

      {access && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("student.myCourses")} value={String(rows.length)} icon={BookOpen} />
            <StatCard label={t("common.pending")} value={String(inProgressCount)} icon={PlayCircle} />
            <StatCard label={t("common.completed")} value={String(completedCount)} icon={CheckCircle2} />
            <StatCard label={t("student.wishlist")} value={String(wishlist.length)} icon={Heart} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("teacher.liveSessions")} value={String(upcoming.length)} icon={Video} />
            <StatCard label={t("student.quizzesTaken")} value={String(attempts.length)} icon={ListChecks} />
            <StatCard label={t("student.quizAverage")} value={`${avgScore}%`} icon={Award} />
            <StatCard
              label={t("student.plan")}
              value={hasPlan ? subscription?.plan_name ?? "—" : t("student.coursesOnly", "Courses only")}
              icon={Crown}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card className="border-border/60 p-6 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{t("student.continueLearning")}</p>
                  <p className="text-xs text-muted-foreground">{t("student.continueLearningDesc")}</p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/dashboard/student/courses">{t("common.viewAll")}</Link>
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {continueLearning.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("student.allCaughtUp")}</p>
                )}
                {continueLearning.map((c) => {
                  const isPending = wishlistPendingId === c.id;
                  return (
                    <div
                      key={c.id}
                      className="group flex items-center gap-4 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40"
                    >
                      <Link
                        to="/dashboard/student/courses/$id"
                        params={{ id: c.id }}
                        className="flex min-w-0 flex-1 items-center gap-4"
                      >
                        <div
                          className="h-14 w-20 shrink-0 rounded-lg bg-muted"
                          style={c.cover ? { backgroundImage: c.cover, backgroundSize: "cover" } : undefined}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{c.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.teacher ?? "—"} · {c.category ?? ""}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={c.pct} className="h-1.5" />
                            <span className="w-10 text-end text-xs font-medium text-muted-foreground">{c.pct}%</span>
                          </div>
                        </div>
                      </Link>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleWishlist(c.id);
                        }}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 disabled:cursor-wait disabled:opacity-100"
                        aria-label={t("student.toggleWishlist")}
                      >
                        <Heart
                          className={`h-4 w-4 transition-transform ${
                            wishlist.includes(c.id) ? "fill-primary text-primary" : ""
                          } ${isPending ? "scale-90" : ""}`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="border-border/60 p-6 shadow-card">
              <p className="text-sm font-semibold">{t("student.studyActivity")}</p>
              <p className="text-xs text-muted-foreground">{t("student.hoursStudiedDesc")}</p>
              <div className="mt-4 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyHours}>
                    <defs>
                      <linearGradient id="hrs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={2} fill="url(#hrs)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/60 p-6 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t("teacher.liveSessions")}</p>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/dashboard/student/live">{t("common.viewAll")}</Link>
                </Button>
              </div>
              <div className="mt-3 divide-y divide-border/60">
                {upcoming.length === 0 && (
                  <p className="py-3 text-sm text-muted-foreground">{t("student.noLiveSessions")}</p>
                )}
                {upcoming.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Video className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.host} · {s.startsAt}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setJoinSession(s)}>
                      {t("common.join")}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-border/60 p-6 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t("student.recentQuizResults")}</p>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/dashboard/student/progress">{t("common.viewAll")}</Link>
                </Button>
              </div>
              <div className="mt-3 divide-y divide-border/60">
                {recentAttempts.length === 0 && (
                  <p className="py-3 text-sm text-muted-foreground">{t("student.noQuizzes")}</p>
                )}
                {recentAttempts.map((a, i) => (
                  <div key={a.id ?? i} className="flex items-center gap-3 py-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t("student.scoreFormat", { score: a.score, total: a.total })}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{new Date(a.at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline">{Math.round((a.score / a.total) * 100)}%</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-border/60 p-6 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t("student.wishlist")}</p>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/dashboard/student/courses">{t("common.viewAll")}</Link>
                </Button>
              </div>
              <div className="mt-3 divide-y divide-border/60">
                {wishlist.length === 0 && (
                  <p className="py-3 text-sm text-muted-foreground">{t("student.noWishlist")}</p>
                )}
                {rows
                  .filter((c) => wishlist.includes(c.id))
                  .slice(0, 4)
                  .map((c) => {
                    const isPending = wishlistPendingId === c.id;
                    return (
                      <div key={c.id} className="flex items-center gap-3 py-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                          <Heart className="h-4 w-4 fill-primary" />
                        </div>
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => handleToggleWishlist(c.id)}
                        >
                          {isPending ? t("common.removing") : t("common.remove")}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>
        </>
      )}

      <JoinLiveSessionDialog
        session={joinSession}
        open={!!joinSession}
        onOpenChange={(o) => !o && setJoinSession(null)}
      />
    </RoleDashboardLayout>
  );
}

function NoSubscriptionState({ subscription }: { subscription: Subscription | null }) {
  const { t } = useTranslation();
  const pending = subscription?.status === "pending";

  return (
    <Card className="flex flex-col items-center gap-4 border-dashed border-border/60 p-12 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">
          {pending ? t("student.subPendingTitle") : t("student.unlockDashboard")}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {pending ? t("student.subPendingDesc") : t("student.subscribeDesc")}
        </p>
      </div>
      {!pending && (
        <Button asChild className="gap-2">
          <Link to="/dashboard/student/orders">
            <Crown className="h-4 w-4" /> {t("student.viewPlans")}
          </Link>
        </Button>
      )}
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}