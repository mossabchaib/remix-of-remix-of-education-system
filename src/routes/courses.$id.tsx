import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, BookOpen, Clock, FileText, Globe,
  HelpCircle, Loader2, Lock, PlayCircle, Star,
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
import { useAuth } from "@/hooks/useAuth";

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

const kindIcon: Record<Lesson["kind"], typeof PlayCircle> = {
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

function CourseDetail() {
  const { t } = useTranslation();
  const loaderData = Route.useLoaderData();
  const [rawCourse, setRawCourse] = useState<any>(loaderData?.course || null);
  const modules = loaderData?.modules ?? [];

  const navigate = useNavigate();
  const { isAuthenticated }: any = useAuth();

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

  const isFree = Number(course.price) === 0;

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
      navigate({ to: "/checkout/$courseId", params: { courseId: course.id } });
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
      <section className="relative">
        {/* Main cover: enlarged with a gradient overlay to keep any overlapping content readable */}
        <div className="relative h-72 w-full overflow-hidden sm:h-[26rem]" style={coverStyle}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-black/10" />
        </div>
        <div className="mx-auto -mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="border-border/60 p-6 sm:p-8 shadow-elegant">
              <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
                <Link to="/courses">
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> {t("courseDetails.backToCourses")}
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">{categoryName}</Badge>
                <Badge variant="outline" className="capitalize">{course.level || t("courseDetails.levelDefault")}</Badge>
                {enrolled && (
                  <Badge className="bg-primary-soft text-primary hover:bg-primary-soft">
                    {t("courseDetails.enrolledBadge")}
                  </Badge>
                )}
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
              <p className="mt-3 text-muted-foreground">{course.description || course.subtitle}</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {hasRating ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <b className="text-foreground">{ratingVal!.toFixed(1)}</b>
                    {studentsCount != null && (
                      <> ({t("courseDetails.learners", { count: studentsCount })})</>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 text-muted-foreground" /> {t("courseDetails.newCourse")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {totalDurationLabel || t("courseDetails.selfPaced")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-4 w-4" /> {t("courseDetails.lessonCount", { count: totalLessons })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-4 w-4" /> {course.language || t("common.languageDefault")}
                </span>
              </div>

              <Tabs defaultValue="overview" className="mt-8">
                <TabsList>
                  <TabsTrigger value="overview">{t("courseDetails.tabs.overview")}</TabsTrigger>
                  <TabsTrigger value="curriculum">{t("courseDetails.tabs.curriculum")}</TabsTrigger>
                  <TabsTrigger value="instructor">{t("courseDetails.tabs.instructor")}</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">{t("courseDetails.about.title")}</h3>
                  {course.description ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {course.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("courseDetails.about.empty")}</p>
                  )}
                </TabsContent>
                <TabsContent value="curriculum" className="mt-6 space-y-3">
                  {modules.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t("courseDetails.curriculum.empty")}
                    </p>
                  ) : (
                    modules.map((m: any) => (
                      <Card key={m.id} className="border-border/60 p-4">
                        <p className="text-sm font-semibold">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("courseDetails.lessonCount", { count: m.lessons?.length ?? 0 })}
                        </p>
                        <div className="mt-3 space-y-1">
                          {(m.lessons ?? []).map((l: Lesson) => {
                            const Icon = kindIcon[l.kind] || PlayCircle;
                            // An unenrolled student can only view lessons explicitly marked as preview.
                            const locked = !enrolled && !l.is_preview;
                            return (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => openLessonPreview(l, m.title)}
                                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-muted/60"
                              >
                                <span className="flex items-center gap-2 text-foreground">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  {l.title}
                                  {l.is_preview && !enrolled && (
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                      {t("courseDetails.previewBadge")}
                                    </Badge>
                                  )}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  {locked && <Lock className="h-3 w-3" />}
                                  {l.duration}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="instructor" className="mt-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {teacherName.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{teacherName}</p>
                      <p className="text-sm text-muted-foreground">{t("courseDetails.instructor.role")}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t("courseDetails.instructor.taughtBy", { name: teacherName })}
                  </p>
                </TabsContent>
              </Tabs>
            </Card>

            <div className="space-y-4">
              <Card className="overflow-hidden border-border/60 p-0 shadow-card">
                {/* Cover preview inside the purchase card, giving the image more visual weight than the price */}
                <div className="relative aspect-video w-full" style={coverStyle}>
                  <div className="absolute inset-0 bg-black/0 transition-colors hover:bg-black/10" />
                </div>

                <div className="p-6">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={onPrimaryCta}
                    disabled={isPrimaryCtaBusy}
                  >
                    {isPrimaryCtaBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {primaryCtaLabel}
                  </Button>
                  {enrolled && (
                    <div className="mt-1 flex justify-center">
                      <CourseUnenrollDialog courseId={course.id} courseTitle={course.title} />
                    </div>
                  )}

                  {isAuthenticated && (
                    <CourseWishlistButton courseId={course.id} courseTitle={course.title} variant="full" className="mt-2" />
                  )}

                  {/* Every item here is backed by a real course field or computed from actual lessons —
                      no unsubstantiated claim (certificate, community, etc.) and the price is intentionally not shown here. */}
                  <ul className="mt-6 space-y-3 text-sm">
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {totalDurationLabel
                        ? t("courseDetails.sidebar.onDemand", { duration: totalDurationLabel })
                        : t("courseDetails.selfPaced")}
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="h-4 w-4" /> {t("courseDetails.lessonCount", { count: totalLessons })}
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" /> {course.language || t("common.languageDefault")}
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <CourseCurriculumPreviewModal
        lesson={previewLesson}
        isEnrolled={enrolled}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onGoToCourse={onPreviewCta}
      />

      <div className="h-24" />
    </SiteLayout>
  );
}