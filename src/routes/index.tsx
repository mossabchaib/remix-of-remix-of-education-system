import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, BookOpen, GraduationCap, ShieldCheck, Sparkles,
  Star, Users, Zap, PlayCircle, Award, TrendingUp, Check,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { courses, categories } from "@/lib/mock-data";

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

function Home() {
  const { t } = useTranslation();
  const featured = courses.filter((c) => c.status === "Published").slice(0, 6);

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

          {/* Preview mock */}
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
                {featured.slice(0, 3).map((c) => (
                  <div key={c.id} className="rounded-xl border border-border/60 bg-background p-4">
                    <div className="h-24 w-full rounded-lg" style={{ backgroundImage: c.cover }} />
                    <p className="mt-3 text-sm font-semibold line-clamp-1">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.lessons} {t("home.lessons")} · {c.hours}h</p>
                  </div>
                ))}
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
            {categories.map((c) => (
              <Link key={c.id} to="/courses" className="group">
                <Card className="border-border/60 p-4 text-center shadow-card transition group-hover:shadow-elegant group-hover:-translate-y-0.5">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl" style={{ background: c.color + "22", color: c.color }}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.courses} {t("nav.courses").toLowerCase()}</p>
                </Card>
              </Link>
            ))}
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
            {featured.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
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

function CourseCard({ course: c }: { course: typeof courses[number] }) {
  const { t } = useTranslation();
  return (
    <Link to="/courses/$id" params={{ id: c.id }}>
      <Card className="group h-full overflow-hidden border-border/60 shadow-card transition hover:shadow-elegant hover:-translate-y-0.5">
        <div className="relative h-40" style={{ backgroundImage: c.cover }}>
          <Badge className="absolute start-3 top-3 bg-background/85 text-foreground hover:bg-background/85">{c.category}</Badge>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{c.level}</span><span>·</span><span>{c.hours}h · {c.lessons} {t("home.lessons")}</span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold">{c.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.courseBy")} {c.teacher}</p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-medium">{c.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({c.students.toLocaleString()})</span>
            </div>
            <p className="text-base font-semibold">{c.price === 0 ? t("common.free") : `$${c.price}`}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
