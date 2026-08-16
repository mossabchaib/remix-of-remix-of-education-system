import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowRight, BookOpen, GraduationCap, ShieldCheck,
  Star, Users, Zap, PlayCircle, Award, TrendingUp, Check,
  Globe2, CalendarDays,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseWishlistButton } from "@/components/client/CourseWishlistButton";
import { useAuth } from "@/hooks/useAuth";
import { CourseService } from "@/services";
import { getAdminCategories, getAllCourses, getCourseRatings } from "@/lib/lms-storage";
import type { Course } from "@/lib/mock-data";
import type { CourseRatingSummary } from "@/lib/lms-storage";

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  image_url?: string;
  coursesCount?: number;
  courses?: number;
  color?: string;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Learn with clarity" },
      { name: "description", content: "Beautifully crafted courses, expert instructors, and premium tools to help you grow — for individuals and teams." },
      { property: "og:title", content: "Lumen — Learn with clarity" },
      { property: "og:description", content: "Beautifully crafted courses, expert instructors, and premium tools to help you grow." },
    ],
  }),
  component: Home,
});

// ---- Helpers ----
function isNewCourse(createdAt?: string) {
  if (!createdAt) return false;
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return days <= 14;
}

function formatDate(createdAt?: string) {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const HERO_BG_URL =
  "background.png";

// ---- Skeleton Loaders المطابقة للـ Components الحقيقية ----
function CategorySkeleton() {
  return (
    <div className="group">
      <Card className="flex flex-col items-center justify-center border-black/10 bg-white p-5 text-center shadow-sm animate-pulse">
        <div className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200" />
        <div className="mt-4 w-full flex justify-center">
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
      </Card>
    </div>
  );
}

function CourseCardSkeleton() {
  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-black/10 bg-white shadow-sm animate-pulse">
      <div className="relative h-40 overflow-hidden bg-gray-200" />

      <div className="flex flex-1 flex-col p-5 space-y-3">
        <div className="h-3 w-1/3 bg-gray-200 rounded" />

        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>

        <div className="h-3 w-full bg-gray-200 rounded" />

        <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-4">
          <div className="h-3 w-1/4 bg-gray-200 rounded" />
          <div className="h-3 w-1/4 bg-gray-200 rounded" />
        </div>
      </div>
    </Card>
  );
}

// ---- Module-level cache (يبقى محفوظ بمدة حياة الـ SPA، يتصفر فقط عند full page reload) ----
let categoriesCache: Category[] | null = null;
let coursesCache: Course[] | null = null;

// دالة مساعدة، تقدر تناديها بعد ما الأدمن يزيد/يعدل كورس أو تصنيف
// باش تجبر الصفحة تعاود تجيب البيانات فالمرة الجاية
export function invalidateHomeCache() {
  categoriesCache = null;
  coursesCache = null;
}

