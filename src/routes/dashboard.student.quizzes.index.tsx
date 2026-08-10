import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock,
  ListChecks,
  TrendingUp,
  Lock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getMyAttempts,
  getAllCourses,
  getQuizzesByCourse,
  hasActiveAccess,
  getMySubscription,
  getAdminCategories,
  type Subscription,
  type Quiz,
} from "@/lib/lms-storage";

export const Route = createFileRoute("/dashboard/student/quizzes/")({
  head: () => ({ meta: [{ title: "Quizzes — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: StudentQuizzes,
});

function StudentQuizzes() {
  const { t } = useTranslation();

  const [checking, setChecking] = useState(true);
  const [access, setAccess] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<(Quiz & { courseObj?: any })[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Record<string, any>>({});

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sub, ok, catsData, courseListRaw]:any= await Promise.all([
          getMySubscription(),
          hasActiveAccess(),
          getAdminCategories().catch(() => []),
          getAllCourses().catch(() => []),
        ]);

        if (cancelled) return;
        setSubscription(sub);
        setAccess(ok);
        setChecking(false);

        // Normalize categories (API may return an array or a wrapped object)
        const validCats = Array.isArray(catsData) ? catsData : catsData?.categories || catsData?.data || [];
        setCategories(validCats);

        // Normalize courses
        const courseList = Array.isArray(courseListRaw) ? courseListRaw : [];
        setCourses(courseList);

        if (ok) {
          setLoading(true);
          const [results, myAttemptsList] = await Promise.all([
            Promise.all(
              courseList.map(async (c: any) => {
                const qz = await getQuizzesByCourse(c.id).catch(() => []);
                return (Array.isArray(qz) ? qz : []).map((q: any) => ({
                  ...q,
                  courseId: c.id,
                  courseName: c.title,
                  courseObj: c, // Keep the course object around for later filtering
                }));
              }),
            ),
            getMyAttempts().catch(() => []),
          ]);

          if (cancelled) return;
          setQuizzes(results.flat());

          // Convert the student's attempts into a keyed map for fast lookup
          const attemptsMap: Record<string, any> = {};
          if (Array.isArray(myAttemptsList)) {
            myAttemptsList.forEach((att: any) => {
              const qId = att?.quiz_id ?? att?.quizId;
              if (qId) {
                attemptsMap[qId] = att;
              }
            });
          }
          setAttempts(attemptsMap);
        }
      } catch (err) {
        console.error("Failed to load quizzes data:", err);
        if (!cancelled) setChecking(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Courses available under the currently selected category
  const availableCourses = useMemo(() => {
    if (selectedCategory === "all") return courses;
    return courses.filter((c: any) => {
      return (
        c.categories?.name?.toLowerCase() === selectedCategory.toLowerCase() ||
        c.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        c.category_id === selectedCategory ||
        c.category === selectedCategory
      );
    });
  }, [courses, selectedCategory]);

  // Quizzes filtered by category and course
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q: any) => {
      const course = q.courseObj || courses.find((c: any) => c.id === q.courseId);

      // 1. Filter by course
      if (selectedCourse !== "all" && q.courseId !== selectedCourse) {
        return false;
      }

      // 2. Filter by category
      if (selectedCategory !== "all") {
        if (!course) return false;
        const matchesCategory =
          course.categories?.name?.toLowerCase() === selectedCategory.toLowerCase() ||
          course.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          course.category_id === selectedCategory ||
          course.category === selectedCategory;

        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [quizzes, courses, selectedCategory, selectedCourse]);

  const taken = useMemo(() => {
    // Count attempts that belong to the currently filtered quiz set
    const filteredIds = new Set(filteredQuizzes.map((q) => q.id));
    return Object.keys(attempts).filter((qId) => filteredIds.has(qId)).length;
  }, [attempts, filteredQuizzes]);

  const avg = useMemo(() => {
    const filteredIds = new Set(filteredQuizzes.map((q) => q.id));
    const relevantAttempts = Object.entries(attempts).filter(([qId]) => filteredIds.has(qId));

    if (relevantAttempts.length === 0) return 0;

    const totalScore = relevantAttempts.reduce((acc, [, a]) => {
      const s = a?.score ?? 0;
      const total = a?.total || 1;
      return acc + (s / total) * 100;
    }, 0);
    return Math.round((totalScore / relevantAttempts.length) * 10) / 10;
  }, [attempts, filteredQuizzes]);

  const hasActiveFilters = selectedCategory !== "all" || selectedCourse !== "all";

  function resetFilters() {
    setSelectedCategory("all");
    setSelectedCourse("all");
  }

  if (checking) {
    return (
      <RoleDashboardLayout role="student">
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          {t("studentQuizzes.loading")}
        </div>
      </RoleDashboardLayout>
    );
  }

  if (!access) {
    return (
      <RoleDashboardLayout role="student">
        <PageHeader title={t("studentQuizzes.title")} description={t("studentQuizzes.description")} />
        <LockedQuizzes subscription={subscription} />
      </RoleDashboardLayout>
    );
  }

  return (
    <RoleDashboardLayout role="student">
      <PageHeader title={t("studentQuizzes.title")} description={t("studentQuizzes.description")} />

      <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        <span>
          {t("studentQuizzes.membershipActive")}
          {subscription?.ends_at && (
            <>
              {" "}
              · {t("studentQuizzes.accessThrough", { date: new Date(subscription.ends_at).toLocaleDateString() })}
            </>
          )}
        </span>
      </div>

      {/* Category / course filter bar */}
     

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("studentQuizzes.stats.available")} value={String(filteredQuizzes.length)} icon={ListChecks} />
        <StatCard label={t("studentQuizzes.stats.attempts")} value={String(taken)} icon={Clock} />
        <StatCard label={t("studentQuizzes.stats.averageScore")} value={`${avg}%`} icon={TrendingUp} />
      </div>
         <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg  border-border/60 bg-card p-3 shadow-sm">
        <div className="mr-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          
        </div>

        {/* Category filter */}
        <Select
          value={selectedCategory}
          onValueChange={(val) => {
            setSelectedCategory(val);
            setSelectedCourse("all"); // Reset course when category changes
          }}
        >
          <SelectTrigger className="h-9 w-[180px] bg-background text-xs">
            <SelectValue placeholder={t("studentQuizzes.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("studentQuizzes.allCategories")}</SelectItem>
            {categories.map((c: any) => (
              <SelectItem key={c.id || c.name} value={c.name || c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Course filter */}
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="h-9 w-[200px] bg-background text-xs">
            <SelectValue placeholder={t("studentQuizzes.allCourses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("studentQuizzes.allCourses")}</SelectItem>
            {availableCourses.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
          ))}
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={ListChecks}
            title={t("studentQuizzes.empty.title")}
            description={
              hasActiveFilters
                ? t("studentQuizzes.empty.filteredDescription")
                : t("studentQuizzes.empty.defaultDescription")
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  {t("studentQuizzes.clearFilters")}
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredQuizzes.map((q:any) => {
            const a = attempts[q.id];
            const isCompleted = !!a;
            const score = a?.score ?? 0;
            const total = a?.total ?? q.questions?.length ?? 1;
            const passed = score / total >= 0.7;

            return (
              <Card key={q.id} className="flex flex-col justify-between border-border/60 p-5 shadow-card">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{q.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{q.courseName || "—"}</p>
                    </div>
                    {isCompleted ? (
                      <Badge
                        variant="outline"
                        className={
                          passed
                            ? "gap-1 border-success/20 bg-success/10 text-success"
                            : "gap-1 border-warning/20 bg-warning/10 text-warning"
                        }
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {score}/{total}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t("studentQuizzes.notTaken")}</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">
                      {t("studentQuizzes.questionsCount", { count: q.questions?.length ?? 0 })}
                    </Badge>
                    <Badge variant="outline">{t("studentQuizzes.minutes", { count: q.minutes || 10 })}</Badge>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild className="flex-1" variant={isCompleted ? "outline" : "default"}>
                    <Link to="/dashboard/student/quizzes/$id" params={{ id: q.id }}>
                      {isCompleted ? t("studentQuizzes.reviewOrRetake") : t("studentQuizzes.startQuiz")}
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </RoleDashboardLayout>
  );
}

function LockedQuizzes({ subscription }: { subscription: Subscription | null }) {
  const { t } = useTranslation();
  const pending = subscription?.status === "pending";
  const expired = subscription?.status === "expired";

  const title = pending
    ? t("studentQuizzes.locked.pendingTitle")
    : expired
      ? t("studentQuizzes.locked.expiredTitle")
      : t("studentQuizzes.locked.defaultTitle");

  const description = pending
    ? t("studentQuizzes.locked.pendingDescription")
    : expired
      ? t("studentQuizzes.locked.expiredDescription")
      : t("studentQuizzes.locked.defaultDescription");

  return (
    <div className="relative mt-6 overflow-hidden rounded-xl border border-border/60">
      <div className="relative flex flex-col items-center gap-4 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background shadow-card">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {!pending && (
          <Button asChild size="lg" className="mt-2">
            <Link to="/dashboard/student/orders">
              <Sparkles className="mr-1.5 h-4 w-4" />
              {expired ? t("studentQuizzes.locked.renew") : t("studentQuizzes.locked.viewPlans")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}