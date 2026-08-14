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

// Education-themed hero background (design/UI only — no data, no new imports)
const HERO_BG_URL =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2400&auto=format&fit=crop";

// ---- Simple Loader (used for categories & courses loading states) ----
function Loader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-full items-center justify-center py-16 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500" />
    </div>
  );
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
      {/* Hero — education background image with overlay for legibility */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG_URL})` }}
          aria-hidden="true"
        />
        {/* Dark tint + gradient so white text stays crisp over any part of the photo */}
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/70 to-black/90"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-4 pt-24 pb-28 sm:px-6 sm:pt-28 sm:pb-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* <Badge className="mb-5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-white backdrop-blur">
              <Sparkles className="me-1.5 h-3.5 w-3.5 text-sky-300" /> {t("home.badge")}
            </Badge> */}
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              {t("home.heroTitle1")} <span className="text-sky-300">{t("home.heroHighlight")}</span>.
              <br className="hidden sm:block" /> {t("home.heroTitle2")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
              {t("home.heroSubtitle")}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-sky-400 text-black shadow-lg shadow-sky-400/30 hover:bg-sky-300"
              >
                <Link to="/courses">{t("home.browseCourses")} <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" /></Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/pricing"><PlayCircle className="me-2 h-4 w-4" /> {t("home.watchDemo")}</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-white/70">
              <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-sky-300 text-sky-300" /> {t("home.avgRating")}</div>
              <div className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {t("home.learnersCount")}</div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> {t("home.trustedTeams")}</div>
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
              <Loader />
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
              <Loader />
            ) : featured.length === 0 ? (
              <p className="text-sm text-black/50">No courses found.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((c: any) => (
                  <CourseCard key={c.id} course={c} isAuthenticated={isAuthenticated} />
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

// ---- Unified CourseCard (identical design to /courses) ----
function CourseCard({ course: c, isAuthenticated }: { course: any; isAuthenticated?: boolean }) {
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
          <p className="text-sm text-black/50">by {c.profiles?.full_name || c.teacher || "Instructor"}</p>
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