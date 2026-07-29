import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const cols: Column<Course>[] = [
    { key: "title", header: t("admin.course"), sortable: true, render: (c) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-14 rounded-md" style={{ backgroundImage: c.cover }} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{c.title}</p>
          <p className="truncate text-xs text-muted-foreground">{c.category}</p>
        </div>
      </div>
    )},
    { key: "level", header: t("teacher.courseLevel"), sortable: true, render: (c) => <Badge variant="outline">{c.level}</Badge> },
    { key: "students", header: t("admin.students"), sortable: true, render: (c) => c.students.toLocaleString() },
    { key: "rating", header: t("admin.rating"), sortable: true, render: (c) => `${c.rating.toFixed(1)} ★` },
    { key: "price", header: t("admin.price"), sortable: true, render: (c) => `$${c.price}` },
    { key: "status", header: t("common.status"), render: (c) => <StatusPill value={c.status} /> },
    { key: "updatedAt", header: t("admin.updated"), sortable: true },
  ];
  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacher.myCourses")}
        description={t("teacher.myCoursesDesc")}
        actions={
          <Button asChild size="sm">
            <Link to="/dashboard/teacher/courses/new"><Plus className="mr-1.5 h-4 w-4" /> {t("teacher.newCourse")}</Link>
          </Button>
        }
      />
      <DataTable
        data={rows}
        columns={cols}
        searchKeys={["title", "category"]}
        filters={[
          { key: "status", label: t("common.status"), options: ["Published", "Draft", "Archived"] },
          { key: "level", label: t("teacher.courseLevel"), options: ["Beginner", "Intermediate", "Advanced"] },
        ]}
        onView={(c) => nav({ to: "/courses/$id", params: { id: c.id } })}
        onEdit={(c) => nav({ to: "/dashboard/teacher/courses/$id", params: { id: c.id } })}
        onDelete={(c) => { CourseService.remove(c.id); toast.success(t("teacher.courseRemoved")); }}
      />
    </RoleDashboardLayout>
  );
}
