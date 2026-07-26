import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft, FileVideo, GripVertical, ListChecks, Plus, Save, Trash2,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { courses } from "@/lib/mock-data";
import { CourseService } from "@/services";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/courses/$id")({
  head: () => ({ meta: [{ title: "Course builder — Lumen" }, { name: "robots", content: "noindex" }] }),
  loader: ({ params }) => {
    const course = CourseService.get(params.id) ?? courses.find((c) => c.id === params.id);
    if (!course) throw notFound();
    return { course };
  },
  component: Builder,
  errorComponent: ({ error, reset }) => (
    <RoleDashboardLayout role="teacher">
      <Card className="p-10 text-center border-border/60 shadow-card">
        <p className="text-sm font-semibold">Something went wrong</p>
        <p className="mt-2 text-xs text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </Card>
    </RoleDashboardLayout>
  ),
  notFoundComponent: () => (
    <RoleDashboardLayout role="teacher">
      <Card className="p-10 text-center border-border/60 shadow-card">Course not found</Card>
    </RoleDashboardLayout>
  ),
});

function Builder() {
  const { course } = Route.useLoaderData();
  const initial = useMemo(() => CourseService.modules(course.id), [course.id]);
  const [modules, setModules] = useState(initial);
  const [form, setForm] = useState({
    title: course.title, price: String(course.price), description: course.description,
  });

  const save = () => {
    CourseService.setModules(course.id, modules);
    CourseService.save({
      ...course,
      title: form.title,
      price: Number(form.price) || 0,
      description: form.description,
      lessons: modules.reduce((n, m) => n + m.lessons.length, 0),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    toast.success("Changes saved");
  };

  const addModule = () => setModules((m) => [...m, {
    id: `${course.id}-m${m.length + 1}`, title: `New module ${m.length + 1}`, lessons: [],
  }]);
  const addLesson = (mi: number) => setModules((m) => m.map((mod, i) =>
    i !== mi ? mod : { ...mod, lessons: [...mod.lessons, {
      id: `${mod.id}-l${mod.lessons.length + 1}`, title: "New lesson", duration: "10 min", kind: "video",
    }]}));
  const removeLesson = (mi: number, li: number) => setModules((m) => m.map((mod, i) =>
    i !== mi ? mod : { ...mod, lessons: mod.lessons.filter((_, j) => j !== li) }));

  return (
    <RoleDashboardLayout role="teacher">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/dashboard/teacher/courses"><ChevronLeft className="mr-1 h-4 w-4" /> Courses</Link>
        </Button>
        <span>/</span><span className="truncate">{course.title}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
          <p className="text-sm text-muted-foreground">Build your course structure and details.</p>
        </div>
        <Button onClick={save}><Save className="mr-1.5 h-4 w-4" /> Save</Button>
      </div>

      <Tabs defaultValue="curriculum">
        <TabsList>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum" className="space-y-4">
          {modules.map((mod, mi) => (
            <Card key={mod.id} className="border-border/60 p-5 shadow-card">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={mod.title}
                  onChange={(e) => setModules((all) => all.map((m, i) => i === mi ? { ...m, title: e.target.value } : m))}
                  className="max-w-md font-semibold"
                />
                <Badge variant="outline" className="ml-auto">{mod.lessons.length} lessons</Badge>
              </div>
              <div className="mt-4 divide-y divide-border/60">
                {mod.lessons.map((l, li) => (
                  <div key={l.id} className="flex items-center gap-3 py-2">
                    {l.kind === "quiz" ? <ListChecks className="h-4 w-4 text-primary" /> : <FileVideo className="h-4 w-4 text-primary" />}
                    <Input
                      value={l.title}
                      onChange={(e) => setModules((all) => all.map((m, i) => i === mi ? {
                        ...m, lessons: m.lessons.map((x, j) => j === li ? { ...x, title: e.target.value } : x),
                      } : m))}
                      className="flex-1"
                    />
                    <Input
                      value={l.duration}
                      onChange={(e) => setModules((all) => all.map((m, i) => i === mi ? {
                        ...m, lessons: m.lessons.map((x, j) => j === li ? { ...x, duration: e.target.value } : x),
                      } : m))}
                      className="w-32"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeLesson(mi, li)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => addLesson(mi)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add lesson
              </Button>
            </Card>
          ))}
          <Button variant="outline" onClick={addModule}><Plus className="mr-1.5 h-4 w-4" /> Add module</Button>
        </TabsContent>

        <TabsContent value="details">
          <Card className="border-border/60 p-6 shadow-card space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card className="border-border/60 p-6 shadow-card space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Compare-at price</Label>
                <Input placeholder="Optional" />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </RoleDashboardLayout>
  );
}
