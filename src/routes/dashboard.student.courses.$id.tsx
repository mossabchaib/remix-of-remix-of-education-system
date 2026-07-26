import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, CheckCircle2, ChevronLeft, Circle, Download, FileText,
  ListChecks, PlayCircle, Save, Sparkles, StickyNote, Volume2,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { courses } from "@/lib/mock-data";
import {
  courseProgress, getLessonNote, getProgress, modulesForCourse, pdfResources,
  setLessonComplete, setLessonNote, touchCourse,
} from "@/lib/lms-storage";
import { toast } from "sonner";
import { useProgress } from "@/hooks/useStudentData";

export const Route = createFileRoute("/dashboard/student/courses/$id")({
  head: () => ({ meta: [{ title: "Course player — Lumen" }, { name: "robots", content: "noindex" }] }),
  loader: ({ params }) => {
    const course = courses.find((c) => c.id === params.id);
    if (!course) throw notFound();
    return { course };
  },
  component: CoursePlayer,
  notFoundComponent: () => (
    <RoleDashboardLayout role="student">
      <Card className="p-10 text-center border-border/60 shadow-card">
        <p className="text-lg font-semibold">Course not found</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard/student/courses">Back to my courses</Link>
        </Button>
      </Card>
    </RoleDashboardLayout>
  ),
});

