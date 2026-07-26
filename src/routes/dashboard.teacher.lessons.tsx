import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileVideo, ListChecks, BookOpen, Plus } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CourseService } from "@/services";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { useKeyedStorage } from "@/hooks/useKeyedStorage";
import { storageKeys, type Lesson } from "@/lib/lms-storage";
import { notifyLessonPublished } from "@/lib/notification-events";
import { toast } from "sonner";

type Row = Lesson & { course: string; courseId: string; module: string; moduleIndex: number; lessonIndex: number };

export const Route = createFileRoute("/dashboard/teacher/lessons")({
  head: () => ({ meta: [{ title: "Lessons — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Lessons,
});

function Lessons() {
  const courses = useTeacherCourses();
  // subscribe to module changes so add/edit/delete reflects immediately
  useKeyedStorage(storageKeys.teacherModules, () => Date.now());

  const rows = useMemo<Row[]>(() => {
    return courses.flatMap((c) =>
      CourseService.modules(c.id).flatMap((m, mi) =>
        m.lessons.map((l, li) => ({
          ...l, course: c.title, courseId: c.id, module: m.title, moduleIndex: mi, lessonIndex: li,
        })),
      ),
    );
  }, [courses]);

  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  const cols: Column<Row>[] = [
    { key: "title", header: "Lesson", sortable: true, render: (r) => (
      <div className="flex items-center gap-2">
        {r.kind === "quiz" ? <ListChecks className="h-4 w-4 text-primary" />
          : r.kind === "reading" ? <BookOpen className="h-4 w-4 text-primary" />
          : <FileVideo className="h-4 w-4 text-primary" />}
        <span className="font-medium">{r.title}</span>
      </div>
    )},
    { key: "course", header: "Course", sortable: true },
    { key: "module", header: "Module" },
    { key: "kind", header: "Type", render: (r) => <Badge variant="outline" className="capitalize">{r.kind}</Badge> },
    { key: "duration", header: "Duration" },
  ];

  function saveEdit(next: Lesson) {
    if (!editing) return;
    const mods = CourseService.modules(editing.courseId).map((m, mi) =>
      mi !== editing.moduleIndex ? m : {
        ...m,
        lessons: m.lessons.map((l, li) => li !== editing.lessonIndex ? l : { ...l, ...next }),
      });
    CourseService.setModules(editing.courseId, mods);
    toast.success("Lesson updated");
    setEditing(null);
  }
  function removeRow(r: Row) {
    const mods = CourseService.modules(r.courseId).map((m, mi) =>
      mi !== r.moduleIndex ? m : { ...m, lessons: m.lessons.filter((_, li) => li !== r.lessonIndex) });
    CourseService.setModules(r.courseId, mods);
    toast.success("Lesson removed");
  }
  function createLesson(payload: { courseId: string; moduleIndex: number; title: string; duration: string; kind: Lesson["kind"] }) {
    const mods = CourseService.modules(payload.courseId).map((m, mi) =>
      mi !== payload.moduleIndex ? m : {
        ...m,
        lessons: [...m.lessons, {
          id: `${m.id}-l${Date.now()}`,
          title: payload.title, duration: payload.duration, kind: payload.kind,
        }],
      });
    CourseService.setModules(payload.courseId, mods);
    const course = courses.find((c) => c.id === payload.courseId);
    if (course) notifyLessonPublished({ courseId: course.id, courseTitle: course.title, lessonTitle: payload.title });
    toast.success("Lesson created — students notified");
    setCreating(false);
  }

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Lessons"
        description="Every lesson across your courses."
        actions={<Button onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" /> New lesson</Button>}
      />
      <DataTable
        data={rows} columns={cols} searchKeys={["title", "course"]}
        filters={[{ key: "kind", label: "Type", options: ["video", "reading", "quiz"] }]}
        pageSize={10}
        onEdit={(r) => setEditing(r)}
        onDelete={removeRow}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit lesson</DialogTitle></DialogHeader>
          {editing && <LessonForm initial={editing} onSubmit={saveEdit} />}
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>New lesson</DialogTitle></DialogHeader>
          <NewLessonForm courses={courses} onSubmit={createLesson} />
        </DialogContent>
      </Dialog>
    </RoleDashboardLayout>
  );
}

function LessonForm({ initial, onSubmit }: { initial: Lesson; onSubmit: (l: Lesson) => void }) {
  const [f, setF] = useState<Lesson>(initial);
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}>
      <div className="space-y-1.5"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v as Lesson["kind"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="reading">Reading</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Duration</Label><Input value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} /></div>
      </div>
      <DialogFooter><Button type="submit">Save</Button></DialogFooter>
    </form>
  );
}

function NewLessonForm({ courses, onSubmit }: {
  courses: { id: string; title: string }[];
  onSubmit: (p: { courseId: string; moduleIndex: number; title: string; duration: string; kind: Lesson["kind"] }) => void;
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [moduleIndex, setModuleIndex] = useState(0);
  const [title, setTitle] = useState("New lesson");
  const [duration, setDuration] = useState("10 min");
  const [kind, setKind] = useState<Lesson["kind"]>("video");
  const mods = courseId ? CourseService.modules(courseId) : [];
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ courseId, moduleIndex, title, duration, kind }); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Course</Label>
          <Select value={courseId} onValueChange={(v) => { setCourseId(v); setModuleIndex(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Module</Label>
          <Select value={String(moduleIndex)} onValueChange={(v) => setModuleIndex(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{mods.map((m, i) => <SelectItem key={m.id} value={String(i)}>{m.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as Lesson["kind"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="reading">Reading</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Duration</Label><Input value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
      </div>
      <DialogFooter><Button type="submit">Create</Button></DialogFooter>
    </form>
  );
}
