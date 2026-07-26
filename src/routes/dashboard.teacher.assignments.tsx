import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { type Assignment } from "@/lib/lms-storage";
import { useAssignments } from "@/hooks/useTeacherData";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { AssignmentService } from "@/services";
import { notifyAssignmentCreated } from "@/lib/notification-events";
import { courses as allCourses } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/assignments")({
  head: () => ({ meta: [{ title: "Assignments — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Assignments,
});

function Assignments() {
  const rows = useAssignments();
  const courses = useTeacherCourses();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);

  const cols: Column<Assignment>[] = [
    { key: "title", header: "Title", sortable: true },
    { key: "course", header: "Course", sortable: true },
    { key: "due", header: "Due", sortable: true },
    { key: "status", header: "Status", render: (r) => <StatusPill value={r.status} /> },
    { key: "grade", header: "Grade", render: (r) => r.grade ?? "—" },
  ];

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Assignments"
        description="Create assignments and review submissions."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> New</Button>}
      />
      <DataTable
        data={rows}
        columns={cols}
        searchKeys={["title", "course"]}
        filters={[{ key: "status", label: "Status", options: ["Pending", "Submitted", "Graded"] }]}
        onView={(a) => { setEditing(a); setOpen(true); }}
        onEdit={(a) => { setEditing(a); setOpen(true); }}
        onDelete={(a) => { AssignmentService.remove(a.id); toast.success("Assignment removed"); }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit assignment" : "New assignment"}</DialogTitle></DialogHeader>
          <Form
            initial={editing ?? undefined}
            courses={courses.map((c) => c.title)}
            onSubmit={(a) => {
              if (editing) { AssignmentService.save({ ...editing, ...a }); toast.success("Assignment updated"); }
              else {
                const created = AssignmentService.create(a);
                notifyAssignmentCreated({
                  courseId: allCourses.find((c) => c.title === created.course)?.id,
                  courseTitle: created.course,
                  assignmentId: created.id,
                  title: created.title,
                  due: created.due,
                });
                toast.success("Assignment created — students notified");
              }
              setOpen(false); setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </RoleDashboardLayout>
  );
}

function Form({ initial, courses, onSubmit }: {
  initial?: Assignment; courses: string[]; onSubmit: (a: Omit<Assignment, "id">) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [course, setCourse] = useState(initial?.course ?? courses[0] ?? "");
  const [due, setDue] = useState(initial?.due ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<Assignment["status"]>(initial?.status ?? "Pending");
  const [grade, setGrade] = useState(initial?.grade ?? "");
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ title, course, due, status, grade: grade || undefined }); }}>
      <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Course</Label>
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Assignment["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Graded">Graded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Grade (optional)</Label><Input value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
      </div>
      <DialogFooter><Button type="submit">Save</Button></DialogFooter>
    </form>
  );
}
