import { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Star, BookOpen, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getAllCourses,
  deleteTeacherCourse,
  storageKeys,
  STORAGE_EVENT,
} from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/courses/")({
  component: CoursesAdmin,
});

interface CourseRow {
  id: string;
  title?: string;
  image_cover?: string;
  category?: string;
  language?: string;
  level?: "beginner" | "intermediate" | "advanced";
  teacher?: { full_name?: string } | string;
  teacher_name?: string;
  students_count?: number;
  students?: number;
  rating?: number;
  price?: number;
  status?: "published" | "draft" | "archived";
}

function CoursesAdmin() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [courseToDelete, setCourseToDelete] = useState<CourseRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

const loadCourses = useCallback(async () => {
    try {
      setLoadError(null);
      const result = await getAllCourses();
      
      // ضع الـ console.log هنا لمعرفة شكل البيانات الخام والمنظمة
      console.log("Raw courses result:", result);

      const normalized = Array.isArray(result)
        ? result
        : (result as any)?.data || (result as any)?.courses || [];
      
      console.log("Normalized courses data:", normalized);

      setCourses(normalized);
    } catch (err: any) {
      console.error(`Error loading storage key ${storageKeys.adminCourses}:`, err);
      setLoadError(err?.message || t("admin.coursesLoadError"));
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (isMounted) await loadCourses();
    })();

    const handleCustomSync = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (!detail || detail.key === storageKeys.adminCourses) loadCourses();
    };
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === null || e.key === storageKeys.adminCourses) loadCourses();
    };

    window.addEventListener(STORAGE_EVENT, handleCustomSync);
    window.addEventListener("storage", handleStorageSync);

    return () => {
      isMounted = false;
      window.removeEventListener(STORAGE_EVENT, handleCustomSync);
      window.removeEventListener("storage", handleStorageSync);
    };
  }, [loadCourses]);

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTeacherCourse(courseToDelete.id);
      toast.success(t("teacher.courseRemoved"));
      setCourseToDelete(null);
      await loadCourses();
    } catch (err: any) {
      toast.error(err?.message || t("admin.courseDeleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

 const columns: Column<CourseRow>[] = [
    {
      key: "title",
      header: t("admin.course"),
      sortable: true,
      render: (c:any) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-14 shrink-0 rounded-md overflow-hidden bg-primary/10 flex items-center justify-center">
            {c.image_cover && c.image_cover.startsWith("linear-gradient") ? (
              <div className="w-full h-full" style={{ background: c.image_cover }} />
            ) : c.image_cover ? (
              <img src={c.image_cover} alt="" className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {c.title || t("admin.untitledCourse")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {c.categories?.name || c.language || "—"} · {t(`teacher.level.${c.level || "beginner"}`)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "teacher",
      header: t("admin.instructor"),
      sortable: true,
      render: (c:any) => c.profiles?.full_name || (typeof c.teacher === "object" ? c.teacher?.full_name : c.teacher) || c.teacher_name || "—",
    },
    {
      key: "status",
      header: t("common.status"),
      sortable: true,
      render: (c) => <StatusPill value={c.status || "draft"} />,
    },
  ];

  return (
    <>
      <PageHeader title={t("admin.courses")} description={t("admin.coursesDesc")} />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">{t("admin.loadingCourses")}</p>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-16 text-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-destructive">{loadError}</p>
          <button
            onClick={loadCourses}
            className="rounded-md border border-border bg-background px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : (
        <DataTable
          data={courses}
          columns={columns}
          searchKeys={["title", "teacher", "category"]}
          filters={[
            {
              key: "level",
              label: t("teacher.courseLevel"),
              options: ["beginner", "intermediate", "advanced"],
            },
            {
              key: "status",
              label: t("common.status"),
              options: ["published", "draft", "archived"],
            },
          ]}
          onView={(c) => navigate({ to: "/admin/courses/$id", params: { id: c.id } })}
          onDelete={(c) => setCourseToDelete(c)}
        />
      )}

      {courseToDelete && (
        <DeleteConfirmationModal
          courseTitle={courseToDelete.title || t("admin.untitledCourse")}
          isDeleting={isDeleting}
          onCancel={() => !isDeleting && setCourseToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}

interface DeleteConfirmationModalProps {
  courseTitle: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmationModal({
  courseTitle,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <h2 className="text-center text-base font-semibold text-foreground">
          {t("admin.deleteCourseTitle")}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("admin.deleteCourseDesc", { title: courseTitle })}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isDeleting ? t("common.deleting") : t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}