import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Course } from "@/lib/mock-data";
import { CourseService } from "@/services";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/courses/")({
  head: () => ({ meta: [{ title: "My courses — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherCourses,
});

function TeacherCourses() {
  const rows = useTeacherCourses();
  const nav = useNavigate();
  const cols: Column<Course>[] = [
    { key: "title", header: "Course", sortable: true, render: (c) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-14 rounded-md" style={{ backgroundImage: c.cover }} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{c.title}</p>
          <p className="truncate text-xs text-muted-foreground">{c.category}</p>
        </div>
      </div>
    )},
    { key: "level", header: "Level", sortable: true, render: (c) => <Badge variant="outline">{c.level}</Badge> },
    { key: "students", header: "Students", sortable: true, render: (c) => c.students.toLocaleString() },
    { key: "rating", header: "Rating", sortable: true, render: (c) => `${c.rating.toFixed(1)} ★` },
    { key: "price", header: "Price", sortable: true, render: (c) => `$${c.price}` },
    { key: "status", header: "Status", render: (c) => <StatusPill value={c.status} /> },
    { key: "updatedAt", header: "Updated", sortable: true },
  ];
  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="My courses"
        description="Manage every course you've published or are drafting."
        actions={
          <Button asChild size="sm">
            <Link to="/dashboard/teacher/courses/new"><Plus className="mr-1.5 h-4 w-4" /> New course</Link>
          </Button>
        }
      />
      <DataTable
        data={rows}
        columns={cols}
        searchKeys={["title", "category"]}
        filters={[
          { key: "status", label: "Status", options: ["Published", "Draft", "Archived"] },
          { key: "level", label: "Level", options: ["Beginner", "Intermediate", "Advanced"] },
        ]}
        onView={(c) => nav({ to: "/courses/$id", params: { id: c.id } })}
        onEdit={(c) => nav({ to: "/dashboard/teacher/courses/$id", params: { id: c.id } })}
        onDelete={(c) => { CourseService.remove(c.id); toast.success("Course removed"); }}
      />
    </RoleDashboardLayout>
  );
}
