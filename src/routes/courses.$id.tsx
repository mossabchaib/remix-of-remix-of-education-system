import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, BookOpen, CheckCircle2, Clock, FileText, Globe,
  Heart,
  HelpCircle, Loader2, Lock, PlayCircle, Star, Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CourseWishlistButton } from "@/components/client/CourseWishlistButton";
import { CourseUnenrollDialog } from "@/components/client/CourseUnenrollDialog";
import { CourseCurriculumPreviewModal } from "@/components/client/CourseCurriculumPreviewModal";
import { lumenOrderService } from "@/services/lumenOrderService";
import { lumenEnrollmentService } from "@/services/lumenEnrollmentService";
import {
  getTeacherCourseById,
  resolvedModules,
  getEnrollments,
  storageKeys,
  STORAGE_EVENT,
} from "@/lib/lms-storage";
import type { Lesson } from "@/lib/lms-storage";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/courses/$id")({
  loader: async ({ params }) => {
    try {
      // getTeacherCourseById returns the course wrapped in an extra level: { course: {...} }
      // with category and teacher nested under categories / profiles. We keep the raw
      // shape here and only unwrap it in the component at render time.
      const [data, modules] = await Promise.all([
        getTeacherCourseById(params.id),
        resolvedModules(params.id),
      ]);

      if (!data) throw notFound();
      return { course: data, modules };
    } catch (err) {
      console.error("Loader Error:", err);
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const course = loaderData?.course?.course;
    return {
      meta: course
        ? [
            { title: `${course.title} — Lumen` },
            { name: "description", content: course.description || "" },
            { property: "og:title", content: course.title },
            { property: "og:description", content: course.description || "" },
          ]
        : [{ title: "Course not found — Lumen" }, { name: "robots", content: "noindex" }],
    };
  },
  notFoundComponent: () => {
    const { t } = useTranslation();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">{t("courseDetails.notFound.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("courseDetails.notFound.description")}</p>
          <Button asChild className="mt-6">
            <Link to="/courses">{t("courseDetails.notFound.backButton")}</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  },
  component: CourseDetail,
});

const kindIcon: any = {
  video: PlayCircle,
  reading: FileText,
  quiz: HelpCircle,
};

type PreviewLesson = Lesson & { moduleTitle?: string };

// ---------- helpers ----------

/** Parses strings like "10 min", "1h 20min" into total minutes. Returns null if unparseable. */
function toMinutes(duration?: string | null) {
  if (!duration || typeof duration !== "string") return null;
  const h = duration.match(/(\d+)\s*h/i);
  const m = duration.match(/(\d+)\s*m/i);
  if (!h && !m) return null;
  return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}

