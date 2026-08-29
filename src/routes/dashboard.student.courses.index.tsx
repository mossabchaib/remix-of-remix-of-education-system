import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
  memo,
} from "react";
import {
  BookOpen, GraduationCap, Globe2, Lock, Search, Sparkles, ShieldCheck, Heart, Star,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import {
  getAllCourses,
  hasActiveAccess,
  getMySubscription,
  getAdminCategories,
  getWishlist,
  toggleWishlist,
  getCourseRatings,
  type Subscription,
  type CourseRatingSummary,
} from "@/lib/lms-storage";

export const Route = createFileRoute("/dashboard/student/courses/")({
  head: () => ({
    meta: [{ title: "Browse courses — Lumen" }, { name: "robots", content: "noindex" }],
  }),
  component: BrowseCourses,
});

const PAGE_SIZE = 12;

/**
 * Signature device for this page: courses read like catalogued volumes on
 * a shelf. Every category gets a deterministic "spine" color — a thin bar
 * on the left edge of the card — instead of a generic colored tag.
 */
const SPINES = [
  { bg: "#8B5E3C" }, // walnut
  { bg: "#2F5D62" }, // pine
  { bg: "#7A4B6D" }, // plum
  { bg: "#B0793A" }, // brass
  { bg: "#3D5A80" }, // ink
  { bg: "#8C5B3F" }, // oak
];
function spineFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SPINES[hash % SPINES.length];
}

// Shape is defensive: the real API response for /api/courses may or may not
// join categories/profiles, so every field is read with a few fallbacks.
type RawCourse = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  status?: string;
  level?: "beginner" | "intermediate" | "advanced" | string;
  language?: string;
  image_cover?: string;
  category_id?: string;
  category?: string;
  categories?: { id?: string; name?: string };
  teacher_id?: string;
  teacher?: string;
  profiles?: { full_name?: string };
};

// Course enriched once (per courses/categories change) with the derived
// fields the grid needs. Computing these here means neither the filter
// pass nor the card render ever call categoryName()/teacherName()/spineFor()
// again — those used to run on every keystroke via `filtered` and, worse,
// a second time per card during render.
type EnrichedCourse = RawCourse & {
  _categoryName: string;
  _teacherName: string;
  _spineColor: string;
};

type CategoryRow = { id: string; name: string };

