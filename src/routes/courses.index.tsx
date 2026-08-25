import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback, useDeferredValue, memo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Globe2, GraduationCap, CalendarDays, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { CourseWishlistButton } from "@/components/client/CourseWishlistButton";
import { useAuth } from "@/hooks/useAuth";
import { getAdminCategories, getAllCourses, getCourseRatings } from "@/lib/lms-storage";
import type { Course } from "@/lib/mock-data";
import type { CourseRatingSummary } from "@/lib/lms-storage";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Courses — Lumen" },
      { name: "description", content: "Explore expert-led courses across web development, data, design, business and more." },
      { property: "og:title", content: "Courses — Lumen" },
      { property: "og:description", content: "Explore expert-led courses across web development, data, design and more." },
    ],
  }),
  component: CoursesPage,
});

const PAGE_SIZE = 12;

function isNewCourse(createdAt?: string) {
  if (!createdAt) return false;
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return days <= 14;
}

/* ------------------------------------------------------------------ */
/* CourseCard: extracted + memoized. Combined with pagination, this    */
/* means typing in the search box only ever has to render up to        */
/* PAGE_SIZE cards, and a card whose own data hasn't changed is         */
/* skipped entirely by React.memo's shallow prop comparison. Props are  */
/* kept to primitives/strings/pre-computed values — never the raw       */
/* course object or the `t` function — so identity stays stable across  */
/* unrelated re-renders (e.g. the search input changing).               */
/* ------------------------------------------------------------------ */
type CourseCardProps = {
  id: string;
  title: string;
  subtitle?: string;
  coverStyle: React.CSSProperties;
  categoryLabel: string;
  isNew: boolean;
  isAuthenticated: boolean;
  instructorLine: string;
  level?: string;
  language?: string;
  createdAtLabel?: string;
  ratingAverage?: number;
  ratingCount?: number;
  ratingsLoaded: boolean;
};