function Home() {
  const { t } = useTranslation();
  const { isAuthenticated }: any = useAuth();

  const [categories, setCategories] = useState<Category[]>(categoriesCache || []);
  const [categoriesLoading, setCategoriesLoading] = useState(!categoriesCache);

  const [courses, setCourses] = useState<Course[]>(coursesCache || []);
  const [coursesLoading, setCoursesLoading] = useState(!coursesCache);

  // Ratings — fetched once the course list is available, keyed by course id.
  const [ratings, setRatings] = useState<Record<string, CourseRatingSummary>>({});
  const [ratingsLoaded, setRatingsLoaded] = useState(false);

  // جلب التصنيفات
  const loadCategories = useCallback(async () => {
    if (categoriesCache) {
      setCategories(categoriesCache);
      setCategoriesLoading(false);
      return;
    }
    try {
      setCategoriesLoading(true);
      const data: any = await getAdminCategories();
      const categoriesList = Array.isArray(data)
        ? data
        : data?.categories || data?.data || [];
      categoriesCache = categoriesList;
      setCategories(categoriesList);
    } catch (err: any) {
      console.error("Failed to load categories:", err);
      toast.error(err?.message || "Failed to load categories");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // جلب الكورسات
  const loadCourses = useCallback(async () => {
    if (coursesCache) {
      setCourses(coursesCache);
      setCoursesLoading(false);
      return;
    }
    try {
      setCoursesLoading(true);
      const data: any = await getAllCourses();
      const coursesList = Array.isArray(data)
        ? data
        : data?.courses || data?.data || [];
      coursesCache = coursesList;
      setCourses(coursesList);
    } catch (err: any) {
      console.error("Failed to load courses:", err);
      toast.error(err?.message || "Failed to load courses");
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadCourses();
  }, [loadCategories, loadCourses]);

  // Fetch a rating summary for every published course, in parallel. A
  // failed lookup for a single course falls back to "no ratings" instead
  // of breaking the whole homepage.
  useEffect(() => {
    if (courses.length === 0) return;
    let cancelled = false;
    (async () => {
      setRatingsLoaded(false);
      const results = await Promise.all(
        courses.map((c: any) =>
          getCourseRatings(c.id).catch(
            () => ({ course_id: c.id, average_rating: 0, total_ratings: 0 }) as CourseRatingSummary,
          ),
        ),
      );
      if (cancelled) return;
      const map: Record<string, CourseRatingSummary> = {};
      results.forEach((r) => {
        map[r.course_id] = r;
      });
      setRatings(map);
      setRatingsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [courses]);

  const published = courses.filter(
    (c: any) => String(c.status || "").toLowerCase() === "published",
  );

  // Featured section: show the top 5 rated courses. If none of the
  // published courses have any ratings yet, fall back to the 5 most
  // recently added courses instead.
  const ratedCourses = ratingsLoaded
    ? published
        .filter((c: any) => (ratings[c.id]?.total_ratings ?? 0) > 0)
        .sort(
          (a: any, b: any) =>
            (ratings[b.id]?.average_rating ?? 0) - (ratings[a.id]?.average_rating ?? 0),
        )
        .slice(0, 5)
    : [];

  const latestCourses = [...published]
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    )
    .slice(0, 5);

  const featured = !ratingsLoaded
    ? published.slice(0, 5)
    : ratedCourses.length > 0
      ? ratedCourses
      : latestCourses;

  const ctaPoints = [
    t("home.ctaFeature1"),
    t("home.ctaFeature2"),
    t("home.ctaFeature3"),
    t("home.ctaFeature4"),
  ];

  return (
    <SiteLayout>
      {/* Hero */}
    <section className="relative isolate flex min-h-[520px] items-center overflow-hidden sm:min-h-[620px] lg:min-h-[700px]">
  {/* Background */}
 <div
  className="absolute inset-0 -z-30 bg-cover bg-center bg-no-repeat"
  style={{
    backgroundImage: `url(${HERO_BG_URL})`,
    backgroundSize: "cover",
    imageRendering: "auto",
  }}
  aria-hidden="true"
/>

  {/* Gradient overlay */}
  <div
    className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(2,6,23,0.82)_38%,rgba(2,6,23,0.55)_68%,rgba(2,6,23,0.72)_100%)]"
    aria-hidden="true"
  />

  {/* Bottom fade */}
  <div
    className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-slate-950 to-transparent"
    aria-hidden="true"
  />

  {/* Ambient glow */}
  <div
    className="pointer-events-none absolute -left-32 top-1/3 -z-10 h-80 w-80 rounded-full bg-sky-400/20 blur-[120px]"
    aria-hidden="true"
  />

  <div className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
    <div className="max-w-3xl">

      {/* Eyebrow */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-medium text-sky-200 backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
        {t("home.learnSmarterGrowFaster")}
      </div>

      {/* Heading */}
      <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
        {t("home.heroTitle1")}{" "}
        <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
          {t("home.heroHighlight")}
        </span>
        .
        <br className="hidden sm:block" />{" "}
        {t("home.heroTitle2")}
      </h1>

      {/* Subtitle */}
      <p className="mt-7 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
        {t("home.heroSubtitle")}
      </p>

      {/* CTA */}
      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          asChild
          size="lg"
          className="h-12 rounded-xl bg-sky-400 px-6 font-semibold text-slate-950 shadow-[0_8px_30px_rgba(56,189,248,0.25)] transition-all hover:-translate-y-0.5 hover:bg-sky-300 hover:shadow-[0_12px_35px_rgba(56,189,248,0.35)]"
        >
          <Link to="/courses">
            {t("home.browseCourses")}
            <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>

        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 rounded-xl border-white/15 bg-white/[0.06] px-6 font-medium text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          <Link to="/pricing">
            <PlayCircle className="me-2 h-4 w-4" />
            {t("home.watchDemo")}
          </Link>
        </Button>
      </div>

      {/* Trust indicators */}
      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/55">
        <div className="flex items-center gap-2">
          <span className="text-sky-300">✓</span>
         {t("home.expertLedCourses")}
        </div>

        <div className="hidden h-4 w-px bg-white/15 sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-sky-300">✓</span>
          {t("home.learnAtYourOwnPace")}
        </div>

        <div className="hidden h-4 w-px bg-white/15 sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-sky-300">✓</span>
          {t("home.trackYourProgress")}
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Categories */}
      <section className="bg-[#f3f9ff] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">{t("home.browseCategory")}</h2>
              <p className="mt-2 text-black/60">{t("home.browseCategoryDesc")}</p>
            </div>
            <Button variant="ghost" asChild className="text-sky-600 hover:bg-sky-100 hover:text-sky-700">
              <Link to="/courses">{t("home.allCourses")} <ArrowRight className="ms-1.5 h-4 w-4 rtl:rotate-180" /></Link>
            </Button>
          </div>

          <div className="mt-10">
            {categoriesLoading ? (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                {[...Array(6)].map((_, i) => (
                  <CategorySkeleton key={i} />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-black/50">No categories found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                {categories.map((c) => (
                  <div key={c.id} className="group">
                    <Card className="flex flex-col items-center justify-center border-black/10 bg-white p-5 text-center shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-sky-300 group-hover:shadow-lg">
                      <div className="relative mx-auto flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-50 text-sky-500 shadow-sm transition-transform duration-300 group-hover:scale-105">
                        {c.image_url || c.image ? (
                          <img src={c.image_url || c.image} alt={c.name} className="h-full w-full object-cover" />
                        ) : (
                          <BookOpen className="h-8 w-8" />
                        )}
                      </div>
                      <div className="mt-4 w-full">
                        <p className="line-clamp-1 text-sm font-semibold tracking-tight text-black transition-colors group-hover:text-sky-600">{c.name}</p>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Popular courses */}
      <section className="border-t border-black/10 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">{t("home.popularTitle")}</h2>
              <p className="mt-2 text-black/60">{t("home.popularSubtitle")}</p>
            </div>
            <Button
              variant="outline"
              asChild
              className="border-sky-300 text-sky-600 hover:bg-sky-50 hover:text-sky-700"
            >
              <Link to="/courses">{t("common.viewAll")}</Link>
            </Button>
          </div>

          <div className="mt-10">
            {coursesLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <CourseCardSkeleton key={i} />
                ))}
              </div>
            ) : featured.length === 0 ? (
              <p className="text-sm text-black/50">No courses found.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((c: any) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    isAuthenticated={isAuthenticated}
                    rating={ratings[c.id]}
                    ratingsLoaded={ratingsLoaded}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white pb-24 pt-4 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden border-none bg-black p-0 shadow-2xl">
            <div className="p-10 text-white sm:p-14">
              <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                <div>
                  <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("home.ctaTitle")}</h3>
                  <p className="mt-3 max-w-xl text-white/70">
                    {t("home.ctaSubtitle")}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button asChild size="lg" className="bg-sky-400 text-black hover:bg-sky-300">
                      <Link to="/register">{t("home.startFreeTrial")}</Link>
                    </Button>
                  </div>
                </div>
                <ul className="space-y-3 text-sm">
                  {ctaPoints.map((text) => (
                    <li key={text} className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-sky-400 text-black">
                        <Check className="h-3 w-3" />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </SiteLayout>
  );
}

// ---- Unified CourseCard ----
function CourseCard({
  course: c,
  isAuthenticated,
  rating,
  ratingsLoaded,
}: {
  course: any;
  isAuthenticated?: boolean;
  rating?: CourseRatingSummary;
  ratingsLoaded?: boolean;
}) {
  const coverStyle = c.image_cover
    ? c.image_cover.startsWith("linear-gradient")
      ? { background: c.image_cover }
      : { backgroundImage: `url(${c.image_cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: c.cover };

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-black/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Link to="/courses/$id" params={{ id: c.id }} className="block">
        <div className="relative h-40 overflow-hidden bg-sky-50" style={coverStyle}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 transition-opacity duration-300 group-hover:from-black/50" />
          <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
            <Badge className="border-none bg-white/95 text-black capitalize backdrop-blur-sm hover:bg-white/95">
              {c.categories?.name || c.category || "General"}
            </Badge>
            {isNewCourse(c.created_at) && (
              <Badge className="border-none bg-sky-400 text-black">New</Badge>
            )}
          </div>
        </div>
      </Link>

      {isAuthenticated && (
        <CourseWishlistButton
          courseId={c.id}
          courseTitle={c.title}
          className="absolute right-3 top-3"
        />
      )}

      <Link to="/courses/$id" params={{ id: c.id }} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-black/50">by {c.profiles?.full_name || c.teacher || "Instructor"}</p>
            {ratingsLoaded && rating?.total_ratings ? (
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-black/70">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {rating.average_rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-black transition-colors group-hover:text-sky-600">
            {c.title}
          </h3>

          {(c.subtitle || c.description) && (
            <p className="mt-2 line-clamp-2 text-sm text-black/60">
              {c.subtitle || c.description}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/10 pt-4 text-xs text-black/50">
            {c.level && (
              <span className="flex items-center gap-1 capitalize">
                <GraduationCap className="h-3.5 w-3.5 text-sky-500" />
                {c.level}
              </span>
            )}
            {c.language && (
              <span className="flex items-center gap-1">
                <Globe2 className="h-3.5 w-3.5 text-sky-500" />
                {c.language}
              </span>
            )}
            {c.created_at && (
              <span className="ml-auto flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-sky-500" />
                {formatDate(c.created_at)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}