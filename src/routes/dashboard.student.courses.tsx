import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Clock, PlayCircle, Search } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { courses } from "@/lib/mock-data";
import { courseProgress, flatLessons } from "@/lib/lms-storage";
import { useEnrollmentIds, useLastAccessed, useProgress } from "@/hooks/useStudentData";

export const Route = createFileRoute("/dashboard/student/courses")({
  head: () => ({ meta: [{ title: "My courses — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: MyCourses,
});

const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"] as const;

function MyCourses() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("All");
  const [category, setCategory] = useState<string>("All");

  const ids = useEnrollmentIds();
  const lastAccessed = useLastAccessed();
  useProgress();

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(courses.map((c) => c.category)))],
    [],
  );

  const enriched = useMemo(() => {
    return courses
      .filter((c) => ids.includes(c.id))
      .map((c) => {
        const total = flatLessons(c.id).length;
        const p = courseProgress(c.id, total);
        return { ...c, ...p, lastAt: lastAccessed[c.id] };
      });
  }, [ids, lastAccessed]);

  const filtered = enriched.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) &&
      (level === "All" || c.level === level) &&
      (category === "All" || c.category === category),
  );

  const inProgress = filtered.filter((c) => c.pct > 0 && c.pct < 100);
  const notStarted = filtered.filter((c) => c.pct === 0);
  const completed = filtered.filter((c) => c.pct === 100);

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title="My courses"
        description="Everything you're enrolled in, organized by status."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search my courses"
                className="pl-9"
              />
            </div>
            <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="progress">In progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="not-started">Not started ({notStarted.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Grid items={filtered} /></TabsContent>
        <TabsContent value="progress"><Grid items={inProgress} /></TabsContent>
        <TabsContent value="not-started"><Grid items={notStarted} /></TabsContent>
        <TabsContent value="completed"><Grid items={completed} /></TabsContent>
      </Tabs>
    </RoleDashboardLayout>
  );
}

type Item = (typeof courses)[number] & { pct: number; done: number; total: number; lastAt?: string };

function Grid({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        description="Explore the catalog to find your next course."
        action={<Button asChild><Link to="/courses">Browse courses</Link></Button>}
      />
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((c) => (
        <Card key={c.id} className="overflow-hidden border-border/60 p-0 shadow-card">
          <Link to="/dashboard/student/courses/$id" params={{ id: c.id }} className="block h-32" style={{ backgroundImage: c.cover }} />
          <div className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{c.level}</Badge>
              <Badge variant="outline" className="text-xs">{c.category}</Badge>
              {c.pct === 100 && <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>}
            </div>
            <p className="text-base font-semibold leading-snug">{c.title}</p>
            <p className="text-xs text-muted-foreground">{c.teacher}</p>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{c.done} / {c.total} lessons</span>
                <span className="font-medium">{c.pct}%</span>
              </div>
              <Progress value={c.pct} className="h-1.5" />
            </div>
            {c.lastAt && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> Last opened {new Date(c.lastAt).toLocaleDateString()}
              </p>
            )}
            <Button asChild className="w-full">
              <Link to="/dashboard/student/courses/$id" params={{ id: c.id }}>
                <PlayCircle className="mr-1.5 h-4 w-4" />
                {c.pct === 0 ? "Start course" : c.pct === 100 ? "Review" : "Continue"}
              </Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
