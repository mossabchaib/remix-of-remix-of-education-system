import { createFileRoute, Link } from "@tanstack/react-router";
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
  const featured = courses.filter((c) => c.status === "Published").slice(0, 6);
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
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" /> New — Winter cohort open
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Learn with <span className="text-gradient-brand">clarity</span>.
              <br className="hidden sm:block" /> Grow with confidence.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Lumen is a premium learning platform for teams and individuals. Expert-led courses,
              beautiful classrooms, and admin tools crafted for scale.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="shadow-elegant">
                <Link to="/courses">Browse courses <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing"><PlayCircle className="mr-2 h-4 w-4" /> Watch demo</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-primary text-primary" /> 4.9 average rating</div>
              <div className="flex items-center gap-1.5"><Users className="h-4 w-4" /> 128k+ learners</div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Trusted by 300+ teams</div>
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
                <span className="ml-3 text-xs text-muted-foreground">app.lumen.school / dashboard</span>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                {featured.slice(0, 3).map((c) => (
                  <div key={c.id} className="rounded-xl border border-border/60 bg-background p-4">
                    <div className="h-24 w-full rounded-lg" style={{ backgroundImage: c.cover }} />
                    <p className="mt-3 text-sm font-semibold line-clamp-1">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.lessons} lessons · {c.hours}h</p>
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
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Why Lumen</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Everything a modern classroom needs</h2>
            <p className="mt-3 text-muted-foreground">A single, polished home for learners, teachers, and administrators.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: BookOpen, title: "Curated curriculum", desc: "Beautifully organized paths designed by industry experts." },
              { icon: GraduationCap, title: "Expert instructors", desc: "Learn from practitioners who ship every day." },
              { icon: Zap, title: "Delightful UX", desc: "Fast, focused interfaces that get out of your way." },
              { icon: TrendingUp, title: "Progress insights", desc: "Real-time analytics for learners and teams." },
              { icon: Award, title: "Credentials", desc: "Beautiful, verifiable certificates on completion." },
              { icon: ShieldCheck, title: "Enterprise ready", desc: "SSO, roles, and admin tools built for scale." },
            ].map((f) => (
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
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Browse by category</h2>
              <p className="mt-2 text-muted-foreground">Find your next skill in a growing library of 150+ courses.</p>
            </div>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/courses">All courses <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
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
                  <p className="text-xs text-muted-foreground">{c.courses} courses</p>
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
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Popular this week</h2>
              <p className="mt-2 text-muted-foreground">Hand-picked highlights from our catalog.</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/courses">View all</Link>
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
                  <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to level up your team?</h3>
                  <p className="mt-3 max-w-xl text-primary-foreground/85">
                    Start with a 14-day free trial. Unlimited seats, all courses, cancel anytime.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild size="lg" variant="secondary" className="text-foreground">
                      <Link to="/register">Start free trial</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                      <Link to="/contact">Talk to sales</Link>
                    </Button>
                  </div>
                </div>
                <ul className="space-y-3 text-sm">
                  {["Unlimited courses & certificates","SSO & role-based access","Team analytics dashboard","Dedicated success manager"].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-white/15">
                        <Check className="h-3 w-3" />
                      </span>
                      {t}
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
  return (
    <Link to="/courses/$id" params={{ id: c.id }}>
      <Card className="group h-full overflow-hidden border-border/60 shadow-card transition hover:shadow-elegant hover:-translate-y-0.5">
        <div className="relative h-40" style={{ backgroundImage: c.cover }}>
          <Badge className="absolute left-3 top-3 bg-background/85 text-foreground hover:bg-background/85">{c.category}</Badge>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{c.level}</span><span>·</span><span>{c.hours}h · {c.lessons} lessons</span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold">{c.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">by {c.teacher}</p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-medium">{c.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({c.students.toLocaleString()})</span>
            </div>
            <p className="text-base font-semibold">{c.price === 0 ? "Free" : `$${c.price}`}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
