import { useEffect, useState, useCallback, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Star, BookOpen, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getAllCourses,
  deleteTeacherCourse,
  getCourseRatings,
  storageKeys,
  STORAGE_EVENT,
} from "@/lib/lms-storage";
import type { CourseRatingSummary } from "@/lib/lms-storage";
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
  ratingBucket?: string;
  price?: number;
  status?: "published" | "draft" | "archived";
}

function CoursesAdmin() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [rawCourses, setRawCourses] = useState<CourseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Ratings — fetched once courses are loaded, keyed by course id.
  const [ratings, setRatings] = useState<Record<string, CourseRatingSummary>>({});
  const [ratingsLoaded, setRatingsLoaded] = useState(false);

  // Delete confirmation modal state
  const [courseToDelete, setCourseToDelete] = useState<CourseRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Labels used both as the rating filter's exact-match "bucket" value
  // AND as the option list shown to the user — this avoids needing any
  // separate value→label mapping prop on the filter itself.
  const noRatingsLabel = t("admin.noRatings");
  const ratingBucketLabels = useMemo(
    () => [5, 4, 3, 2, 1].map((v) => t("admin.ratingAndUp", { value: v })),
    [t],
  );

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

      setRawCourses(normalized);
    } catch (err: any) {
      console.error(`Error loading storage key ${storageKeys.adminCourses}:`, err);
      setLoadError(err?.message || t("admin.coursesLoadError"));
      setRawCourses([]);
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

  // Fetch a rating summary for every course, in parallel. A failed lookup
  // for a single course falls back to "no ratings" instead of breaking
  // the whole table. Only the average is kept — the number of raters is
  // intentionally not surfaced.
  useEffect(() => {
    if (rawCourses.length === 0) {
      setRatingsLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      setRatingsLoaded(false);
      const results = await Promise.all(
        rawCourses.map((c) =>
          getCourseRatings(c.id).catch(
            () => ({ course_id: c.id, average_rating: 0, total_ratings: 0 }) as CourseRatingSummary,
          ),
        ),
      );
      if (cancelled) return;
      const map: Record<string, CourseRatingSummary> = {};
      results.forEach((r) => {
        map[r.course_id] = r;
      });
      setRatings(map);
      setRatingsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [rawCourses]);

  // Merge each course with its rating average. `ratingBucket` holds the
  // exact translated label ("4+ stars", "No ratings"...) so it can plug
  // straight into DataTable's plain string-options filter, the same way
  // "level" and "status" already do — no extra label-mapping needed.
  const courses: CourseRow[] = useMemo(() => {
    return rawCourses.map((c) => {
      const summary = ratings[c.id];
      const hasRating = !!summary?.total_ratings;
      const average = hasRating ? summary!.average_rating : 0;
      return {
        ...c,
        rating: average,
        ratingBucket: hasRating
          ? t("admin.ratingAndUp", { value: Math.floor(average) })
          : noRatingsLabel,
      };
    });
  }, [rawCourses, ratings, t, noRatingsLabel]);

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
      key: "rating",
      header: t("admin.rating"),
      sortable: true,
      render: (c: CourseRow) =>
        ratingsLoaded && c.ratingBucket !== noRatingsLabel ? (
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium">{c.rating!.toFixed(1)}</span>
          </div>
        ) : ratingsLoaded ? (
          <span className="text-xs text-muted-foreground">{noRatingsLabel}</span>
        ) : (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ),
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
            {
              key: "ratingBucket",
              label: t("admin.rating"),
              options: [...ratingBucketLabels, noRatingsLabel],
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