import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { categories, courses } from "@/lib/mock-data";

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

function CoursesPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [sort, setSort] = useState<string>("popular");

  const filtered = useMemo(() => {
    let list = courses.filter((c) => c.status !== "Archived");
    if (q) list = list.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
    if (cat !== "all") list = list.filter((c) => c.category === cat);
    if (level !== "all") list = list.filter((c) => c.level === level);
    if (sort === "popular") list = [...list].sort((a, b) => b.students - a.students);
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "priceLow") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "priceHigh") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [q, cat, level, sort]);

  return (
    <SiteLayout>
      <section className="border-b border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Course catalog</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Browse {courses.length}+ premium courses. Filter by category, level, and more.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-10 bg-background" placeholder="Search for a topic, e.g. TypeScript" />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="h-11 w-[180px] bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-11 w-[160px] bg-background"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-11 w-[170px] bg-background">
                <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most popular</SelectItem>
                <SelectItem value="rating">Top rated</SelectItem>
                <SelectItem value="priceLow">Price: Low → High</SelectItem>
                <SelectItem value="priceHigh">Price: High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
            <EmptyState title="No courses match your filters" description="Try clearing search or picking a different category." action={<Button onClick={() => { setQ(""); setCat("all"); setLevel("all"); }}>Reset filters</Button>} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <Link key={c.id} to="/courses/$id" params={{ id: c.id }}>
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
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
