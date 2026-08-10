import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, BookOpen, Loader2, FolderOpen } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CourseService } from "@/services";
import { getTeacherCourses } from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/courses/")({
  head: () => ({ meta: [{ title: "My courses — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherCourses,
});

interface TeacherCourse {
  id: string;
  title?: string;
  subtitle?: string;
  language?: string;
  level?: string;
  price?: number;
  status?: string;
  image_cover?: string;
  updated_at?: string;
  created_at?: string;
}

function TeacherCourses() {
  const nav = useNavigate();
  const { t } = useTranslation();

  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courseToDelete, setCourseToDelete] = useState<TeacherCourse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch teacher courses directly from lms-storage, replacing the removed useTeacherCourses hook.
  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getTeacherCourses();
      setCourses(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Failed to load teacher courses:", err);
      toast.error(t("teacher.coursesLoadError"));
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleRequestDelete = (course: TeacherCourse) => {
    setCourseToDelete(course);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      await CourseService.remove(courseToDelete.id);
      toast.success(t("teacher.courseRemoved"));
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      setCourseToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || t("teacher.courseRemoveError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const cols: Column<TeacherCourse>[] = [
    {
      key: "title",
      header: t("admin.course"),
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-16 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-border">
            {c.image_cover && c.image_cover.startsWith("linear-gradient") ? (
              <div className="w-full h-full" style={{ background: c.image_cover }} />
            ) : c.image_cover ? (
              <img src={c.image_cover} alt="" className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{c.title || t("teacher.untitledCourse")}</p>
            <p className="truncate text-xs text-muted-foreground">{c.subtitle || c.language || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "level",
      header: t("teacher.courseLevel"),
      sortable: true,
      render: (c) => (
        <Badge variant="outline" className="capitalize font-normal">
          {c.level || "beginner"}
        </Badge>
      ),
    },
    {
      key: "language",
      header: t("teacher.courseLanguage"),
      sortable: true,
      render: (c) => <span className="text-sm text-muted-foreground">{c.language || "English"}</span>,
    },
    {
      key: "price",
      header: t("admin.price"),
      sortable: true,
      render: (c) => <span className="text-sm font-medium">${Number(c.price || 0).toLocaleString()}</span>,
    },
    {
      key: "status",
      header: t("common.status"),
      render: (c) => <StatusPill value={c.status || "draft"} />,
    },
    {
      key: "updated_at",
      header: t("admin.updated"),
      sortable: true,
      render: (c) => {
        const dateVal = c.updated_at || c.created_at;
        return <span className="text-xs text-muted-foreground">{dateVal ? new Date(dateVal).toLocaleDateString() : "—"}</span>;
      },
    },
  ];

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacher.myCourses")}
        description={t("teacher.myCoursesDesc")}
        actions={
          <Button asChild size="sm">
            <Link to="/dashboard/teacher/courses/new">
              <Plus className="mr-1.5 h-4 w-4" /> {t("teacher.newCourse")}
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-20 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("teacher.coursesLoading")}</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card py-20 text-center px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <FolderOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{t("teacher.noCoursesTitle")}</p>
            <p className="text-sm text-muted-foreground max-w-sm">{t("teacher.noCoursesDesc")}</p>
          </div>
          <Button asChild size="sm" className="mt-1">
            <Link to="/dashboard/teacher/courses/new">
              <Plus className="mr-1.5 h-4 w-4" /> {t("teacher.newCourse")}
            </Link>
          </Button>
        </div>
      ) : (
        <DataTable
          data={courses}
          columns={cols}
          searchKeys={["title", "subtitle", "language"]}
          filters={[
            { key: "status", label: t("common.status"), options: ["published", "draft", "archived"] },
            { key: "level", label: t("teacher.courseLevel"), options: ["beginner", "intermediate", "advanced"] },
          ]}
          onView={(c) => nav({ to: "/courses/$id", params: { id: c.id } })}
          onEdit={(c) => nav({ to: "/dashboard/teacher/courses/$id", params: { id: c.id } })}
          onDelete={handleRequestDelete}
        />
      )}

      <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && !isDeleting && setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacher.deleteCourseTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacher.deleteCourseDesc", {
                title: courseToDelete?.title || t("teacher.untitledCourse"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("common.deleting")}
                </>
              ) : (
                t("common.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleDashboardLayout>
  );
}