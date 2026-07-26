import { createFileRoute } from "@tanstack/react-router";
import { Compass, Heart, Sparkles, Users } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Lumen" },
      { name: "description", content: "Lumen is on a mission to make learning feel effortless — beautifully designed, expertly crafted." },
      { property: "og:title", content: "About Lumen" },
      { property: "og:description", content: "Learning should feel effortless. Meet the team behind Lumen." },
    ],
  }),
  component: About,
});

const stats = [
  { v: "128k+", l: "Active learners" },
  { v: "1.4M", l: "Lessons completed" },
  { v: "320+", l: "Expert instructors" },
  { v: "4.9★", l: "Average rating" },
];
const values = [
  { icon: Sparkles, t: "Crafted with care", d: "Every screen and lesson is polished to feel effortless." },
  { icon: Users, t: "Learner obsessed", d: "We start from real learners and work backwards." },
  { icon: Compass, t: "Clear direction", d: "We ship focused features that move the needle." },
  { icon: Heart, t: "Human first", d: "Behind every course is a real person helping others grow." },
];

function About() {
  return (
    <SiteLayout>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">We're building the classroom we always wanted.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Lumen started as a small studio obsessed with the craft of teaching.
            Today, we're a global team helping hundreds of thousands of learners grow — beautifully.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.l} className="border-border/60 p-6 text-center shadow-card">
                <p className="text-3xl font-semibold tracking-tight text-gradient-brand">{s.v}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">What we believe</h2>
            <p className="mt-2 text-muted-foreground">A few principles that guide every decision we make.</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <Card key={v.t} className="border-border/60 p-6 shadow-card">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{v.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
