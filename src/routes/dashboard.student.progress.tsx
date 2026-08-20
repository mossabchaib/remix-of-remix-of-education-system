import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  CheckCircle2, Crown, ListChecks, Lock, Sparkles, TrendingUp,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  courseProgress,
  getAllCourses,
  getMyAttempts,
  getMySubscription,
  hasActiveAccess,
  getQuizzesByCourse,
  type Quiz,
  type QuizAttempt,
  type Subscription,
} from "@/lib/lms-storage";

export const Route = createFileRoute("/dashboard/student/progress")({
  head: () => ({ meta: [{ title: "Progress — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: ProgressPage,
});

/* ============ Local types (API course shape can vary slightly) ============ */
type ApiCourse = {
  id: string;
  title: string;
  teacher?: string;
  level?: string;
  cover?: string;
};

type CourseRow = {
  id: string;
  title: string;
  teacher?: string;
  level?: string;
  cover?: string;
  done: number;
  total: number;
  pct: number;
  quizzes: Quiz[];
};

function ProgressPage() {
  const { t } = useTranslation();

  const [checking, setChecking] = useState(true);
  const [access, setAccess] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [rows, setRows] = useState<CourseRow[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setChecking(true);
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
          return;
        }

        const [allCourses, myAttempts] = await Promise.all([
          getAllCourses().catch(() => []),
          getMyAttempts().catch(() => []),
        ]);
        if (cancelled) return;

        const allCourseList = (Array.isArray(allCourses) ? allCourses : []) as ApiCourse[];

        // Plan holders see the full catalog. Course-only buyers only see
        // (and get quizzes/progress for) the courses they actually purchased.
        const courseList = ok
          ? allCourseList
          : allCourseList.filter((c) => activeCourseIds.includes(String(c.id)));

        const built = await Promise.all(
          courseList.map(async (c) => {
            const [p, quizzes] = await Promise.all([courseProgress(c.id), getQuizzesByCourse(c.id)]);
            return {
              id: c.id,
              title: c.title,
              teacher: c.teacher,
              level: c.level,
              cover: c.cover,
              done: p.done,
              total: p.total,
              pct: p.pct,
              quizzes,
            } as CourseRow;
          })
        );

        if (cancelled) return;

        // Quiz attempts scoped to the visible courses' quizzes only.
        const visibleQuizIds = new Set(built.flatMap((r) => r.quizzes.map((q) => q.id)));
        const scopedAttempts = ok
          ? myAttempts
          : myAttempts.filter((a: any) => visibleQuizIds.has(a.id));

        setRows(built);
        setAttempts(scopedAttempts);
      } catch (err) {
        console.error("Failed to load progress page data:", err);
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;
  const totalLessons = rows.reduce((a, r) => a + r.total, 0);
  const doneLessons = rows.reduce((a, r) => a + r.done, 0);
  const totalQuizzes = rows.reduce((a, r) => a + r.quizzes.length, 0);

  const avgScore = useMemo(() => {
    if (attempts.length === 0) return 0;
    const sum = attempts.reduce((acc, a) => acc + (a.score / a.total) * 100, 0);
    return Math.round(sum / attempts.length);
  }, [attempts]);

  const chart = rows.map((r) => ({ name: r.title.split(" ").slice(0, 2).join(" "), pct: r.pct }));

  const daysLeft = subscription?.ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.ends_at).getTime() - Date.now()) / 86400000))
    : null;

  if (checking) {
    return (
      <RoleDashboardLayout role="student">
        <ProgressSkeleton />
      </RoleDashboardLayout>
    );
  }

  return (
    <RoleDashboardLayout role="student">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title={t("progressPage.title")}
          description={
            hasPlan
              ? t("progressPage.description")
              : t("progressPage.descriptionCourseOnly", "Progress for the courses you have purchased.")
          }
        />
        {access && (
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            <Crown className="h-3.5 w-3.5" />
            {hasPlan
              ? t("progressPage.planDaysLeft", { plan: subscription?.plan_name, days: daysLeft })
              : t("progressPage.courseAccessOnly", {
                  count: ownedCourseIds.length,
                  defaultValue: `You have access to ${ownedCourseIds.length} course(s)`,
                })}
          </Badge>
        )}
      </div>

      {!access && <NoSubscriptionState subscription={subscription} />}

      {access && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("progressPage.stats.averageProgress")} value={`${avg}%`} icon={TrendingUp} />
            <StatCard
              label={t("progressPage.stats.lessonsCompleted")}
              value={`${doneLessons}/${totalLessons}`}
              icon={CheckCircle2}
            />
            <StatCard label={t("progressPage.stats.quizAverage")} value={`${avgScore}%`} icon={ListChecks} />
            <StatCard
              label={t("progressPage.stats.quizzesTaken")}
              value={`${attempts.length}/${totalQuizzes}`}
              icon={Sparkles}
            />
          </div>

          {rows.length > 0 && (
            <Card className="border-border/60 p-6 shadow-card">
              <p className="text-sm font-semibold">{t("progressPage.progressByCourse")}</p>
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
            <p className="text-sm font-semibold">{t("progressPage.courseProgress")}</p>
            <p className="text-xs text-muted-foreground">{t("progressPage.courseProgressHint")}</p>
            <div className="mt-4 divide-y divide-border/60">
              {rows.map((c) => {
                const courseAttempts = attempts.filter((a) => c.quizzes.some((q) => q.id === a.id));
                const isOpen = expandedId === c.id;
                return (
                  <div key={c.id}>
                    <button
                      onClick={() => setExpandedId(isOpen ? null : c.id)}
                      className="flex w-full flex-wrap items-center gap-4 py-3 text-left transition-colors hover:bg-muted/30"
                    >
                      <div
                        className="h-10 w-14 shrink-0 rounded-md bg-muted"
                        style={c.cover ? { backgroundImage: c.cover, backgroundSize: "cover" } : undefined}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t("progressPage.courseRowSummary", {
                            teacher: c.teacher ?? "—",
                            done: c.done,
                            total: c.total,
                            quizCount: c.quizzes.length,
                          })}
                        </p>
                      </div>
                      {c.level && <Badge variant="outline">{c.level}</Badge>}
                      <div className="w-56"><Progress value={c.pct} className="h-1.5" /></div>
                      <div className="w-10 text-right text-sm font-semibold">{c.pct}%</div>
                    </button>

                    {isOpen && (
                      <div className="mb-3 ml-[4.5rem] space-y-2 rounded-lg bg-muted/30 p-3">
                        {courseAttempts.length === 0 && (
                          <p className="text-xs text-muted-foreground">{t("progressPage.noAttemptsYet")}</p>
                        )}
                        {courseAttempts.map((a) => (
                          <div key={a.id} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{new Date(a.at).toLocaleDateString()}</span>
                            <span className="font-medium">{a.score}/{a.total}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {rows.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("progressPage.noCourses")}</p>
              )}
            </div>
          </Card>
        </>
      )}
    </RoleDashboardLayout>
  );
}

function NoSubscriptionState({ subscription }: { subscription: Subscription | null }) {
  const { t } = useTranslation();
  const pending = subscription?.status === "pending";
  const expired = subscription?.status === "expired";
  const rejected = subscription?.status === "rejected";

  const title = pending
    ? t("progressPage.noSubscription.pendingTitle")
    : expired
      ? t("progressPage.noSubscription.expiredTitle")
      : rejected
        ? t("progressPage.noSubscription.rejectedTitle")
        : t("progressPage.noSubscription.defaultTitle");

  const description = pending
    ? t("progressPage.noSubscription.pendingDescription")
    : t("progressPage.noSubscription.defaultDescription");

  return (
    <Card className="flex flex-col items-center gap-4 border-dashed border-border/60 p-12 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {!pending && (
        <Button asChild className="gap-2">
          <a href="/dashboard/student/subscription">
            <Crown className="h-4 w-4" /> {t("progressPage.noSubscription.viewPlans")}
          </a>
        </Button>
      )}
    </Card>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}