/* ------------------------------------------------------------------ */
/* CourseCard: extracted + memoized so that, combined with pagination,  */
/* re-rendering the search input never re-renders cards whose data     */
/* hasn't actually changed. Props are kept to primitives/strings/stable */
/* callbacks only — passing the raw course object or the `t` function   */
/* down would break memoization since those can change identity every   */
/* render even when nothing relevant did.                               */
/* ------------------------------------------------------------------ */
type CourseCardProps = {
  id: string;
  title: string;
  subtitle?: string;
  imageCover?: string;
  language?: string;
  spineColor: string;
  categoryName: string;
  levelLabelText: string;
  teacherName: string;
  wished: boolean;
  isPending: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  ratingsLoaded: boolean;
  viewCourseLabel: string;
  wishlistAddLabel: string;
  wishlistRemoveLabel: string;
  noRatingsLabel: string;
  onToggleWishlist: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const CourseCard = memo(function CourseCard({
  id,
  title,
  subtitle,
  imageCover,
  language,
  spineColor,
  categoryName,
  levelLabelText,
  teacherName,
  wished,
  isPending,
  ratingAverage,
  ratingCount,
  ratingsLoaded,
  viewCourseLabel,
  wishlistAddLabel,
  wishlistRemoveLabel,
  noRatingsLabel,
  onToggleWishlist,
}: CourseCardProps) {
  return (
    <Card className="group relative overflow-hidden border-border/60 p-0 shadow-card transition-shadow hover:shadow-lg">
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: spineColor }} aria-hidden />
      <div className="relative h-32 overflow-hidden bg-muted">
        {imageCover ? (
          <img
            src={imageCover}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        ) : null}
      </div>
      <button
        type="button"
        data-id={id}
        disabled={isPending}
        onClick={onToggleWishlist}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur transition-colors hover:bg-background disabled:cursor-wait"
        aria-label={wished ? wishlistRemoveLabel : wishlistAddLabel}
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            wished ? "fill-destructive text-destructive" : "text-muted-foreground"
          } ${isPending ? "scale-90" : ""}`}
        />
      </button>
      <div className="space-y-3 p-5 pl-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" style={{ borderColor: spineColor, color: spineColor }}>
              {categoryName}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {levelLabelText}
            </Badge>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {ratingsLoaded && ratingCount ? (
              <span className="text-foreground">{(ratingAverage ?? 0).toFixed(1)}</span>
            ) : (
              <span className="text-muted-foreground">{noRatingsLabel}</span>
            )}
          </div>
        </div>

        <div>
          <p className="text-base font-semibold leading-snug">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <GraduationCap className="h-3 w-3" /> {teacherName}
          </span>
          {language && (
            <span className="flex items-center gap-1">
              <Globe2 className="h-3 w-3" /> {language}
            </span>
          )}
        </div>
        <Button asChild className="w-full">
          <Link to="/dashboard/student/courses/$id" params={{ id }}>
            <BookOpen className="mr-1.5 h-4 w-4" />
            {viewCourseLabel}
          </Link>
        </Button>
      </div>
    </Card>
  );
});

/* ------------------------------------------------------------------ */
/* SearchAndFilters: owns its OWN local `query` state so every         */
/* keystroke only re-renders this small toolbar, never the parent (and */
/* therefore never the course grid). The parent's `query` state is     */
/* updated inside startTransition, so React treats it as low-priority  */
/* and won't let it block the input from repainting immediately.       */
/* Level/category/rating/wishlist toggles are cheap and go straight    */
/* through, only the free-text query needs this treatment.             */
/* ------------------------------------------------------------------ */
type SearchAndFiltersProps = {
  initialQuery: string;
  onQueryChange: (value: string) => void;
  level: string;
  onLevelChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categoryOptions: string[];
  ratingFilter: string;
  onRatingFilterChange: (value: string) => void;
  wishlistOnly: boolean;
  onToggleWishlistOnly: () => void;
  wishlistCount: number;
};

const SearchAndFilters = memo(function SearchAndFilters({
  initialQuery,
  onQueryChange,
  level,
  onLevelChange,
  category,
  onCategoryChange,
  categoryOptions,
  ratingFilter,
  onRatingFilterChange,
  wishlistOnly,
  onToggleWishlistOnly,
  wishlistCount,
}: SearchAndFiltersProps) {
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalQuery(val); // fast, local-only render — the Input never waits
    startTransition(() => {
      onQueryChange(val); // low-priority update to the parent's filter state
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-56">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={localQuery}
          onChange={handleQueryChange}
          placeholder={t("catalog.searchPlaceholder")}
          className="pl-9"
        />
      </div>
      <Select value={level} onValueChange={onLevelChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={t("catalog.level")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("catalog.allLevels")}</SelectItem>
          <SelectItem value="beginner">{t("catalog.levels.beginner")}</SelectItem>
          <SelectItem value="intermediate">{t("catalog.levels.intermediate")}</SelectItem>
          <SelectItem value="advanced">{t("catalog.levels.advanced")}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t("catalog.category")} />
        </SelectTrigger>
        <SelectContent>
          {categoryOptions.map((c) => (
            <SelectItem key={c} value={c}>
              {c === "all" ? t("catalog.allCategories") : c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={ratingFilter} onValueChange={onRatingFilterChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={t("catalog.rating")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("catalog.allRatings")}</SelectItem>
          <SelectItem value="4">{t("catalog.ratingAndUp", { value: 4 })}</SelectItem>
          <SelectItem value="3">{t("catalog.ratingAndUp", { value: 3 })}</SelectItem>
          <SelectItem value="2">{t("catalog.ratingAndUp", { value: 2 })}</SelectItem>
          <SelectItem value="1">{t("catalog.ratingAndUp", { value: 1 })}</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant={wishlistOnly ? "default" : "outline"}
        onClick={onToggleWishlistOnly}
        className="gap-1.5"
      >
        <Heart className={`h-4 w-4 ${wishlistOnly ? "fill-current" : ""}`} />
        {t("student.wishlist")}
        {wishlistCount > 0 && (
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
            {wishlistCount}
          </Badge>
        )}
      </Button>
    </div>
  );
});

function BrowseCourses() {
  const { t } = useTranslation();

  const [checking, setChecking] = useState(true);
  const [access, setAccess] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courses, setCourses] = useState<RawCourse[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all"); // "all" | "1" | "2" | "3" | "4"

  // Still deferred as a second safety net on top of the transition inside
  // SearchAndFilters — belt and suspenders, cheap to keep.
  const deferredQuery = useDeferredValue(query);

  // Pagination — search/filter/sort still run against the FULL course
  // list, exactly as before; only rendering is limited to one page.
  const [page, setPage] = useState(1);

  // Ratings — fetched once courses are loaded, keyed by course id. Kept
  // separate from `courses` so a slow ratings fetch never blocks the
  // course grid itself from rendering.
  const [ratings, setRatings] = useState<Record<string, CourseRatingSummary>>({});
  const [ratingsLoaded, setRatingsLoaded] = useState(false);

  // Wishlist — sourced from localStorage via lms-storage, never from mock data.
  const [wishlist, setWishlistState] = useState<string[]>([]);
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [wishlistPendingId, setWishlistPendingId] = useState<string | null>(null);

  const levelLabel = (lvl?: string) => (lvl ? t(`catalog.levels.${lvl}`, lvl) : t("catalog.allLevels"));

  useEffect(() => {
    setWishlistState(getWishlist());
  }, []);

  // Stable across renders (data-id read off the event target) so that
  // CourseCard's React.memo comparison isn't defeated by a fresh closure
  // every render.
  const handleToggleWishlist = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const courseId = e.currentTarget.dataset.id;
    if (!courseId) return;
    setWishlistPendingId(courseId);
    try {
      const next = toggleWishlist(courseId);
      setWishlistState(next);
    } finally {
      setWishlistPendingId(null);
    }
  }, []);

  // Straight calls into lms-storage — no custom hooks involved.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sub, ok] = await Promise.all([getMySubscription(), hasActiveAccess()]);
      if (cancelled) return;

      setSubscription(sub.plan);

      // الدورات المشتراة فرديًا والفعّالة حاليًا
      const activeCourseIds = sub.courses
        .filter((c) => c.status === "active")
        .map((c) => c.course_id);
      setOwnedCourseIds(activeCourseIds);

      // مهم: "hasPlan" يجب أن تعكس تحديدًا وجود خطة اشتراك فعّالة،
      // وليس "أي نوع وصول" — وإلا فطالب اشترى دورة واحدة فقط
      // سيُعامَل خطأً كمشترك بخطة ويرى الكتالوج كاملاً.
      const planActive = sub.plan?.status === "active";
      setHasPlan(planActive);

      // الوصول للصفحة ذاتها يبقى صحيحًا: خطة فعّالة أو دورة واحدة فأكثر
      const hasAnyAccess = planActive || activeCourseIds.length > 0;
      setAccess(hasAnyAccess);
      setChecking(false);

      if (hasAnyAccess) {
        setLoadingCourses(true);
        const [all, cats] = await Promise.all([
          getAllCourses(),
          getAdminCategories().catch(() => []),
        ]);
        if (cancelled) return;

        const allCourses = Array.isArray(all) ? all : [];
        // أصحاب الخطة يرون الكتالوج كاملاً. من اشترى دورات فردية
        // فقط يرى دوراته المشتراة حصرًا.
        const visibleCourses = planActive
          ? allCourses
          : allCourses.filter((c) => activeCourseIds.includes(c.id));

        setCourses(visibleCourses);
        setCategories(Array.isArray(cats) ? (cats as CategoryRow[]) : []);
        setLoadingCourses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch a rating summary per course, in parallel. A failed lookup for a
  // single course falls back to "no ratings" instead of breaking the
  // whole catalog.
  useEffect(() => {
    if (courses.length === 0) return;
    let cancelled = false;
    (async () => {
      setRatingsLoaded(false);
      const results = await Promise.all(
        courses.map((c) =>
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

  // O(1) lookup instead of categories.find() — that used to run once per
  // course on every single filter pass.
  const categoryMap = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat.name])),
    [categories],
  );

  const resolveCategoryName = useCallback(
    (c: RawCourse) =>
      c.categories?.name ?? c.category ?? categoryMap.get(c.category_id ?? "") ?? t("catalog.defaultCategory"),
    [categoryMap, t],
  );
  const resolveTeacherName = useCallback(
    (c: RawCourse) => c.profiles?.full_name ?? c.teacher ?? t("catalog.defaultInstructor"),
    [t],
  );

  const published = useMemo(
    () => courses.filter((c) => !c.status || c.status === "published"),
    [courses],
  );

  // Enrich each course ONCE per courses/categories change — not on every
  // keystroke. categoryName()/teacherName()/spineFor() previously ran
  // inside the `filtered` useMemo (keyed on deferredQuery) AND again per
  // card during render; now they run here, keyed only on `published` and
  // `categoryMap`, so typing never re-triggers them.
  const enrichedCourses: EnrichedCourse[] = useMemo(
    () =>
      published.map((c) => {
        const cat = resolveCategoryName(c);
        return {
          ...c,
          _categoryName: cat,
          _teacherName: resolveTeacherName(c),
          _spineColor: spineFor(cat).bg,
        };
      }),
    [published, resolveCategoryName, resolveTeacherName],
  );

  // Filtering/sorting now only does cheap string/number comparisons on
  // precomputed fields — no more per-keystroke lookups or hashing.
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const minRating = ratingFilter === "all" ? 0 : Number(ratingFilter);

    const result = enrichedCourses.filter((c) => {
      const matchesQ =
        !q || c.title.toLowerCase().includes(q) || (c.subtitle ?? "").toLowerCase().includes(q);
      const matchesLevel = level === "all" || (c.level ?? "").toLowerCase() === level;
      const matchesCat = category === "all" || c._categoryName === category;
      const matchesWishlist = !wishlistOnly || wishlist.includes(c.id);
      const matchesRating = minRating === 0 || (ratings[c.id]?.average_rating ?? 0) >= minRating;
      return matchesQ && matchesLevel && matchesCat && matchesWishlist && matchesRating;
    });

    // Sort by average rating, highest first. Array.prototype.sort is stable
    // in modern JS engines, so courses that share the same rating simply
    // keep their existing relative order — no secondary tie-break needed.
    return [...result].sort(
      (a, b) => (ratings[b.id]?.average_rating ?? 0) - (ratings[a.id]?.average_rating ?? 0),
    );
  }, [enrichedCourses, deferredQuery, level, category, wishlistOnly, wishlist, ratingFilter, ratings]);

  const categoryOptions = useMemo(
    () => ["all", ...Array.from(new Set(enrichedCourses.map((c) => c._categoryName)))],
    [enrichedCourses],
  );

  // Reset to page 1 whenever a filter actually changes (not on every
  // `filtered` recompute, so ratings finishing loading etc. don't reset
  // the user's current page).
  useEffect(() => {
    setPage(1);
  }, [query, level, category, wishlistOnly, ratingFilter]);

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

  const clearFilters = () => {
    setQuery("");
    setLevel("all");
    setCategory("all");
    setWishlistOnly(false);
    setRatingFilter("all");
  };

  if (checking) {
    return (
      <RoleDashboardLayout role="student">
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </RoleDashboardLayout>
    );
  }

  if (!access) {
    return (
      <RoleDashboardLayout role="student">
        <PageHeader title={t("catalog.title")} description={t("catalog.descriptionLocked")} />
        <LockedCatalog subscription={subscription} />
      </RoleDashboardLayout>
    );
  }

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title={t("catalog.title")}
        description={hasPlan ? t("catalog.description") : t("catalog.descriptionCourseOnly", "Courses you have purchased.")}
        actions={
          <SearchAndFilters
            initialQuery={query}
            onQueryChange={setQuery}
            level={level}
            onLevelChange={setLevel}
            category={category}
            onCategoryChange={setCategory}
            categoryOptions={categoryOptions}
            ratingFilter={ratingFilter}
            onRatingFilterChange={setRatingFilter}
            wishlistOnly={wishlistOnly}
            onToggleWishlistOnly={() => setWishlistOnly((v) => !v)}
            wishlistCount={wishlist.length}
          />
        }
      />

      <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        <span>
          {hasPlan ? (
            <>
              {t("catalog.membershipActive")}
              {subscription?.ends_at && (
                <> · {t("catalog.accessThrough", { date: new Date(subscription.ends_at).toLocaleDateString() })}</>
              )}
            </>
          ) : (
            t("catalog.courseAccessOnly", {
              count: ownedCourseIds.length,
              defaultValue: `You have access to ${ownedCourseIds.length} course(s)`,
            })
          )}
        </span>
      </div>

      {loadingCourses ? (
        <CatalogSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={wishlistOnly ? t("catalog.noWishlisted") : t("catalog.noMatch")}
          description={wishlistOnly ? t("catalog.noWishlistedDesc") : t("catalog.noMatchDesc")}
          action={
            <Button variant="outline" onClick={clearFilters}>
              {t("common.clearFilters")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {paginated.map((c) => {
              const wished = wishlist.includes(c.id);
              const isPending = wishlistPendingId === c.id;
              const courseRating = ratings[c.id];
              return (
                <CourseCard
                  key={c.id}
                  id={c.id}
                  title={c.title}
                  subtitle={c.subtitle}
                  imageCover={c.image_cover}
                  language={c.language}
                  spineColor={c._spineColor}
                  categoryName={c._categoryName}
                  levelLabelText={levelLabel(c.level)}
                  teacherName={c._teacherName}
                  wished={wished}
                  isPending={isPending}
                  ratingAverage={courseRating?.average_rating}
                  ratingCount={courseRating?.total_ratings}
                  ratingsLoaded={ratingsLoaded}
                  viewCourseLabel={t("catalog.viewCourse")}
                  wishlistAddLabel={t("student.addToWishlist")}
                  wishlistRemoveLabel={t("student.removeFromWishlist")}
                  noRatingsLabel={t("catalog.noRatings")}
                  onToggleWishlist={handleToggleWishlist}
                />
              );
            })}
          </div>

          {pageCount > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
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
    </RoleDashboardLayout>
  );
}

function LockedCatalog({ subscription }: { subscription: Subscription | null }) {
  const { t } = useTranslation();
  const pending = subscription?.status === "pending";
  const expired = subscription?.status === "expired";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60">
      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 gap-5 p-6 opacity-[0.12] blur-[1px] sm:grid-cols-4">
        {[...SPINES, ...SPINES].map((s, i) => (
          <div key={i} className="h-40 rounded-lg" style={{ background: s.bg }} />
        ))}
      </div>
      <div className="relative flex flex-col items-center gap-4 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background shadow-card">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold">
            {pending
              ? t("catalog.locked.pendingTitle")
              : expired
                ? t("catalog.locked.expiredTitle")
                : t("catalog.locked.title")}
          </h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {pending
              ? t("catalog.locked.pendingDesc")
              : expired
                ? t("catalog.locked.expiredDesc")
                : t("catalog.locked.defaultDesc")}
          </p>
        </div>
        {!pending && (
          <Button asChild size="lg" className="mt-2">
            <Link to="/dashboard/student/orders">
              <Sparkles className="mr-1.5 h-4 w-4" />
              {expired ? t("catalog.locked.renew") : t("catalog.locked.viewPlans")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
      ))}
    </div>
  );
}