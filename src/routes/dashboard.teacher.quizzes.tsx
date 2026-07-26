import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ListChecks, Trash2 } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { useQuizzes } from "@/hooks/useTeacherData";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { QuizService } from "@/services";
import { notifyQuizPublished } from "@/lib/notification-events";
import { courses as allCourses } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/quizzes")({
  head: () => ({ meta: [{ title: "Quizzes — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherQuizzes,
});

function TeacherQuizzes() {
  const quizzes = useQuizzes();
  const courses = useTeacherCourses();
  const [open, setOpen] = useState(false);

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Quizzes"
        description="Create quizzes and manage the question bank for each course."
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New quiz</Button>}
      />
      {quizzes.length === 0 ? (
        <EmptyState title="No quizzes yet" description="Create your first quiz to get started." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((q) => (
            <Card key={q.id} className="border-border/60 p-5 shadow-card">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <ListChecks className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{q.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{q.course}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { QuizService.remove(q.id); toast.success("Quiz removed"); }}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{q.questions.length} questions</Badge>
                <Badge variant="outline">{q.minutes} min</Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">Published</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild className="flex-1">
                  <Link to="/dashboard/teacher/quizzes/$id" params={{ id: q.id }}>Manage questions</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard/student/quizzes/$id" params={{ id: q.id }}>Preview</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New quiz</DialogTitle></DialogHeader>
          <NewQuizForm courses={courses.map((c) => c.title)} onSubmit={(v) => {
            QuizService.create({ title: v.title, course: v.course, minutes: v.minutes, questions: [] });
            toast.success("Quiz created");
            setOpen(false);
          }} />
        </DialogContent>
      </Dialog>
    </RoleDashboardLayout>
  );
}

function NewQuizForm({ courses, onSubmit }: { courses: string[]; onSubmit: (v: { title: string; course: string; minutes: number }) => void }) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState(courses[0] ?? "");
  const [minutes, setMinutes] = useState("10");
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ title, course, minutes: Number(minutes) || 10 }); }}>
      <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Course</Label>
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Duration (min)</Label><Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div>
      </div>
      <DialogFooter><Button type="submit">Create</Button></DialogFooter>
    </form>
  );
}
