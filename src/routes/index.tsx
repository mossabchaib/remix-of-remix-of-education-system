import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowRight, BookOpen, GraduationCap, ShieldCheck, Sparkles,
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
import { getAdminCategories, getAllCourses } from "@/lib/lms-storage";
import type { Course } from "@/lib/mock-data";

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

// ---- Helpers (same as /courses) ----
function isNewCourse(createdAt?: string) {
  if (!createdAt) return false;
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return days <= 14;
}

function formatDate(createdAt?: string) {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Home() {
  const { t } = useTranslation();
  const { isAuthenticated }: any = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // جلب التصنيفات
  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const data: any = await getAdminCategories();
      const categoriesList = Array.isArray(data)
        ? data
        : data?.categories || data?.data || [];
      setCategories(categoriesList);
    } catch (err: any) {
      console.error("Failed to load categories:", err);
      toast.error(err?.message || "Failed to load categories");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // جلب الكورسات من نفس المصدر المستخدم في صفحة /courses
  const loadCourses = useCallback(async () => {
    try {
      setCoursesLoading(true);
      const data: any = await getAllCourses();
      const coursesList = Array.isArray(data)
        ? data
        : data?.courses || data?.data || [];
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

  const featured = courses
    .filter((c: any) => String(c.status || "").toLowerCase() === "published")
    .slice(0, 6);

  const features = [
    { icon: BookOpen, title: t("home.featureCurriculum"), desc: t("home.featureCurriculumDesc") },
    { icon: GraduationCap, title: t("home.featureInstructors"), desc: t("home.featureInstructorsDesc") },
    { icon: Zap, title: t("home.featureUx"), desc: t("home.featureUxDesc") },
    { icon: TrendingUp, title: t("home.featureProgress"), desc: t("home.featureProgressDesc") },
    { icon: Award, title: t("home.featureCredentials"), desc: t("home.featureCredentialsDesc") },
    { icon: ShieldCheck, title: t("home.featureEnterprise"), desc: t("home.featureEnterpriseDesc") },
  ];

  const ctaPoints = [
    t("home.ctaFeature1"),
    t("home.ctaFeature2"),
    t("home.ctaFeature3"),
    t("home.ctaFeature4"),
  ];

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute top-40 right-0 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5 rounded-full border border-border/60 bg-background/60 px-3 py-1 backdrop-blur">
              <Sparkles className="me-1.5 h-3.5 w-3.5 text-primary" /> {t("home.badge")}
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              {t("home.heroTitle1")} <span className="text-gradient-brand">{t("home.heroHighlight")}</span>.
              <br className="hidden sm:block" /> {t("home.heroTitle2")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              {t("home.heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="shadow-elegant">
                <Link to="/courses">{t("home.browseCourses")} <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing"><PlayCircle className="me-2 h-4 w-4" /> {t("home.watchDemo")}</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-primary text-primary" /> {t("home.avgRating")}</div>
              <div className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {t("home.learnersCount")}</div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> {t("home.trustedTeams")}</div>
            </div>
          </div>

          {/* Preview mock (app.lumen.school/dashboard) */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="absolute -inset-1 rounded-3xl gradient-brand opacity-20 blur-2xl" />
            <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-card/90 shadow-elegant backdrop-blur">
              <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="ms-3 text-xs text-muted-foreground">{t("home.previewUrl")}</span>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                {coursesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden border-border/60 shadow-card animate-pulse">
                      <div className="h-40 w-full bg-muted/60" />
                      <div className="space-y-3 p-5">
                        <div className="h-3 w-1/3 rounded bg-muted/60" />
                        <div className="h-4 w-3/4 rounded bg-muted/60" />
                        <div className="h-3 w-1/2 rounded bg-muted/40" />
                      </div>
                    </Card>
                  ))
                ) : featured.length === 0 ? (
                  <p className="col-span-full text-sm text-muted-foreground">No courses found.</p>
                ) : (
                  featured.slice(0, 3).map((c: any) => (
                    <CourseCard key={c.id} course={c} isAuthenticated={isAuthenticated} />
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60 bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("home.whyLumen")}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("home.featuresTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("home.featuresSubtitle")}</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-border/60 p-6 shadow-card transition hover:shadow-elegant hover:-translate-y-0.5">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("home.browseCategory")}</h2>
              <p className="mt-2 text-muted-foreground">{t("home.browseCategoryDesc")}</p>
            </div>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/courses">{t("home.allCourses")} <ArrowRight className="ms-1.5 h-4 w-4 rtl:rotate-180" /></Link>
            </Button>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categoriesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="flex flex-col items-center justify-center border-border/60 p-5 animate-pulse">
                  <div className="h-20 w-20 rounded-full bg-muted/60" />
                  <div className="mt-4 h-3.5 w-16 rounded bg-muted/60" />
                </Card>
              ))
            ) : categories.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">No categories found.</p>
            ) : (
              categories.map((c) => (
                <div key={c.id}  className="group">
                  <Card className="flex flex-col items-center justify-center border-border/60 p-5 text-center shadow-card transition-all duration-300 group-hover:shadow-elegant group-hover:-translate-y-1">
                    <div
                      className="relative mx-auto flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-background shadow-md transition-transform duration-300 group-hover:scale-105"
                      style={{ background: (c.color || "#3b82f6") + "15", color: c.color || "#3b82f6" }}
                    >
                      {c.image_url || c.image ? (
                        <img src={c.image_url || c.image} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <BookOpen className="h-8 w-8" />
                      )}
                    </div>
                    <div className="mt-4 w-full">
                      <p className="line-clamp-1 text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">{c.name}</p>
                    </div>
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Popular courses */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("home.popularTitle")}</h2>
              <p className="mt-2 text-muted-foreground">{t("home.popularSubtitle")}</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/courses">{t("common.viewAll")}</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coursesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-border/60 shadow-card animate-pulse">
                  <div className="h-40 w-full bg-muted/60" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-1/3 rounded bg-muted/60" />
                    <div className="h-4 w-3/4 rounded bg-muted/60" />
                    <div className="h-3 w-1/2 rounded bg-muted/40" />
                  </div>
                </Card>
              ))
            ) : featured.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">No courses found.</p>
            ) : (
              featured.map((c: any) => (
                <CourseCard key={c.id} course={c} isAuthenticated={isAuthenticated} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden border-none bg-transparent p-0 shadow-elegant">
            <div className="gradient-brand p-10 sm:p-14 text-primary-foreground">
              <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                <div>
                  <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("home.ctaTitle")}</h3>
                  <p className="mt-3 max-w-xl text-primary-foreground/85">
                    {t("home.ctaSubtitle")}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild size="lg" variant="secondary" className="text-foreground">
                      <Link to="/register">{t("home.startFreeTrial")}</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                      <Link to="/contact">{t("home.talkToSales")}</Link>
                    </Button>
                  </div>
                </div>
                <ul className="space-y-3 text-sm">
                  {ctaPoints.map((text) => (
                    <li key={text} className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-white/15">
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

// ---- Unified CourseCard (identical design to /courses) ----
function CourseCard({ course: c, isAuthenticated }: { course: any; isAuthenticated?: boolean }) {
  const coverStyle = c.image_cover
    ? c.image_cover.startsWith("linear-gradient")
      ? { background: c.image_cover }
      : { backgroundImage: `url(${c.image_cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: c.cover };

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-border/60 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant">
      <Link to="/courses/$id" params={{ id: c.id }} className="block">
        <div className="relative h-40 overflow-hidden" style={coverStyle}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0 transition-opacity duration-300 group-hover:from-black/45" />
          <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
            <Badge className="bg-background/90 text-foreground hover:bg-background/90 capitalize backdrop-blur-sm">
              {c.categories?.name || c.category || "General"}
            </Badge>
            {isNewCourse(c.created_at) && (
              <Badge className="border-none bg-primary text-primary-foreground">New</Badge>
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
          <p className="text-sm text-muted-foreground">by {c.profiles?.full_name || c.teacher || "Instructor"}</p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
            {c.title}
          </h3>

          {(c.subtitle || c.description) && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {c.subtitle || c.description}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-xs text-muted-foreground">
            {c.level && (
              <span className="flex items-center gap-1 capitalize">
                <GraduationCap className="h-3.5 w-3.5" />
                {c.level}
              </span>
            )}
            {c.language && (
              <span className="flex items-center gap-1">
                <Globe2 className="h-3.5 w-3.5" />
                {c.language}
              </span>
            )}
            {c.created_at && (
              <span className="ml-auto flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(c.created_at)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}