function formatMinutes(total: number) {
  if (!total || total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/**
 * Formats the raw price value coming straight from the database.
 * No invented labels here — just the number as currency, or null if the
 * field itself is missing/unparseable so the caller can decide whether to
 * render anything at all.
 */
function formatPrice(price: unknown) {
  if (price === null || price === undefined || price === "") return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `da ${n.toFixed(2)}`;
}

function CourseDetail() {
  const { t } = useTranslation();
  const loaderData = Route.useLoaderData();
  const [rawCourse, setRawCourse] = useState<any>(loaderData?.course || null);
  const modules = loaderData?.modules ?? [];

  const navigate = useNavigate();

  // ---------- auth state (via useSession, same hook used in Navbar) ----------
  const session = useSession();
  const isAuthenticated = !!session;

  // ---------- enrollment state (replaces useEnrollments / useKeyedStorage) ----------
  // We read the enrollment ids directly from lms-storage and subscribe to its
  // STORAGE_EVENT so this component stays in sync with changes made elsewhere
  // (e.g. another tab, or the enrollment service itself).
  const [enrollmentIds, setEnrollmentIds] = useState<string[]>(() => getEnrollments());

  useEffect(() => {
    // Re-read on mount to cover any change that happened between the initial
    // render and the moment the user actually reaches this page.
    setEnrollmentIds(getEnrollments());

    if (typeof window === "undefined") return;

    const handleStorageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string }>).detail;
      if (!detail || detail.key === storageKeys.enrollments) {
        setEnrollmentIds(getEnrollments());
      }
    };

    window.addEventListener(STORAGE_EVENT, handleStorageChange as EventListener);
    return () => window.removeEventListener(STORAGE_EVENT, handleStorageChange as EventListener);
  }, []);

  const isEnrolled = useCallback(
    (courseId: string) => enrollmentIds.includes(courseId),
    [enrollmentIds]
  );

  const [previewLesson, setPreviewLesson] = useState<PreviewLesson | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ---------- async action states ----------
  const [isEnrollingFree, setIsEnrollingFree] = useState(false);
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);

  useEffect(() => {
    if (loaderData?.course) setRawCourse(loaderData.course);
  }, [loaderData]);

  // Data coming from lms-storage is wrapped in an extra level: { course: { course: {...} } }.
  // We only unwrap it here for display purposes, without mutating the original source.
  const course = rawCourse?.course ?? null;
  if (!course) return null;

  const enrolled = isEnrolled(course.id);

  // Dynamically resolve the cover background (URL, gradient, or fallback).
  const coverStyle = course.image_cover
    ? course.image_cover.startsWith("linear-gradient")
      ? { background: course.image_cover }
      : { backgroundImage: `url(${course.image_cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: "linear-gradient(to right, #4f46e5, #9333ea)" };

  const teacherName = course.profiles?.full_name || course.profiles?.email || t("common.instructorFallback");
  const categoryName = course.categories?.name || t("courseDetails.categoryDefault");

  // rating and students are not present in the current data source —
  // we show an honest "new course" state instead of a fabricated number.
  const hasRating = course.rating != null;
  const ratingVal = hasRating ? Number(course.rating) : null;
  const studentsCount = course.students_count ?? course.students ?? null;

  // Total duration and lesson count are derived from the actual lessons coming from
  // resolvedModules, instead of relying on course.hours / course.lessons which don't
  // exist in the source data.
  const totalMinutes = modules.reduce(
    (sum: number, m: any) => sum + (m.lessons ?? []).reduce((s: number, l: any) => s + (toMinutes(l.duration) ?? 0), 0),
    0
  );
  const totalDurationLabel = formatMinutes(totalMinutes);
  const totalLessons = modules.reduce((sum: number, m: any) => sum + (m.lessons?.length ?? 0), 0);

  // Price straight from the database field (course.price). isFree drives
  // existing CTA behavior (enrollFree vs. checkout) — unchanged, just reused
  // here for display so the two stay consistent with each other.
  const isFree = Number(course.price) === 0;
  const priceLabel = formatPrice(course.price);
  const hasOriginalPrice =
    course.original_price !== undefined &&
    course.original_price !== null &&
    Number(course.original_price) > Number(course.price);
  const originalPriceLabel = hasOriginalPrice ? formatPrice(course.original_price) : null;

  // The primary CTA button is only shown when:
  //  - the user is already enrolled (goes to "my course"), or
  //  - the course is free (goes through the free enroll flow), or
  //  - the user is NOT authenticated (goes through the "buy" flow, which
  //    currently redirects to /login).
  // A logged-in, non-enrolled user viewing a paid course sees no "buy course"
  // button, per the requested change.
  const showPrimaryCta = enrolled || isFree || !isAuthenticated;

  function goToMyCourse() {
    navigate({ to: "/dashboard/student/courses/$id", params: { id: course.id } });
  }

  async function onPrimaryCta() {
    if (enrolled) {
      goToMyCourse();
      return;
    }

    if (isFree) {
      setIsEnrollingFree(true);
      try {
        await lumenEnrollmentService.enrollFree(course);
        setEnrollmentIds(getEnrollments());
        navigate({ to: "/courses/$id", params: { id: course.id } });
      } finally {
        setIsEnrollingFree(false);
      }
      return;
    }

    setIsRedirectingToCheckout(true);
    try {
      lumenOrderService.beginCheckout(course);
      navigate({ to: "/login" });
    } finally {
      setIsRedirectingToCheckout(false);
    }
  }

  function openLessonPreview(lesson: Lesson, moduleTitle: string) {
    setPreviewLesson({ ...lesson, moduleTitle });
    setPreviewOpen(true);
  }

  function onPreviewCta() {
    setPreviewOpen(false);
    if (enrolled) {
      goToMyCourse();
    } else {
      onPrimaryCta();
    }
  }

  const isPrimaryCtaBusy = isEnrollingFree || isRedirectingToCheckout;

  const primaryCtaLabel = enrolled
    ? t("courseDetails.cta.goToCourse")
    : isEnrollingFree
      ? t("courseDetails.cta.enrollingFree")
      : isRedirectingToCheckout
        ? t("courseDetails.cta.redirecting")
        : isFree
          ? t("courseDetails.cta.enrollFree")
          : t("courseDetails.cta.buyCourse");

  return (
    <SiteLayout>
      <main className="bg-background">
        {/* ───────────────────────── HERO ───────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            className="relative min-h-[430px] sm:min-h-[500px]"
            style={coverStyle}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

            <div className="relative mx-auto flex min-h-[430px] max-w-7xl items-end px-4 pb-12 pt-28 sm:min-h-[500px] sm:px-6 sm:pb-16 lg:px-8">
              <div className="max-w-3xl text-white">
                <Link
                  to="/courses"
                  className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium backdrop-blur-md transition hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("courseDetails.backToCourses")}
                </Link>

                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <Badge className="border-white/20 bg-white/15 text-white backdrop-blur-md hover:bg-white/20">
                    {categoryName}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-white/25 bg-black/10 text-white backdrop-blur-md"
                  >
                    {course.level || t("courseDetails.levelDefault")}
                  </Badge>
                  {enrolled && (
                    <Badge className="border-emerald-300/30 bg-emerald-500/20 text-emerald-100 backdrop-blur-md hover:bg-emerald-500/20">
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      {t("courseDetails.enrolledBadge")}
                    </Badge>
                  )}
                </div>

                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  {course.title}
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
                  { course.subtitle}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
                  {hasRating ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-current text-amber-400" />
                      <b className="text-white">{ratingVal!.toFixed(1)}</b>
                      {studentsCount != null && (
                        <span>
                          ({t("courseDetails.learners", { count: studentsCount })})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-white/60" />
                      {t("courseDetails.newCourse")}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {totalDurationLabel || t("courseDetails.selfPaced")}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {t("courseDetails.lessonCount", { count: totalLessons })}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {course.language || t("common.languageDefault")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────── CONTENT ───────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Main column */}
            <div className="min-w-0 py-8 lg:py-10">
              <Tabs defaultValue="overview">
                <div className="sticky top-0 z-20 -mx-4 border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:px-0">
                  <TabsList className="h-14 w-full justify-start gap-1 rounded-none bg-transparent p-0">
                    <TabsTrigger
                      value="overview"
                      className="h-14 rounded-none border-b-2 border-transparent px-4 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      {t("courseDetails.tabs.overview")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="curriculum"
                      className="h-14 rounded-none border-b-2 border-transparent px-4 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      {t("courseDetails.tabs.curriculum")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="instructor"
                      className="h-14 rounded-none border-b-2 border-transparent px-4 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      {t("courseDetails.tabs.instructor")}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="mt-8">
                  <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {t("courseDetails.about.title")}
                    </h2>

                    {course.description ? (
                      <p className="mt-5 whitespace-pre-line text-[15px] leading-7 text-muted-foreground">
                        {course.description}
                      </p>
                    ) : (
                      <p className="mt-5 text-sm text-muted-foreground">
                        {t("courseDetails.about.empty")}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <p className="font-semibold">
                        {t("courseDetails.lessonCount", { count: totalLessons })}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("courseDetails.tabs.curriculum")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Clock className="h-5 w-5" />
                      </div>
                      <p className="font-semibold">
                        {totalDurationLabel || t("courseDetails.selfPaced")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("courseDetails.sidebar.onDemand", {
                          duration: totalDurationLabel || "",
                        })}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="curriculum" className="mt-8">
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {t("courseDetails.tabs.curriculum")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("courseDetails.lessonCount", { count: totalLessons })}
                    </p>
                  </div>

                  {modules.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                      {t("courseDetails.curriculum.empty")}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {modules.map((m: any, moduleIndex: number) => (
                        <Card
                          key={m.id}
                          className="overflow-hidden border-border/70 shadow-sm"
                        >
                          <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                                {moduleIndex + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{m.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {t("courseDetails.lessonCount", {
                                    count: m.lessons?.length ?? 0,
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="divide-y divide-border/50">
                            {(m.lessons ?? []).map((l: Lesson, lessonIndex: number) => {
                              const Icon = kindIcon[l.kind] || PlayCircle;
                              const locked = !enrolled && !l.is_preview;

                              return (
                                <button
                                  key={l.id}
                                  type="button"
                                  onClick={() => openLessonPreview(l, m.title)}
                                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-muted/40"
                                >
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition group-hover:border-primary/30 group-hover:text-primary">
                                    <Icon className="h-4 w-4" />
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-foreground">
                                      {lessonIndex + 1}. {l.title}
                                    </span>
                                    {l.is_preview && !enrolled && (
                                      <span className="mt-1 inline-flex items-center text-[11px] font-medium text-primary">
                                        {t("courseDetails.previewBadge")}
                                      </span>
                                    )}
                                  </span>

                                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                    {locked && <Lock className="h-3.5 w-3.5" />}
                                    {l.duration}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="instructor" className="mt-8">
                  <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-4 border-background shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                          {teacherName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <p className="text-lg font-semibold">{teacherName}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("courseDetails.instructor.role")}
                        </p>
                      </div>
                    </div>

                    <p className="mt-6 text-[15px] leading-7 text-muted-foreground">
                      {t("courseDetails.instructor.taughtBy", {
                        name: teacherName,
                      })}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Purchase card */}
            <aside className="lg:sticky lg:top-6 lg:-mt-20 lg:z-30 lg:pb-8">
              <Card className="overflow-hidden border-border/70 bg-card shadow-xl shadow-black/5">
                <div className="relative aspect-video overflow-hidden" style={coverStyle}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {isFree && (
                    <Badge className="absolute left-4 top-4 border-white/20 bg-white/90 text-foreground backdrop-blur hover:bg-white">
                      {t("courseDetails.priceFree", "Free")}
                    </Badge>
                  )}
                </div>

                <div className="p-6 sm:p-7">
                  {priceLabel && (
                    <div className="flex items-end gap-3">
                      <span className="text-3xl font-bold tracking-tight text-foreground">
                        {isFree ? t("courseDetails.priceFree", "Free") : priceLabel}
                      </span>
                      {!isFree && originalPriceLabel && (
                        <span className="pb-1 text-sm text-muted-foreground line-through">
                          {originalPriceLabel}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-5 space-y-3">
                    {showPrimaryCta && (
                      <Button
                        className="h-12 w-full text-base font-semibold shadow-sm"
                        size="lg"
                        onClick={onPrimaryCta}
                        disabled={isPrimaryCtaBusy}
                      >
                        {isPrimaryCtaBusy && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {primaryCtaLabel}
                      </Button>
                    )}

                    {isAuthenticated && !enrolled && (
                      <CourseWishlistButton
                        courseId={course.id}
                        courseTitle={course.title}
                        className="flex h-11 w-full items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
                      />
                    )}
                  </div>

                  {enrolled && (
                    <div className="mt-3 text-center">
                      <CourseUnenrollDialog
                        courseId={course.id}
                        courseTitle={course.title}
                      />
                    </div>
                  )}

                  <div className="my-6 h-px bg-border/70" />

                  <p className="mb-4 text-sm font-semibold">
                    {t("courseDetails.tabs.curriculum")}
                  </p>

                  <ul className="space-y-4 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Clock className="h-4 w-4" />
                      </span>
                      <span className="leading-7 text-muted-foreground">
                        {totalDurationLabel
                          ? t("courseDetails.sidebar.onDemand", {
                              duration: totalDurationLabel,
                            })
                          : t("courseDetails.selfPaced")}
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <span className="leading-7 text-muted-foreground">
                        {t("courseDetails.lessonCount", { count: totalLessons })}
                      </span>
                    </li>

                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Globe className="h-4 w-4" />
                      </span>
                      <span className="leading-7 text-muted-foreground">
                        {course.language || t("common.languageDefault")}
                      </span>
                    </li>
                  </ul>

                  {enrolled && (
                    <div className="mt-6 rounded-xl bg-primary/5 p-4 text-sm text-primary">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        {t("courseDetails.enrolledBadge")}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </aside>
          </div>
        </section>

        <div className="h-16 sm:h-24" />
      </main>

      <CourseCurriculumPreviewModal
        lesson={previewLesson}
        isEnrolled={enrolled}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onGoToCourse={onPreviewCta}
      />
    </SiteLayout>
  )
}