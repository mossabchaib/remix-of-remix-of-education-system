import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, GraduationCap, Globe2, Lock, Search, Sparkles, ShieldCheck, Heart, Star,
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

type CategoryRow = { id: string; name: string };

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

  const handleToggleWishlist = async (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlistPendingId(courseId);
    try {
      const next = toggleWishlist(courseId);
      setWishlistState(next);
    } finally {
      setWishlistPendingId(null);
    }
  };

  // Straight calls into lms-storage — no custom hooks involved.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sub, ok] = await Promise.all([getMySubscription(), hasActiveAccess()]);
      if (cancelled) return;

      // Fixed: was storing the whole {plan, courses} object instead of just the plan.
      setSubscription(sub.plan);

      // Individually purchased courses that are currently active.
      const activeCourseIds = sub.courses
        .filter((c) => c.status === "active")
        .map((c) => c.course_id);
      setOwnedCourseIds(activeCourseIds);
      setHasPlan(ok);

      // Access is granted either via an active plan OR at least one active course purchase.
      const hasAnyAccess = ok || activeCourseIds.length > 0;
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
        // Plan holders see the full catalog. Course-only buyers see only
        // the courses they actually purchased.
        const visibleCourses = ok
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

  const categoryName = (c: RawCourse) =>
    c.categories?.name ?? c.category ?? categories.find((x) => x.id === c.category_id)?.name ?? t("catalog.defaultCategory");
  const teacherName = (c: RawCourse) => c.profiles?.full_name ?? c.teacher ?? t("catalog.defaultInstructor");

  const published = useMemo(
    () => courses.filter((c) => !c.status || c.status === "published"),
    [courses],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minRating = ratingFilter === "all" ? 0 : Number(ratingFilter);

    const result = published.filter((c) => {
      const matchesQ =
        !q || c.title.toLowerCase().includes(q) || (c.subtitle ?? "").toLowerCase().includes(q);
      const matchesLevel = level === "all" || (c.level ?? "").toLowerCase() === level;
      const matchesCat = category === "all" || categoryName(c) === category;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [published, query, level, category, categories, wishlistOnly, wishlist, ratingFilter, ratings]);

  const categoryOptions = useMemo(
    () => ["all", ...Array.from(new Set(published.map((c) => categoryName(c))))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [published, categories],
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("catalog.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Select value={level} onValueChange={setLevel}>
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
            <Select value={category} onValueChange={setCategory}>
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
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
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
              onClick={() => setWishlistOnly((v) => !v)}
              className="gap-1.5"
            >
              <Heart className={`h-4 w-4 ${wishlistOnly ? "fill-current" : ""}`} />
              {t("student.wishlist")}
              {wishlist.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                  {wishlist.length}
                </Badge>
              )}
            </Button>
          </div>
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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const spine = spineFor(categoryName(c));
            const wished = wishlist.includes(c.id);
            const isPending = wishlistPendingId === c.id;
            const courseRating = ratings[c.id];
            return (
              <Card
                key={c.id}
                className="group relative overflow-hidden border-border/60 p-0 shadow-card transition-shadow hover:shadow-lg"
              >
                <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: spine.bg }} aria-hidden />
                <div
                  className="h-32 bg-muted bg-cover bg-center"
                  style={c.image_cover ? { backgroundImage: `url(${c.image_cover})` } : undefined}
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={(e) => handleToggleWishlist(c.id, e)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur transition-colors hover:bg-background disabled:cursor-wait"
                  aria-label={wished ? t("student.removeFromWishlist") : t("student.addToWishlist")}
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
                      <Badge variant="outline" style={{ borderColor: spine.bg, color: spine.bg }}>
                        {categoryName(c)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {levelLabel(c.level)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-medium">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {ratingsLoaded && courseRating?.total_ratings ? (
                        <span className="text-foreground">
                          {courseRating.average_rating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{t("catalog.noRatings")}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-base font-semibold leading-snug">{c.title}</p>
                    {c.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{c.subtitle}</p>}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> {teacherName(c)}
                    </span>
                    {c.language && (
                      <span className="flex items-center gap-1">
                        <Globe2 className="h-3 w-3" /> {c.language}
                      </span>
                    )}
                  </div>
                  <Button asChild className="w-full">
                    <Link to="/dashboard/student/courses/$id" params={{ id: c.id }}>
                      <BookOpen className="mr-1.5 h-4 w-4" />
                      {t("catalog.viewCourse")}
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