function CoursePlayer() {
  const { course } = Route.useLoaderData();
  const navigate = useNavigate();
  const modules = useMemo(() => modulesForCourse(course.id), [course.id]);
  const allLessons = useMemo(() => modules.flatMap((m) => m.lessons), [modules]);

  useProgress(); // subscribe to progress updates
  const progressMap = getProgress()[course.id] ?? {};

  // First incomplete lesson, or first
  const initial = allLessons.find((l) => !progressMap[l.id])?.id ?? allLessons[0].id;
  const [currentId, setCurrentId] = useState<string>(initial);

  useEffect(() => { touchCourse(course.id); }, [course.id]);

  const total = allLessons.length;
  const p = courseProgress(course.id, total);
  const current = allLessons.find((l) => l.id === currentId) ?? allLessons[0];
  const idx = allLessons.findIndex((l) => l.id === current.id);
  const module = modules.find((m) => m.lessons.some((l) => l.id === current.id));

  const [note, setNote] = useState(() => getLessonNote(course.id, current.id));
  useEffect(() => { setNote(getLessonNote(course.id, current.id)); }, [course.id, current.id]);
  const saveNote = () => {
    setLessonNote(course.id, current.id, note);
    toast.success("Note saved");
  };

  const resources = pdfResources.filter((r) => r.course === course.title).slice(0, 4);

  const toggle = (id: string, done: boolean) => setLessonComplete(course.id, id, done);
  const goPrev = () => {
    const prev = allLessons[Math.max(idx - 1, 0)];
    setCurrentId(prev.id);
  };
  const goNext = () => {
    toggle(current.id, true);
    const next = allLessons[Math.min(idx + 1, allLessons.length - 1)];
    setCurrentId(next.id);
  };

  return (
    <RoleDashboardLayout role="student">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/dashboard/student/courses">
            <ChevronLeft className="mr-1 h-4 w-4" /> My courses
          </Link>
        </Button>
        <span>/</span>
        <span className="truncate">{course.title}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden border-border/60 p-0 shadow-card">
            <div className="relative flex aspect-video items-center justify-center" style={{ backgroundImage: course.cover }}>
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/95 text-primary shadow-elegant">
                  {current.kind === "quiz" ? <ListChecks className="h-7 w-7" />
                    : current.kind === "reading" ? <FileText className="h-7 w-7" />
                    : <PlayCircle className="h-7 w-7" />}
                </div>
                <p className="mt-3 text-sm font-medium text-white/90">Lesson {idx + 1} of {total}</p>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full">
                  <PlayCircle className="h-5 w-5" />
                </Button>
                <div className="flex-1"><Progress value={((idx + 1) / total) * 100} className="h-1.5" /></div>
                <Volume2 className="h-4 w-4" />
                <Badge className="bg-white/20 text-white hover:bg-white/20 border-transparent">{current.duration}</Badge>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{module?.title}</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight">{current.title}</h1>
                </div>
                {progressMap[current.id] && (
                  <Badge className="bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={goPrev} disabled={idx === 0}>Previous</Button>
                <Button onClick={goNext}>
                  {idx === allLessons.length - 1 ? "Mark complete" : "Mark complete & continue"}
                </Button>
                <Button variant="outline" onClick={() => toggle(current.id, !progressMap[current.id])}>
                  {progressMap[current.id] ? "Mark as not done" : "Mark complete"}
                </Button>
                {current.kind === "quiz" && (
                  <Button asChild variant="secondary">
                    <Link to="/dashboard/student/quizzes/$id" params={{ id: "q1" }}>Take quiz</Link>
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card className="border-border/60 p-6 shadow-card">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="notes">
                  <StickyNote className="mr-1 h-3.5 w-3.5" /> Notes
                </TabsTrigger>
                <TabsTrigger value="resources">Resources ({resources.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">About this course</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {course.description} In this lesson we cover the essentials with hands-on examples,
                  guided walkthroughs, and downloadable exercises so you can practice as you learn.
                </p>
                <div className="grid gap-4 sm:grid-cols-4">
                  <Stat label="Level" value={course.level} />
                  <Stat label="Lessons" value={String(total)} />
                  <Stat label="Duration" value={`${course.hours}h`} />
                  <Stat label="Rating" value={`${course.rating.toFixed(1)} ★`} />
                </div>
              </TabsContent>
              <TabsContent value="notes" className="space-y-3 pt-4">
                <p className="text-xs text-muted-foreground">
                  Your personal notes for <span className="font-medium text-foreground">{current.title}</span> —
                  saved locally to your device.
                </p>
                <Textarea rows={8} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Type your notes here…" />
                <div className="flex justify-end">
                  <Button onClick={saveNote}><Save className="mr-1.5 h-4 w-4" /> Save note</Button>
                </div>
              </TabsContent>
              <TabsContent value="resources" className="space-y-2 pt-4">
                {resources.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    No downloadable resources for this course yet.
                  </p>
                ) : (
                  resources.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">PDF · {r.pages}p · {r.size}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.success(`${r.title} downloaded`)}
                      >
                        <Download className="mr-1.5 h-4 w-4" /> Get
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="border-border/60 p-4 shadow-card">
            <div className="flex items-center justify-between px-2 pb-3">
              <div>
                <p className="text-sm font-semibold">Course content</p>
                <p className="text-xs text-muted-foreground">{p.done} of {total} lessons</p>
              </div>
              <Badge variant="outline">{p.pct}%</Badge>
            </div>
            <Progress value={p.pct} className="mx-2 mb-3 h-1.5" />
            <div className="max-h-[560px] overflow-y-auto pr-1">
              {modules.map((m) => (
                <div key={m.id} className="mb-3">
                  <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.title}</p>
                  <ul className="space-y-0.5">
                    {m.lessons.map((l) => {
                      const done = !!progressMap[l.id];
                      const active = l.id === current.id;
                      return (
                        <li key={l.id}>
                          <button
                            onClick={() => setCurrentId(l.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                              active ? "bg-primary-soft text-primary" : "hover:bg-muted/50",
                            )}
                          >
                            {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                              : l.kind === "quiz" ? <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
                              : l.kind === "reading" ? <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                              : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            <span className="min-w-0 flex-1 truncate">{l.title}</span>
                            <span className="text-xs text-muted-foreground">{l.duration}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2 px-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate({ to: "/dashboard/student/progress" })}>
                Progress
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate({ to: "/dashboard/student/certificates" })}>
                Certificate
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </RoleDashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
