import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText, FileVideo, Trash2, UploadCloud, Link2, Loader2, CheckCircle2, BookOpen,
  AlertTriangle, Lock, Eye, ExternalLink, Radio,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useUploads } from "@/hooks/useUploads";
import {
  resolvedModules,
  updateStoredLesson,
  addStoredUpload,
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

// Minimal shape we rely on for a teacher's course. Kept local since the
// removed hook did not expose a dedicated type for it.
interface TeacherCourse {
  id: string;
  title: string;
}

// In-flight uploads that haven't finished yet — kept client-side so the
// progress bar has something to render before the backend confirms and
// `refresh()` pulls the real record in from Supabase/R2.
type PendingUpload = {
  id: string;
  title: string;
  size: string;
  kind: "video" | "pdf";
  progress: number;
};

type DeleteTarget = { id: string; title: string; kind: "video" | "pdf" };
type PreviewTarget = { id: string; title: string; url?: string; kind: "video" | "pdf" };

// Whether a new upload should be attached to a course lesson or to a live
// session as its recording.
type AttachTarget = "lesson" | "recording";

const GENERAL_COURSE = "General";

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function isValidUUID(uuid?: string): boolean {
  if (!uuid) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}
function isVideoFile(f: File): boolean {
  return f.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(f.name);
}

function Uploads() {
  const { t } = useTranslation();

  // --- Courses: previously sourced from useTeacherCourses(), now read
  // directly from lms-storage and kept in sync via its storage events. ---
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

  const [course, setCourse] = useState<string>(GENERAL_COURSE);
  // Once courses finish their first load, default the selection to the
  // teacher's first course instead of staying on "General" — mirrors what
  // `courses[0]?.title ?? "General"` intended when courses arrived synchronously.
  const didDefaultCourse = useRef(false);
  useEffect(() => {
    if (!coursesLoading && !didDefaultCourse.current) {
      didDefaultCourse.current = true;
      if (courses.length) setCourse(courses[0].title);
    }
  }, [coursesLoading, courses]);

  const rawCourseId = courses.find((c) => c.title === course)?.id;
  const courseId = isValidUUID(rawCourseId) ? rawCourseId : undefined;
  const { uploads, loading, refresh } = useUploads(courseId, course);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [tab, setTab] = useState<"videos" | "pdfs">("videos");
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Where a new upload gets attached: a lesson, or a live session recording ---
  const [attachTarget, setAttachTarget] = useState<AttachTarget>("lesson");

  // --- Module / Lesson targeting for this course ---
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [moduleId, setModuleId] = useState<string>("");
  const [lessonId, setLessonId] = useState<string>("");

  useEffect(() => {
    if (!courseId) {
      setModules([]);
      setModuleId("");
      setLessonId("");
      return;
    }
    let cancelled = false;
    (async () => {
      setModulesLoading(true);
      try {
        const mods = await resolvedModules(courseId);
        if (!cancelled) setModules(mods);
      } catch (err) {
        console.error("Failed to load modules:", err);
      } finally {
        if (!cancelled) setModulesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  useEffect(() => {
    setModuleId(modules[0]?.id ?? "");
  }, [modules]);

  const selectedModule = modules.find((m) => m.id === moduleId);
  useEffect(() => {
    setLessonId(selectedModule?.lessons?.[0]?.id ?? "");
  }, [selectedModule]);

  // --- Live session targeting for this course (used when uploading a recording) ---
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [liveSessionsLoading, setLiveSessionsLoading] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string>("");

  useEffect(() => {
    if (!courseId) {
      setLiveSessions([]);
      setLiveSessionId("");
      return;
    }
    let cancelled = false;
    (async () => {
      setLiveSessionsLoading(true);
      try {
        const all = await getLiveSessions();
        const filtered = all.filter((s) => s.course_id === courseId);
        if (!cancelled) setLiveSessions(filtered);
      } catch (err) {
        console.error("Failed to load live sessions:", err);
      } finally {
        if (!cancelled) setLiveSessionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  useEffect(() => {
    setLiveSessionId(liveSessions[0]?.id ?? "");
  }, [liveSessions]);

  const selectedLiveSession:any = liveSessions.find((s) => s.id === liveSessionId);

  // Reset the selected attach target back to "lesson" if the course changes
  // and has no live sessions, so the uploader doesn't stay stuck on an
  // empty "recording" mode.
  useEffect(() => {
    if (attachTarget === "recording" && courseId && !liveSessionsLoading && liveSessions.length === 0) {
      setAttachTarget("lesson");
    }
  }, [courseId, liveSessions, liveSessionsLoading, attachTarget]);

  // A course that genuinely has no modules/live sessions yet can't be
  // targeted, so we don't block uploads in that case — otherwise a
  // destination must be chosen before any file can be sent.
  const needsSelection =
    attachTarget === "lesson"
      ? !!courseId && modules.length > 0
      : !!courseId && liveSessions.length > 0;

  const hasSelection =
    attachTarget === "lesson" ? !!moduleId && !!lessonId : !!liveSessionId;

  const selectionMissing = needsSelection && !hasSelection;
  const uploadBlocked = isUploading || selectionMissing;

  // Recordings can only ever be video — this drives both the file picker's
  // `accept` filter and the client-side guard in handleFiles below, so a
  // mismatched file can't silently get linked to a live session.
  const acceptedFileTypes = attachTarget === "recording" ? "video/*" : "video/*,application/pdf";
  const acceptedFilesLabel = attachTarget === "recording"
    ? t("teacherUploads.destination.videoOnly")
    : t("teacherUploads.destination.videosOrPdfs");

  // --- Link-to-lesson dialog (for files already uploaded) ---
  const [linking, setLinking] = useState<{ id: string; title: string; url?: string } | null>(null);
  const [linkModuleId, setLinkModuleId] = useState("");
  const [linkLessonId, setLinkLessonId] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const linkModule = modules.find((m) => m.id === linkModuleId);

  function openLinkDialog(item: { id: string; title: string; url?: string }) {
    setLinking(item);
    setLinkModuleId(modules[0]?.id ?? "");
  }
  useEffect(() => {
    setLinkLessonId(linkModule?.lessons?.[0]?.id ?? "");
  }, [linkModule]);

  async function confirmLink() {
    if (!linking || !linkLessonId) return;
    try {
      setSavingLink(true);
      await updateStoredLesson(linkLessonId, { content_url: linking.url || "" });
      if (courseId) {
        const fresh = await resolvedModules(courseId);
        setModules(fresh);
      }
      toast.success(t("teacherUploads.toast.linked"));
      setLinking(null);
    } catch (err: any) {
      toast.error(err?.message || t("teacherUploads.toast.linkFailed"));
    } finally {
      setSavingLink(false);
    }
  }

  // --- File preview dialog ---
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

  function openPreview(item: PreviewTarget) {
    if (!item.url) {
      toast.error(t("teacherUploads.toast.noPreviewLink"));
      return;
    }
    setPreview(item);
  }

  // --- Delete confirmation dialog ---
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  function requestRemove(item: DeleteTarget) {
    setDeleteTarget(item);
  }

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

  const videos = uploads.filter((u) => u.kind === "video");
  const pdfs = uploads.filter((u) => u.kind === "pdf");
  const pendingVideos = pending.filter((p) => p.kind === "video");
  const pendingPdfs = pending.filter((p) => p.kind === "pdf");

  function pickFiles() {
    if (isUploading) return;
    if (selectionMissing) {
      toast.error(
        attachTarget === "lesson"
          ? t("teacherUploads.toast.selectLessonFirst")
          : t("teacherUploads.toast.selectSessionFirst")
      );
      return;
    }
    fileRef.current?.click();
  }

  async function handleFiles(files: File[]) {
    if (!files.length || uploadBlocked) return;

    // Guard against attaching the wrong file kind to a live session. A
    // recording must be a video — reject anything else up front instead of
    // letting it silently overwrite live_sessions.recording_url later.
    if (attachTarget === "recording") {
      const rejected = files.filter((f) => !isVideoFile(f));
      if (rejected.length) {
        toast.error(
          rejected.length === 1
            ? t("teacherUploads.toast.notVideoSingle", { name: rejected[0].name })
            : t("teacherUploads.toast.notVideoMultiple", { count: rejected.length })
        );
        files = files.filter((f) => isVideoFile(f));
        if (!files.length) return;
      }
    }

    setIsUploading(true);
    try {
      for (const f of files) {
        const kind: "video" | "pdf" = isVideoFile(f) ? "video" : "pdf";
        const pendingId = `pending-${Date.now()}-${f.name}`;
        setPending((prev) => [
          ...prev,
          { id: pendingId, title: f.name, size: humanSize(f.size), kind, progress: 0 },
        ]);
        try {
          const result: any = await addStoredUpload(f, {
            course_id: courseId,
            courseTitle: course,
            // Only send lessonId when we're actually attaching to a lesson.
            // Recordings don't have a lesson_id — they get linked to the
            // live session below instead.
            lesson_id: attachTarget === "lesson" ? (lessonId || undefined) : undefined,
            onProgress: (pct) => {
              setPending((prev) => prev.map((p) => (p.id === pendingId ? { ...p, progress: pct } : p)));
            },
          });

          toast.success(t("teacherUploads.toast.uploaded", { name: f.name }));

          const uploadedUrl = result?.url ?? result?.data?.url ?? result?.path ?? "";

          if (attachTarget === "recording" && liveSessionId) {
            // Mirror the uploaded file's URL onto live_sessions.recording_url
            // so the recording shows up on the Live sessions page.
            if (uploadedUrl) {
              try {
                await upsertLiveSession({ id: liveSessionId, recording_url: uploadedUrl });
                setLiveSessions((prev) =>
                  prev.map((s) => (s.id === liveSessionId ? { ...s, recording_url: uploadedUrl } : s))
                );
                toast.success(t("teacherUploads.toast.recordingLinked"));
              } catch (linkErr) {
                console.error("Failed to auto-link recording:", linkErr);
                toast.error(t("teacherUploads.toast.recordingLinkFailed"));
              }
            }
          } else if (attachTarget === "lesson" && lessonId) {
            // Guarded on attachTarget === "lesson" explicitly, not just on
            // lessonId being truthy. lessonId is set as soon as a module has
            // lessons, regardless of which attach mode is selected — without
            // this check, a stale lessonId from a previous "lesson" session
            // could silently attach a recording upload to a lesson instead
            // of (or in addition to) the live session.
            //
            // Best-effort: also mirror the URL onto lessons.content_url, which is
            // what the student-facing lesson player reads from. This stays even
            // though uploads.lesson_id is now set server-side, because the two
            // columns serve different consumers (uploads.lesson_id links the file
            // record to a lesson; lessons.content_url is what actually plays).
            if (uploadedUrl) {
              try {
                await updateStoredLesson(lessonId, { content_url: uploadedUrl });
                if (courseId) setModules(await resolvedModules(courseId));
                toast.success(t("teacherUploads.toast.lessonLinked"));
              } catch (linkErr) {
                console.error("Failed to auto-link lesson:", linkErr);
              }
            }
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("teacherUploads.toast.uploadFailed", { name: f.name }));
        } finally {
          setPending((prev) => prev.filter((p) => p.id !== pendingId));
        }
      }
    } finally {
      setIsUploading(false);
      refresh();
    }
  }

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (uploadBlocked) {
      if (selectionMissing) {
        toast.error(
          attachTarget === "lesson"
            ? t("teacherUploads.toast.selectLessonFirst")
            : t("teacherUploads.toast.selectSessionFirst")
        );
      }
      return;
    }
    handleFiles(Array.from(e.dataTransfer.files ?? []));
  }

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacherUploads.title")}
        description={t("teacherUploads.description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={course} onValueChange={setCourse} disabled={coursesLoading}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={coursesLoading ? t("teacherUploads.loadingCourses") : t("teacherUploads.coursePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>)}
                <SelectItem value={GENERAL_COURSE}>{t("teacherUploads.generalCourse")}</SelectItem>
              </SelectContent>
            </Select>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={acceptedFileTypes}
              onChange={onFiles}
              className="hidden"
              disabled={uploadBlocked}
            />
            <Button onClick={pickFiles} disabled={uploadBlocked}>
              {isUploading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : selectionMissing ? (
                <Lock className="mr-1.5 h-4 w-4" />
              ) : (
                <UploadCloud className="mr-1.5 h-4 w-4" />
              )}
              {isUploading ? t("teacherUploads.uploading") : t("teacherUploads.upload")}
            </Button>
          </div>
        }
      />

      {/* ---- Destination targeting: course is above, then choose lesson vs live-session recording ---- */}
      <Card
        className={`border-border/60 p-4 shadow-card transition-colors ${
          selectionMissing ? "border-amber-500/40 bg-amber-500/[0.04]" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("teacherUploads.destination.heading")}
          </p>
          <span className="text-xs text-muted-foreground">{acceptedFilesLabel}</span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          {/* Lesson vs recording toggle */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 p-1">
            <Button
              type="button"
              size="sm"
              variant={attachTarget === "lesson" ? "default" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setAttachTarget("lesson")}
              disabled={isUploading}
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> {t("teacherUploads.destination.lesson")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={attachTarget === "recording" ? "default" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setAttachTarget("recording")}
              disabled={isUploading}
            >
              <Radio className="mr-1.5 h-3.5 w-3.5" /> {t("teacherUploads.destination.recording")}
            </Button>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2">
            {attachTarget === "lesson" ? (
              <>
                <Select value={moduleId} onValueChange={setModuleId} disabled={!courseId || modulesLoading || !modules.length || isUploading}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={
                      !courseId ? t("teacherUploads.destination.selectCourse")
                        : modulesLoading ? t("teacherUploads.loading")
                        : t("teacherUploads.destination.module")
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={lessonId} onValueChange={setLessonId} disabled={!selectedModule || !selectedModule.lessons?.length || isUploading}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder={selectedModule ? t("teacherUploads.destination.lessonField") : t("teacherUploads.destination.selectModuleFirst")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedModule?.lessons || []).map((l) => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <Select
                value={liveSessionId}
                onValueChange={setLiveSessionId}
                disabled={!courseId || liveSessionsLoading || !liveSessions.length || isUploading}
              >
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder={
                    !courseId ? t("teacherUploads.destination.selectCourse")
                      : liveSessionsLoading ? t("teacherUploads.loading")
                      : t("teacherUploads.destination.liveSession")
                  } />
                </SelectTrigger>
                <SelectContent>
                  {liveSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title} — {s.startsAt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {attachTarget === "lesson" && courseId && lessonId && (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="mr-1 h-3 w-3" /> {t("teacherUploads.destination.willLinkLesson")}
            </Badge>
          )}
          {attachTarget === "recording" && courseId && liveSessionId && (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="mr-1 h-3 w-3" /> {t("teacherUploads.destination.willSaveRecording")}
            </Badge>
          )}
          {selectionMissing && (
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600">
              <Lock className="mr-1 h-3 w-3" />
              {attachTarget === "lesson" ? t("teacherUploads.destination.unlockLesson") : t("teacherUploads.destination.unlockSession")}
            </Badge>
          )}
        </div>

        {attachTarget === "lesson" && courseId && !modulesLoading && !modules.length && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("teacherUploads.destination.noModulesHint")}
          </p>
        )}
        {attachTarget === "recording" && courseId && !liveSessionsLoading && !liveSessions.length && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("teacherUploads.destination.noSessionsHint")}
          </p>
        )}
        {attachTarget === "recording" && selectedLiveSession?.recordingUrl && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileVideo className="h-3.5 w-3.5" />
            {t("teacherUploads.destination.willReplaceRecording")}
          </p>
        )}
      </Card>

      <Card
        className={`group relative overflow-hidden border-2 border-dashed p-10 text-center shadow-card transition-all ${
          uploadBlocked
            ? "cursor-not-allowed border-border/60 bg-muted/20"
            : "cursor-pointer border-border hover:border-primary/50 hover:bg-primary/[0.03]"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={pickFiles}
      >
        {isUploading ? (
          <div className="mx-auto max-w-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="mt-3 text-sm font-semibold">
              {t("teacherUploads.dropzone.uploadingCount", { count: pending.length })}
            </p>
            <div className="mt-4 space-y-3 text-left">
              {pending.map((p) => (
                <div key={p.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1.5 truncate">
                      {p.kind === "video" ? <FileVideo className="h-3.5 w-3.5 shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{p.title}</span>
                    </span>
                    <span className="shrink-0 font-medium text-foreground">{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-1.5" />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("teacherUploads.dropzone.waitHint")}
            </p>
          </div>
        ) : selectionMissing ? (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-500/10 text-amber-600">
              <Lock className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold">
              {attachTarget === "lesson" ? t("teacherUploads.dropzone.chooseLessonFirst") : t("teacherUploads.dropzone.chooseSessionFirst")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("teacherUploads.dropzone.lockedHint")}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary transition-transform group-hover:scale-105">
              {attachTarget === "recording" ? <FileVideo className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
            </div>
            <p className="mt-3 text-sm font-semibold">
              {attachTarget === "recording" ? t("teacherUploads.dropzone.dropRecording") : t("teacherUploads.dropzone.dropFiles")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {attachTarget === "recording" ? t("teacherUploads.dropzone.videoLimit") : t("teacherUploads.dropzone.mixedLimit")}
            </p>
          </>
        )}
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "videos" | "pdfs")}>
        <TabsList>
          <TabsTrigger value="videos">{t("teacherUploads.tabs.videos", { count: videos.length + pendingVideos.length })}</TabsTrigger>
          <TabsTrigger value="pdfs">{t("teacherUploads.tabs.pdfs", { count: pdfs.length + pendingPdfs.length })}</TabsTrigger>
        </TabsList>
        <TabsContent value="videos" className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("teacherUploads.loadingUploads")}
            </div>
          ) : videos.length === 0 && pendingVideos.length === 0 ? (
            <EmptyState title={t("teacherUploads.empty.videosTitle")} description={t("teacherUploads.empty.videosDescription")} />
          ) : (
            <div className="grid gap-3">
              {pendingVideos.map((v) => (
                <Card key={v.id} className="flex flex-wrap items-center gap-4 border-border/60 p-4 shadow-card">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
                    <FileVideo className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{course} · {v.size}</p>
                  </div>
                  <div className="w-40">
                    <Progress value={v.progress} className="h-1.5" />
                    <p className="mt-1 text-xs text-muted-foreground">{t("teacherUploads.uploadingPct", { pct: v.progress })}</p>
                  </div>
                </Card>
              ))}
              {videos.map((v: any) => (
                <Card
                  key={v.id}
                  className="flex cursor-pointer flex-wrap items-center gap-4 border-border/60 p-4 shadow-card transition-colors hover:border-primary/40 hover:bg-muted/30"
                  onClick={() => openPreview({ id: v.id, title: v.title, url: v.url, kind: "video" })}
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
                    <FileVideo className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{v.course} · {v.size} · {v.uploaded}</p>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                    {t("teacherUploads.ready")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("teacherUploads.actions.openVideo")}
                    onClick={(e) => { e.stopPropagation(); openPreview({ id: v.id, title: v.title, url: v.url, kind: "video" }); }}
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" title={t("teacherUploads.actions.linkToLesson")} onClick={(e) => { e.stopPropagation(); openLinkDialog(v); }}>
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("teacherUploads.actions.deleteVideo")}
                    onClick={(e) => { e.stopPropagation(); requestRemove({ id: v.id, title: v.title, kind: "video" }); }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground transition-colors hover:text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="pdfs" className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("teacherUploads.loadingUploads")}
            </div>
          ) : pdfs.length === 0 && pendingPdfs.length === 0 ? (
            <EmptyState title={t("teacherUploads.empty.pdfsTitle")} description={t("teacherUploads.empty.pdfsDescription")} />
          ) : (
            <div className="grid gap-3">
              {pendingPdfs.map((r) => (
                <Card key={r.id} className="flex flex-wrap items-center gap-4 border-border/60 p-4 shadow-card">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{course} · {r.size}</p>
                  </div>
                  <div className="w-40">
                    <Progress value={r.progress} className="h-1.5" />
                    <p className="mt-1 text-xs text-muted-foreground">{t("teacherUploads.uploadingPct", { pct: r.progress })}</p>
                  </div>
                </Card>
              ))}
              {pdfs.map((r: any) => (
                <Card
                  key={r.id}
                  className="flex cursor-pointer flex-wrap items-center gap-4 border-border/60 p-4 shadow-card transition-colors hover:border-primary/40 hover:bg-muted/30"
                  onClick={() => openPreview({ id: r.id, title: r.title, url: r.url, kind: "pdf" })}
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.course} · {r.size} · {r.uploaded}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("teacherUploads.actions.openPdf")}
                    onClick={(e) => { e.stopPropagation(); openPreview({ id: r.id, title: r.title, url: r.url, kind: "pdf" }); }}
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" title={t("teacherUploads.actions.linkToLesson")} onClick={(e) => { e.stopPropagation(); openLinkDialog(r); }}>
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("teacherUploads.actions.deletePdf")}
                    onClick={(e) => { e.stopPropagation(); requestRemove({ id: r.id, title: r.title, kind: "pdf" }); }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground transition-colors hover:text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ---- Link an already-uploaded file to a lesson ---- */}
      <Dialog open={!!linking} onOpenChange={(o) => !o && setLinking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacherUploads.linkDialog.title")}</DialogTitle>
            <DialogDescription className="truncate">{linking?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select value={linkModuleId} onValueChange={setLinkModuleId} disabled={!modules.length}>
                <SelectTrigger><SelectValue placeholder={t("teacherUploads.destination.module")} /></SelectTrigger>
                <SelectContent>
                  {modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={linkLessonId} onValueChange={setLinkLessonId} disabled={!linkModule?.lessons?.length}>
                <SelectTrigger><SelectValue placeholder={t("teacherUploads.destination.lessonField")} /></SelectTrigger>
                <SelectContent>
                  {(linkModule?.lessons || []).map((l) => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!modules.length && (
              <p className="text-xs text-muted-foreground">
                {t("teacherUploads.linkDialog.noModulesHint")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={confirmLink} disabled={savingLink || !linkLessonId}>
              {savingLink ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Link2 className="mr-1.5 h-4 w-4" />}
              {savingLink ? t("teacherUploads.linkDialog.linking") : t("teacherUploads.linkDialog.link")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete confirmation ---- */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center">{t("teacherUploads.deleteDialog.title")}</DialogTitle>
            <DialogDescription className="text-center">
              {t("teacherUploads.deleteDialog.body", {
                title: deleteTarget?.title,
                impact: deleteTarget?.kind === "video"
                  ? t("teacherUploads.deleteDialog.impactVideo")
                  : t("teacherUploads.deleteDialog.impactPdf"),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("teacherUploads.deleteDialog.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={deleting}>
              {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              {deleting ? t("teacherUploads.deleteDialog.deleting") : t("teacherUploads.deleteDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ---- Preview an uploaded video or PDF ---- */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className={preview?.kind === "video" ? "sm:max-w-3xl" : "sm:max-w-4xl"}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              {preview?.kind === "video" ? (
                <FileVideo className="h-4 w-4 text-blue-600" />
              ) : (
                <FileText className="h-4 w-4 text-violet-600" />
              )}
              <DialogTitle className="truncate">{preview?.title}</DialogTitle>
            </div>
          </DialogHeader>

          {preview?.kind === "video" ? (
            <video
              key={preview.url}
              src={preview.url}
              controls
              autoPlay
              className="aspect-video w-full rounded-lg bg-black"
            />
          ) : (
            <iframe
              key={preview?.url}
              src={preview?.url}
              title={preview?.title}
              className="h-[70vh] w-full rounded-lg border border-border/60"
            />
          )}

          <DialogFooter className="sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {preview?.kind === "video" ? t("teacherUploads.preview.video") : t("teacherUploads.preview.pdf")}
              {" — "}
              {t("teacherUploads.preview.exactView")}
            </p>
            <Button variant="outline" asChild>
              <a href={preview?.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" /> {t("teacherUploads.preview.openNewTab")}
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleDashboardLayout>
  );
}