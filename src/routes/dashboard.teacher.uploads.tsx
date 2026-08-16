import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText, FileVideo, Trash2, UploadCloud, Link2, Loader2, CheckCircle2, BookOpen,
  AlertTriangle, Eye, ExternalLink, Radio, Plus, Filter, XCircle, ChevronLeft, ChevronRight, Check,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useUploads } from "@/hooks/useUploads";
import {
  resolvedModules,
  updateStoredLesson,
  addStoredUpload,
  // ⚠️ NEEDS TO EXIST in lms-storage.ts — same contract as addStoredUpload
  // but takes a video URL instead of a File. Must create an `uploads` row
  // (kind: "video", url, course_id, lesson_id?) and return { url }.
  // Until it's added, wizard submission for video/recording will fail —
  // see submitWizard() below, marked with the same warning.
  // addStoredVideoLink,
  deleteStoredUpload,
  getLiveSessions,
  upsertLiveSession,
  getTeacherCourses,
  storageKeys,
  STORAGE_EVENT,
  type Module,
  type LiveSession,
} from "@/lib/lms-storage";
import { EmptyState } from "@/components/common/EmptyState";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/uploads")({
  head: () => ({ meta: [{ title: "Uploads — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Uploads,
});

interface TeacherCourse {
  id: string;
  title: string;
}

type ContentType = "pdf" | "video" | "recording";
type TypeFilter = "all" | "video" | "pdf";
type StatusFilter = "all" | "linked" | "unlinked";
type DeleteTarget = { id: string; title: string; kind: "video" | "pdf" };
type PreviewTarget = { id: string; title: string; url?: string; kind: "video" | "pdf" };

const GENERAL_COURSE = "General";
const WIZARD_STEPS = 4;

function isValidUUID(uuid?: string): boolean {
  if (!uuid) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}
function isLikelyUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function Uploads() {
  const { t } = useTranslation();

  // --- Courses ---
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadCourses() {
      try {
        const result = await getTeacherCourses();
        if (!isMounted) return;
        const list: TeacherCourse[] = Array.isArray(result)
          ? result
          : (result as any)?.data || (result as any)?.courses || [];
        setCourses(list);
      } catch (err) {
        console.error("Failed to load teacher courses:", err);
        if (isMounted) setCourses([]);
      } finally {
        if (isMounted) setCoursesLoading(false);
      }
    }
    loadCourses();
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (!detail || detail.key === storageKeys.teacherCourses) loadCourses();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === storageKeys.teacherCourses) loadCourses();
    };
    window.addEventListener(STORAGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      isMounted = false;
      window.removeEventListener(STORAGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Page-level course filter (used for the table only — the wizard has its
  // own course step, independent of this).
  const [pageCourse, setPageCourse] = useState<string>("all");

  // The table reads uploads for "all" courses if useUploads supports it;
  // otherwise fall back to the first course. Adjust if useUploads requires
  // a concrete courseId.
  const activeCourseId = isValidUUID(courses.find((c) => c.title === pageCourse)?.id)
    ? courses.find((c) => c.title === pageCourse)?.id
    : undefined;
  const { uploads, loading, refresh } = useUploads(activeCourseId, pageCourse === "all" ? undefined : pageCourse);
console.log("UPLOADS:", uploads);
console.log("COURSES:", courses);

uploads.forEach((upload: any, index: number) => {
  console.log(`UPLOAD ${index}:`, upload);
  console.log("course_id:", upload.course_id);
  console.log("course:", upload.course);
  console.log("courseId:", upload.courseId);
});
  // ---------------- Wizard state ----------------
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [wType, setWType] = useState<ContentType | null>(null);
  const [wCourseTitle, setWCourseTitle] = useState<string>("");
  const wCourseId = isValidUUID(courses.find((c) => c.title === wCourseTitle)?.id)
    ? courses.find((c) => c.title === wCourseTitle)?.id
    : undefined;

  const [wModules, setWModules] = useState<Module[]>([]);
  const [wModulesLoading, setWModulesLoading] = useState(false);
  const [wModuleId, setWModuleId] = useState("");
  const [wLessonId, setWLessonId] = useState("");

  const [wSessions, setWSessions] = useState<LiveSession[]>([]);
  const [wSessionsLoading, setWSessionsLoading] = useState(false);
  const [wSessionId, setWSessionId] = useState("");

  const [wFile, setWFile] = useState<File | null>(null);
  const [wVideoUrl, setWVideoUrl] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);
  const [wProgress, setWProgress] = useState(0);
  const wFileRef = useRef<HTMLInputElement>(null);

  function resetWizard() {
    setStep(1);
    setWType(null);
    setWCourseTitle("");
    setWModules([]);
    setWModuleId("");
    setWLessonId("");
    setWSessions([]);
    setWSessionId("");
    setWFile(null);
    setWVideoUrl("");
    setWProgress(0);
  }
  function openWizard() {
    resetWizard();
    setWizardOpen(true);
  }
  function closeWizard() {
    if (wSubmitting) return;
    setWizardOpen(false);
  }

  // Load modules/sessions once a course is picked inside the wizard
  useEffect(() => {
    if (!wizardOpen || !wCourseId) return;
    if (wType === "recording") {
      let cancelled = false;
      (async () => {
        setWSessionsLoading(true);
        try {
          const all = await getLiveSessions();
          const filtered = all.filter((s) => s.course_id === wCourseId);
          if (!cancelled) setWSessions(filtered);
        } catch (err) {
          console.error("Failed to load live sessions:", err);
        } finally {
          if (!cancelled) setWSessionsLoading(false);
        }
      })();
      return () => { cancelled = true; };
    } else {
      let cancelled = false;
      (async () => {
        setWModulesLoading(true);
        try {
          const mods = await resolvedModules(wCourseId);
          if (!cancelled) setWModules(mods);
        } catch (err) {
          console.error("Failed to load modules:", err);
        } finally {
          if (!cancelled) setWModulesLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [wizardOpen, wCourseId, wType]);

  const wSelectedModule = wModules.find((m) => m.id === wModuleId);
  useEffect(() => { setWLessonId(wSelectedModule?.lessons?.[0]?.id ?? ""); }, [wSelectedModule]);
  useEffect(() => { setWModuleId(wModules[0]?.id ?? ""); }, [wModules]);
  useEffect(() => { setWSessionId(wSessions[0]?.id ?? ""); }, [wSessions]);

  const canGoNext = useMemo(() => {
    if (step === 1) return !!wType;
    if (step === 2) return !!wCourseTitle;
    if (step === 3) return wType === "recording" ? !!wSessionId : !!wModuleId && !!wLessonId;
    if (step === 4) return wType === "pdf" ? !!wFile : isLikelyUrl(wVideoUrl);
    return false;
  }, [step, wType, wCourseTitle, wSessionId, wModuleId, wLessonId, wFile, wVideoUrl]);

  async function submitWizard() {
  if (!canGoNext) return;
  setWSubmitting(true);
  setWProgress(0);
  try {
    if (wType === "pdf" && wFile) {
      const result: any = await addStoredUpload(wFile, {
        course_id: wCourseId,
        courseTitle: wCourseTitle,
        lesson_id: wLessonId || undefined,
        onProgress: (pct: number) => setWProgress(pct),
      });
      const uploadedUrl = result?.url ?? result?.data?.url ?? result?.path ?? "";
      if (uploadedUrl && wLessonId) {
        await updateStoredLesson(wLessonId, { content_url: uploadedUrl });
      }
    } else {
      // video / recording: نحفظو الرابط مباشرة، بلا ما نحولوه لـ File/bytes
      const result: any = await addStoredUpload(wVideoUrl.trim(), {
        course_id: wCourseId,
        courseTitle: wCourseTitle,
        lesson_id: wType === "video" ? (wLessonId || undefined) : undefined,
        kind: "video",
      });
      const savedUrl = result?.url ?? result?.data?.url ?? result?.path ?? wVideoUrl.trim();

      if (wType === "recording" && wSessionId) {
        await upsertLiveSession({ id: wSessionId, recording_url: savedUrl });
      } else if (wType === "video" && wLessonId) {
        await updateStoredLesson(wLessonId, { content_url: savedUrl });
      }
    }

    toast.success(t("teacherUploads.wizard.saved"));
    setWizardOpen(false);
    refresh();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : t("teacherUploads.wizard.saveFailed"));
  } finally {
    setWSubmitting(false);
  }
}

  // ---------------- Link-to-lesson dialog (existing files) ----------------
  const [linking, setLinking] = useState<{ id: string; title: string; url?: string } | null>(null);
  const [linkModules, setLinkModules] = useState<Module[]>([]);
  const [linkModuleId, setLinkModuleId] = useState("");
  const [linkLessonId, setLinkLessonId] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const linkModule = linkModules.find((m) => m.id === linkModuleId);

  async function openLinkDialog(item: { id: string; title: string; url?: string; course?: string }) {
    setLinking(item);
    const cid = courses.find((c) => c.title === item.course)?.id;
    if (isValidUUID(cid)) {
      const mods = await resolvedModules(cid!);
      setLinkModules(mods);
      setLinkModuleId(mods[0]?.id ?? "");
    } else {
      setLinkModules([]);
      setLinkModuleId("");
    }
  }
  useEffect(() => { setLinkLessonId(linkModule?.lessons?.[0]?.id ?? ""); }, [linkModule]);

  async function confirmLink() {
    if (!linking || !linkLessonId) return;
    try {
      setSavingLink(true);
      await updateStoredLesson(linkLessonId, { content_url: linking.url || "" });
      toast.success(t("teacherUploads.toast.linked"));
      setLinking(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || t("teacherUploads.toast.linkFailed"));
    } finally {
      setSavingLink(false);
    }
  }

  // ---------------- Preview ----------------
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  function openPreview(item: PreviewTarget) {
    if (!item.url) {
      toast.error(t("teacherUploads.toast.noPreviewLink"));
      return;
    }
    setPreview(item);
  }

  // ---------------- Delete ----------------
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  async function confirmRemove() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteStoredUpload(deleteTarget.id);
      toast.success(t("teacherUploads.toast.removed", { title: deleteTarget.title }));
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("teacherUploads.toast.removeFailed"));
    } finally {
      setDeleting(false);
    }
  }

  // ---------------- Table filters ----------------
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

const rows = useMemo(() => {
  return uploads.map((u: any) => {
    const matchedCourse = courses.find(
      (c) => c.id === u.courseId
    );

    return {
      id: u.id,
      title: u.title,
      kind: u.kind as "video" | "pdf",
      course: matchedCourse?.title ?? "Unknown course",
      uploaded: u.uploaded,
      url: u.url,
      linked: !!u.lessonId,
    };
  });
}, [uploads, courses]);

  const filteredRows = useMemo(() => rows.filter((r) => {
    if (typeFilter !== "all" && r.kind !== typeFilter) return false;
    if (statusFilter === "linked" && !r.linked) return false;
    if (statusFilter === "unlinked" && r.linked) return false;
    return true;
  }), [rows, typeFilter, statusFilter]);

  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all" || pageCourse !== "all";
  function clearFilters() {
    setTypeFilter("all");
    setStatusFilter("all");
    setPageCourse("all");
  }

  const stepLabels = [
    t("teacherUploads.wizard.steps.type"),
    t("teacherUploads.wizard.steps.course"),
    t("teacherUploads.wizard.steps.destination"),
    t("teacherUploads.wizard.steps.content"),
  ];

  return (
    <RoleDashboardLayout role="teacher">
      <div className="space-y-6">
        {/* Page header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.08] via-background to-background p-5 shadow-sm sm:p-6">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <PageHeader
              title={t("teacherUploads.title")}
              description={t("teacherUploads.description")}
              actions={
                <Button
                  onClick={openWizard}
                  className="h-10 rounded-xl px-4 shadow-sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("teacherUploads.addContent")}
                </Button>
              }
            />
          </div>
        </div>

        {/* Quick overview */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("teacherUploads.table.name")}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{rows.length}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("teacherUploads.filters.video")}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {rows.filter((r) => r.kind === "video").length}
                </p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
                <FileVideo className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("teacherUploads.filters.pdf")}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {rows.filter((r) => r.kind === "pdf").length}
                </p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-border/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("teacherUploads.filters.linked")}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {rows.filter((r) => r.linked).length}
                </p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="rounded-2xl border-border/60 p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted">
                <Filter className="h-4 w-4 text-muted-foreground" />
              </div>
             
            </div>

            <div className="flex flex-1 flex-wrap gap-2">
              <Select value={pageCourse} onValueChange={setPageCourse}>
                <SelectTrigger className="h-9 w-full rounded-lg sm:w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("teacherUploads.filters.allCourses")}</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>
                  ))}
                  <SelectItem value={GENERAL_COURSE}>{t("teacherUploads.generalCourse")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="h-9 w-full rounded-lg sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("teacherUploads.filters.allTypes")}</SelectItem>
                  <SelectItem value="video">{t("teacherUploads.filters.video")}</SelectItem>
                  <SelectItem value="pdf">{t("teacherUploads.filters.pdf")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-9 w-full rounded-lg sm:w-[145px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("teacherUploads.filters.allStatus")}</SelectItem>
                  <SelectItem value="linked">{t("teacherUploads.filters.linked")}</SelectItem>
                  <SelectItem value="unlinked">{t("teacherUploads.filters.unlinked")}</SelectItem>
                </SelectContent>
              </Select>

             
            </div>

            <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {filteredRows.length} / {rows.length}
            </div>
          </div>
        </Card>

        {/* Upload library */}
        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-semibold">{t("teacherUploads.title")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("teacherUploads.description")}
              </p>
            </div>
            <Badge variant="secondary" className="w-fit rounded-full px-3">
              {filteredRows.length}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12" />
                  <TableHead>{t("teacherUploads.table.name")}</TableHead>
                  <TableHead>{t("teacherUploads.table.type")}</TableHead>
                  <TableHead>{t("teacherUploads.table.course")}</TableHead>
                  <TableHead>{t("teacherUploads.table.status")}</TableHead>
                  <TableHead>{t("teacherUploads.table.date")}</TableHead>
                  <TableHead className="text-right">{t("teacherUploads.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">{t("teacherUploads.loading")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!loading && filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10">
                      <EmptyState
                        title={t("teacherUploads.empty.title")}
                        description={t("teacherUploads.empty.description")}
                      />
                    </TableCell>
                  </TableRow>
                )}

                {!loading && filteredRows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="group cursor-pointer border-border/50 transition-colors hover:bg-muted/30"
                    onClick={() => openPreview(r)}
                  >
                    <TableCell>
                      <div className={`grid h-9 w-9 place-items-center rounded-xl ${
                        r.kind === "video"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-violet-500/10 text-violet-600"
                      }`}>
                        {r.kind === "video"
                          ? <FileVideo className="h-4 w-4" />
                          : <FileText className="h-4 w-4" />}
                      </div>
                    </TableCell>

                    <TableCell className="min-w-[210px]">
                      <div className="max-w-[300px]">
                        <p className="truncate font-medium">{r.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {r.url ? "Ready to preview" : "No preview link"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2.5 ${
                          r.kind === "video"
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
                            : "border-violet-500/30 bg-violet-500/10 text-violet-600"
                        }`}
                      >
                        {r.kind === "video"
                          ? t("teacherUploads.filters.video")
                          : t("teacherUploads.filters.pdf")}
                      </Badge>
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {r.course}
                    </TableCell>

                    <TableCell>
                      {r.linked ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-emerald-500/30 bg-emerald-500/10 px-2.5 text-emerald-600"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {t("teacherUploads.filters.linked")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-full px-2.5 text-muted-foreground"
                        >
                          {t("teacherUploads.filters.unlinked")}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {r.uploaded}
                    </TableCell>

                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => openPreview(r)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => openLinkDialog(r)}
                          title="Link"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: r.id, title: r.title, kind: r.kind })}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* ==================== WIZARD ==================== */}
      <Dialog open={wizardOpen} onOpenChange={(o) => !o && closeWizard()}>
        <DialogContent className="overflow-hidden rounded-2xl border-border/60 p-0 sm:max-w-xl">
          <div className="border-b border-border/60 bg-muted/20 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-lg">{t("teacherUploads.wizard.title")}</DialogTitle>
            </DialogHeader>

            <div className="mt-5 flex items-center">
              {stepLabels.map((label, i) => {
                const idx = i + 1;
                const done = idx < step;
                const active = idx === step;

                return (
                  <div key={label} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-all ${
                          done
                            ? "bg-primary text-primary-foreground"
                            : active
                              ? "border-2 border-primary bg-primary/10 text-primary"
                              : "border border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : idx}
                      </div>
                      <span className={`hidden text-[10px] font-medium sm:block ${
                        active ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {label}
                      </span>
                    </div>
                    {idx < WIZARD_STEPS && (
                      <div className={`mx-2 mb-5 h-px flex-1 ${
                        done ? "bg-primary" : "bg-border"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-h-[220px] px-6 py-6">
            <p className="mb-5 text-sm font-semibold text-foreground">
              {stepLabels[step - 1]}
            </p>

            {step === 1 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { type: "pdf" as const, icon: FileText, label: t("teacherUploads.wizard.type.pdf"), tone: "violet" },
                  { type: "video" as const, icon: FileVideo, label: t("teacherUploads.wizard.type.video"), tone: "blue" },
                  { type: "recording" as const, icon: Radio, label: t("teacherUploads.wizard.type.recording"), tone: "rose" },
                ].map(({ type, icon: Icon, label, tone }) => {
                  const active = wType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setWType(type)}
                      className={`group rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/[0.06] ring-2 ring-primary/10"
                          : "border-border/70 hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${
                        tone === "violet"
                          ? "bg-violet-500/10 text-violet-600"
                          : tone === "blue"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-rose-500/10 text-rose-600"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold">{label}</p>
                      <div className={`mt-3 h-1 w-8 rounded-full ${
                        active ? "bg-primary" : "bg-border"
                      }`} />
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  {t("teacherUploads.table.course")}
                </label>
                <Select value={wCourseTitle} onValueChange={setWCourseTitle} disabled={coursesLoading}>
                  <SelectTrigger className="h-11 rounded-xl bg-background">
                    <SelectValue placeholder={t("teacherUploads.coursePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>
                    ))}
                    <SelectItem value={GENERAL_COURSE}>{t("teacherUploads.generalCourse")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {step === 3 && wType === "recording" && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  {t("teacherUploads.destination.liveSession")}
                </label>
                <Select
                  value={wSessionId}
                  onValueChange={setWSessionId}
                  disabled={wSessionsLoading || !wSessions.length}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-background">
                    <SelectValue
                      placeholder={
                        wSessionsLoading
                          ? t("teacherUploads.loading")
                          : t("teacherUploads.destination.liveSession")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {wSessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title} — {s.startsAt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {step === 3 && wType !== "recording" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    {t("teacherUploads.destination.module")}
                  </label>
                  <Select
                    value={wModuleId}
                    onValueChange={setWModuleId}
                    disabled={wModulesLoading || !wModules.length}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-background">
                      <SelectValue
                        placeholder={
                          wModulesLoading
                            ? t("teacherUploads.loading")
                            : t("teacherUploads.destination.module")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {wModules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    {t("teacherUploads.destination.lessonField")}
                  </label>
                  <Select
                    value={wLessonId}
                    onValueChange={setWLessonId}
                    disabled={!wSelectedModule?.lessons?.length}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-background">
                      <SelectValue placeholder={t("teacherUploads.destination.lessonField")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(wSelectedModule?.lessons || []).map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 4 && wType === "pdf" && (
              <div className="space-y-4">
                <input
                  ref={wFileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setWFile(e.target.files?.[0] ?? null)}
                  disabled={wSubmitting}
                />

                <button
                  type="button"
                  onClick={() => wFileRef.current?.click()}
                  disabled={wSubmitting}
                  className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]"
                >
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-600">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold">
                    {wFile ? wFile.name : t("teacherUploads.wizard.chooseFile")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF
                  </p>
                </button>

                {wSubmitting && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("teacherUploads.wizard.saving")}</span>
                      <span className="font-medium">{wProgress}%</span>
                    </div>
                    <Progress value={wProgress} className="h-1.5" />
                  </div>
                )}
              </div>
            )}

            {step === 4 && wType !== "pdf" && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  URL
                </label>
                <Input
                  autoFocus
                  placeholder="https://..."
                  value={wVideoUrl}
                  onChange={(e) => setWVideoUrl(e.target.value)}
                  disabled={wSubmitting}
                  className="h-11 rounded-xl bg-background"
                />
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-between">
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => (step === 1 ? closeWizard() : setStep((s) => s - 1))}
              disabled={wSubmitting}
            >
              {step === 1
                ? t("teacherUploads.wizard.cancel")
                : <><ChevronLeft className="mr-1 h-4 w-4" /> {t("teacherUploads.wizard.back")}</>}
            </Button>

            {step < WIZARD_STEPS ? (
              <Button className="rounded-xl px-5" onClick={() => setStep((s) => s + 1)} disabled={!canGoNext}>
                {t("teacherUploads.wizard.next")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button className="rounded-xl px-5" onClick={submitWizard} disabled={!canGoNext || wSubmitting}>
                {wSubmitting
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <Check className="mr-1.5 h-4 w-4" />}
                {wSubmitting ? t("teacherUploads.wizard.saving") : t("teacherUploads.wizard.save")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Link to lesson ---- */}
      <Dialog open={!!linking} onOpenChange={(o) => !o && setLinking(null)}>
        <DialogContent className="rounded-2xl border-border/60 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("teacherUploads.linkDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
            <Select value={linkModuleId} onValueChange={setLinkModuleId} disabled={!linkModules.length}>
              <SelectTrigger className="h-11 rounded-xl bg-background">
                <SelectValue placeholder={t("teacherUploads.destination.module")} />
              </SelectTrigger>
              <SelectContent>
                {linkModules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={linkLessonId} onValueChange={setLinkLessonId} disabled={!linkModule?.lessons?.length}>
              <SelectTrigger className="h-11 rounded-xl bg-background">
                <SelectValue placeholder={t("teacherUploads.destination.lessonField")} />
              </SelectTrigger>
              <SelectContent>
                {(linkModule?.lessons || []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button className="rounded-xl" onClick={confirmLink} disabled={savingLink || !linkLessonId}>
              {savingLink
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <Link2 className="mr-1.5 h-4 w-4" />}
              {t("teacherUploads.linkDialog.link")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete confirmation ---- */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl border-border/60 sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="pt-1 text-center">{t("teacherUploads.deleteDialog.title")}</DialogTitle>
          </DialogHeader>
          <p className="px-2 text-center text-sm text-muted-foreground">
            {deleteTarget?.title}
          </p>
          <DialogFooter className="sm:justify-center sm:gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("teacherUploads.deleteDialog.cancel")}
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={confirmRemove} disabled={deleting}>
              {deleting
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <Trash2 className="mr-1.5 h-4 w-4" />}
              {t("teacherUploads.deleteDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Preview ---- */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className={`overflow-hidden rounded-2xl border-border/60 p-0 ${
          preview?.kind === "video" ? "sm:max-w-4xl" : "sm:max-w-5xl"
        }`}>
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <DialogTitle className="flex min-w-0 items-center gap-2 truncate text-sm">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                preview?.kind === "video"
                  ? "bg-blue-500/10 text-blue-600"
                  : "bg-violet-500/10 text-violet-600"
              }`}>
                {preview?.kind === "video"
                  ? <FileVideo className="h-4 w-4" />
                  : <FileText className="h-4 w-4" />}
              </div>
              <span className="truncate">{preview?.title}</span>
            </DialogTitle>
          </div>

          <div className="bg-muted/30 p-3 sm:p-5">
            {preview?.kind === "video" ? (
              <video
                key={preview.url}
                src={preview.url}
                controls
                autoPlay
                className="aspect-video w-full rounded-xl bg-black shadow-lg"
              />
            ) : (
              <iframe
                key={preview?.url}
                src={preview?.url}
                title={preview?.title}
                className="h-[70vh] w-full rounded-xl border border-border/60 bg-background shadow-sm"
              />
            )}
          </div>

          <DialogFooter className="border-t border-border/60 px-5 py-4">
            <Button variant="outline" className="rounded-xl" asChild>
              <a href={preview?.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                {t("teacherUploads.preview.openNewTab")}
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleDashboardLayout>
  );
}