const CourseCard = memo(function CourseCard({
  id,
  title,
  subtitle,
  coverStyle,
  categoryLabel,
  isNew,
  isAuthenticated,
  instructorLine,
  level,
  language,
  createdAtLabel,
  ratingAverage,
  ratingCount,
  ratingsLoaded,
}: CourseCardProps) {
  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-border/60 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant">
      <Link to="/courses/$id" params={{ id }} className="block">
        <div className="relative h-40 overflow-hidden" style={coverStyle}>
          {/* Subtle gradient under the image for badge/text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0 transition-opacity duration-300 group-hover:from-black/45" />
          <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
            <Badge className="capitalize bg-background/90 text-foreground backdrop-blur-sm hover:bg-background/90">
              {categoryLabel}
            </Badge>
            {isNew && (
              <Badge className="border-none bg-primary text-primary-foreground">New</Badge>
            )}
          </div>
        </div>
      </Link>

      {isAuthenticated && (
        <CourseWishlistButton courseId={id} courseTitle={title} className="absolute right-3 top-3" />
      )}

      <Link to="/courses/$id" params={{ id }} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{instructorLine}</p>
            {ratingsLoaded && ratingCount ? (
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {(ratingAverage ?? 0).toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
            {title}
          </h3>

          {subtitle && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-xs text-muted-foreground">
            {level && (
              <span className="flex items-center gap-1 capitalize">
                <GraduationCap className="h-3.5 w-3.5" />
                {level}
              </span>
            )}
            {language && (
              <span className="flex items-center gap-1">
                <Globe2 className="h-3.5 w-3.5" />
                {language}
              </span>
            )}
            {createdAtLabel && (
              <span className="ml-auto flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {createdAtLabel}
              </span>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
});

function CoursesPage() {
  const { t, i18n } = useTranslation();

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const { isAuthenticated }: any = useAuth();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all"); // "all" | "1" | "2" | "3" | "4"

  // The <Input> always reflects `q` directly, so every keystroke commits
  // instantly. The (potentially heavier) filter/sort pass below reads
  // `deferredQ` instead, which React is free to update at lower priority
  // once the input has already painted.
  const deferredQ = useDeferredValue(q);

  // Pagination — search/filter/sort still run against the FULL course
  // list, exactly as before; only rendering is limited to one page at a
  // time, which is what actually keeps the grid cheap to re-render.
  const [page, setPage] = useState(1);

  // Ratings — fetched once the course list is available, keyed by course id.
  const [ratings, setRatings] = useState<Record<string, CourseRatingSummary>>({});
  const [ratingsLoaded, setRatingsLoaded] = useState(false);

  function formatDate(createdAt?: string) {
    if (!createdAt) return "";
    return new Date(createdAt).toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" });
  }

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const data: any = await getAdminCategories();
      const categoriesList = Array.isArray(data)
        ? data
        : data?.categories || data?.data || [];
      setCategories(categoriesList);
    } catch (err: any) {
      console.error("Failed to load categories:", err);
      toast.error(err?.message || t("coursesPage.toast.categoriesError"));
    }
  }, [t]);

  // Load courses via CourseService.list()
  const loadCourses = useCallback(async () => {
    try {
      setCoursesLoading(true);
      const data: any = await getAllCourses();
      console.log("data:", data);
      const coursesList = Array.isArray(data)
        ? data
        : data?.courses || data?.data || [];
      setCourses(coursesList);
    } catch (err: any) {
      console.error("Failed to load courses:", err);
      toast.error(err?.message || t("coursesPage.toast.coursesError"));
    } finally {
      setCoursesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCategories();
    loadCourses();
  }, [loadCategories, loadCourses]);

  // Support reading the category from the URL query (e.g. ?category=Programming)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get("category");
    if (categoryParam) {
      setCat(decodeURIComponent(categoryParam));
    }
  }, []);

  // Fetch a rating summary for every course, in parallel. A failed lookup
  // for a single course falls back to "no ratings" instead of breaking
  // the whole page.
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

  const hasActiveFilters = q !== "" || cat !== "all" || level !== "all" || ratingFilter !== "all";

  function resetFilters() {
    setQ("");
    setCat("all");
    setLevel("all");
    setRatingFilter("all");
  }

  // Unchanged filter/sort logic — only the text-query source is the
  // deferred value, so the input never waits on this computation.
  const filtered = useMemo(() => {
    let list = [...courses];

    // 1. Search by title
    if (deferredQ) list = list.filter((c: any) => c.title?.toLowerCase().includes(deferredQ.toLowerCase()));

    // 2. Filter by category (matches category name, relation, or id)
    if (cat !== "all") {
      list = list.filter((c: any) =>
        (c.categories?.name?.toLowerCase() === cat.toLowerCase()) ||
        (c.category?.toLowerCase() === cat.toLowerCase()) ||
        (c.category_id === cat)
      );
    }

    // 3. Level (case-insensitive match)
    if (level !== "all") {
      list = list.filter((c: any) => c.level?.toLowerCase() === level.toLowerCase());
    }

    // 4. Minimum rating
    if (ratingFilter !== "all") {
      const minRating = Number(ratingFilter);
      list = list.filter((c: any) => (ratings[c.id]?.average_rating ?? 0) >= minRating);
    }

    // 5. Sort by average rating, highest first. Array.prototype.sort is
    // stable in modern JS engines, so courses that share the same rating
    // simply keep their existing relative order — no secondary tie-break
    // needed.
    list.sort(
      (a: any, b: any) => (ratings[b.id]?.average_rating ?? 0) - (ratings[a.id]?.average_rating ?? 0),
    );

    return list;
  }, [courses, deferredQ, cat, level, ratingFilter, ratings]);

  // Reset to page 1 whenever a filter actually changes (not on every
  // `filtered` recompute, so ratings finishing loading etc. don't reset
  // the user's current page).
  useEffect(() => {
    setPage(1);
  }, [q, cat, level, ratingFilter]);

  // Clamp page if the filtered result shrinks below the current page.
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    setPage((p) => Math.min(p, maxPage));
  }, [filtered.length]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  return (
    <SiteLayout>
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("coursesPage.title")}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t("coursesPage.subtitle", { count: courses.length })}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-11 bg-background pl-10"
                placeholder={t("coursesPage.searchPlaceholder")}
              />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="h-11 w-[180px] bg-background"><SelectValue placeholder={t("coursesPage.filters.category")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("coursesPage.filters.allCategories")}</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-11 w-[160px] bg-background"><SelectValue placeholder={t("coursesPage.filters.level")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("coursesPage.filters.allLevels")}</SelectItem>
                <SelectItem value="beginner">{t("coursesPage.levels.beginner")}</SelectItem>
                <SelectItem value="intermediate">{t("coursesPage.levels.intermediate")}</SelectItem>
                <SelectItem value="advanced">{t("coursesPage.levels.advanced")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="h-11 w-[160px] bg-background"><SelectValue placeholder={t("coursesPage.filters.rating")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("coursesPage.filters.allRatings")}</SelectItem>
                <SelectItem value="4">{t("coursesPage.filters.ratingAndUp", { value: 4 })}</SelectItem>
                <SelectItem value="3">{t("coursesPage.filters.ratingAndUp", { value: 3 })}</SelectItem>
                <SelectItem value="2">{t("coursesPage.filters.ratingAndUp", { value: 2 })}</SelectItem>
                <SelectItem value="1">{t("coursesPage.filters.ratingAndUp", { value: 1 })}</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters} className="h-11">{t("coursesPage.clearFilters")}</Button>
            )}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {coursesLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse overflow-hidden border-border/60 shadow-card">
                  <div className="h-40 w-full bg-muted/60" />
                  <div className="space-y-3 p-5">
                    <div className="h-3 w-1/3 rounded bg-muted/60" />
                    <div className="h-4 w-3/4 rounded bg-muted/60" />
                    <div className="h-3 w-1/2 rounded bg-muted/40" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={t("coursesPage.empty.title")}
              description={t("coursesPage.empty.description")}
              action={<Button onClick={resetFilters}>{t("coursesPage.resetFilters")}</Button>}
            />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paginated.map((c: any) => {
                  const coverStyle = c.image_cover
                    ? c.image_cover.startsWith("linear-gradient")
                      ? { background: c.image_cover }
                      : { backgroundImage: `url(${c.image_cover})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { backgroundImage: c.cover };

                  const courseRating = ratings[c.id];

                  return (
                    <CourseCard
                      key={c.id}
                      id={c.id}
                      title={c.title}
                      subtitle={c.subtitle || c.description}
                      coverStyle={coverStyle}
                      categoryLabel={c.categories?.name || c.category || t("coursesPage.generalCategory")}
                      isNew={isNewCourse(c.created_at)}
                      isAuthenticated={!!isAuthenticated}
                      instructorLine={t("coursesPage.byInstructor", { name: c.profiles?.full_name || c.teacher || t("coursesPage.defaultInstructor") })}
                      level={c.level}
                      language={c.language}
                      createdAtLabel={c.created_at ? formatDate(c.created_at) : undefined}
                      ratingAverage={courseRating?.average_rating}
                      ratingCount={courseRating?.total_ratings}
                      ratingsLoaded={ratingsLoaded}
                    />
                  );
                })}
              </div>

              {pageCount > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label={t("common.previousPage", "Previous page")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t("common.pageOf", { page, pageCount, defaultValue: `Page ${page} of ${pageCount}` })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    aria-label={t("common.nextPage", "Next page")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}