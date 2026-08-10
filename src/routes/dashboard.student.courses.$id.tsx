import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileText,
  Loader2,
  ListChecks,
  Paperclip,
  PlayCircle,
  ShieldOff,
  Video as VideoIcon,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getTeacherCourseById,
  resolvedModules,
  getProgress,
  setLessonComplete,
  courseProgress,
  touchCourse,
  getStoredUploads,
  getQuizzesByCourse,
  type Module,
  type Quiz,
  type Upload,
} from "@/lib/lms-storage";

export const Route = createFileRoute("/dashboard/student/courses/$id")({
  head: () => ({
    meta: [{ title: "Course player — Lumen" }, { name: "robots", content: "noindex" }],
  }),
  loader: async ({ params }) => {
    const raw: any = await getTeacherCourseById(params.id);
    // The API sometimes wraps the course as { course: {...} }.
    // This line handles both shapes without breaking anything.
    const course = raw?.course ?? raw;
    if (!course?.id) throw notFound();
    const modules = await resolvedModules(params.id);
    return { course, modules };
  },
  component: CoursePlayer,
  notFoundComponent: CourseNotFound,
});

function CourseNotFound() {
  const { t } = useTranslation();
  return (
    <RoleDashboardLayout role="student">
      <Card className="p-10 text-center border-border/60 shadow-card">
        <p className="text-lg font-semibold">{t("coursePlayer.notFound.title")}</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard/student/courses">{t("coursePlayer.notFound.backToCourses")}</Link>
        </Button>
      </Card>
    </RoleDashboardLayout>
  );
}

function uploadLessonId(u: Upload): string | undefined {
  return (u as any).lesson_id ?? (u as any).lessonId ?? undefined;
}

function uploadUrl(u: Upload): string | undefined {
  return (u as any).url ?? (u as any).content_url ?? undefined;
}

function CoursePlayer() {
  const { t } = useTranslation();
  const { course, modules } = Route.useLoaderData() as { course: any; modules: Module[] };
  const navigate = useNavigate();

  const allLessons = useMemo(() => modules.flatMap((m) => m.lessons), [modules]);
  const total = allLessons.length;

  // --- Progress state (async) ---
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [currentId, setCurrentId] = useState<string | undefined>(allLessons[0]?.id);
  const [selectedVideoId, setSelectedVideoId] = useState<string | undefined>(undefined);

  // Tracks which lesson is currently being saved, to show inline "Saving…" state
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);

  // Course progress summary (done/total/pct), sourced directly from the backend
  const [p, setP] = useState<{ done: number; total: number; pct: number }>({
    done: 0,
    total,
    pct: 0,
  });

  // Single helper to reload both the progress map and the numeric summary from the backend
  const refreshProgress = useCallback(async () => {
    const [all, summary] = await Promise.all([getProgress(), courseProgress(course.id, total)]);
    setProgressMap(all[course.id] ?? {});
    setP(summary);
  }, [course.id, total]);

  // Initial load: fetch progress and jump to the first unfinished lesson
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getProgress();
      if (cancelled) return;
      const courseMap = all[course.id] ?? {};
      setProgressMap(courseMap);

      const firstUnfinished = allLessons.find((l) => !courseMap[l.id]);
      setCurrentId(firstUnfinished?.id ?? allLessons[0]?.id);

      const summary = await courseProgress(course.id, total);
      if (!cancelled) setP(summary);

      setProgressLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  const current = allLessons.find((l) => l.id === currentId);
  const idx = current ? allLessons.findIndex((l) => l.id === current.id) : -1;
  const module = modules.find((m) => current && m.lessons.some((l) => l.id === current.id));

  useEffect(() => {
    touchCourse(course.id);
  }, [course.id]);

  const [allResources, setAllResources] = useState<Upload[]>([]);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uploads = await getStoredUploads({ courseId: course.id, courseTitle: course.title });
      if (!cancelled) {
        setAllResources(uploads);
        setResourcesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [course.id, course.title]);

  const lessonUploads = useMemo(
    () => (current ? allResources.filter((u) => uploadLessonId(u) === current.id) : []),
    [allResources, current?.id],
  );
  const lessonPdfs = useMemo(() => lessonUploads.filter((u) => u.kind === "pdf"), [lessonUploads]);
  const lessonVideos = useMemo(() => lessonUploads.filter((u) => u.kind === "video"), [lessonUploads]);

  const activeVideo = useMemo(() => {
    if (selectedVideoId) {
      const found = lessonVideos.find((v) => v.id === selectedVideoId);
      if (found) return found;
    }
    return lessonVideos[0];
  }, [lessonVideos, selectedVideoId]);

  const uploadsByLesson = useMemo(() => {
    const map: Record<string, Upload[]> = {};
    for (const r of allResources) {
      const lid = uploadLessonId(r);
      if (!lid) continue;
      (map[lid] ??= []).push(r);
    }
    return map;
  }, [allResources]);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const qs = await getQuizzesByCourse(course.id);
      if (!cancelled) setQuizzes(qs);
    })();
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  // Toggles lesson completion; awaits the backend before refreshing the summary
  const toggle = async (lessonId: string, done: boolean) => {
    setSavingLessonId(lessonId);
    // Optimistic update so the UI reacts immediately
    setProgressMap((prev) => ({ ...prev, [lessonId]: done }));
    try {
      await setLessonComplete(course.id, lessonId, done);
    } finally {
      await refreshProgress();
      setSavingLessonId(null);
    }
  };

  const goPrev = () => {
    if (idx <= 0) return;
    setCurrentId(allLessons[idx - 1].id);
  };

  // Marks the current lesson complete (awaited) before moving to the next one,
  // guaranteeing the backend is updated before the UI advances.
  const goNext = async () => {
    if (!current) return;
    await toggle(current.id, true);
    const next = allLessons[Math.min(idx + 1, allLessons.length - 1)];
    setCurrentId(next.id);
  };

  const playVideo = (lessonId: string, uploadId: string) => {
    setCurrentId(lessonId);
    setSelectedVideoId(uploadId);
  };

  if (!progressLoaded) {
    return (
      <RoleDashboardLayout role="student">
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("coursePlayer.loadingCourse")}
        </div>
      </RoleDashboardLayout>
    );
  }

  if (!current) {
    return (
      <RoleDashboardLayout role="student">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2">
            <Link to="/dashboard/student/courses">
              <ChevronLeft className="mr-1 h-4 w-4" /> {t("coursePlayer.myCourses")}
            </Link>
          </Button>
          <span>/</span>
          <span className="truncate">{course.title}</span>
        </div>
        <Card className="mt-4 border-border/60 p-10 text-center shadow-card">
          <p className="text-lg font-semibold">{t("coursePlayer.noLessons.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("coursePlayer.noLessons.subtitle")}</p>
        </Card>
      </RoleDashboardLayout>
    );
  }

  const currentQuiz = quizzes[0];
  const isVideo = current.kind === "video" && !!activeVideo;
  const isSavingCurrent = savingLessonId === current.id;
  const isLastLesson = idx === allLessons.length - 1;

  return (
    <RoleDashboardLayout role="student">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/dashboard/student/courses">
            <ChevronLeft className="mr-1 h-4 w-4" /> {t("coursePlayer.myCourses")}
          </Link>
        </Button>
        <span>/</span>
        <span className="truncate">{course.title}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden border-border/60 p-0 shadow-elegant">
            <div className="flex items-start justify-between gap-4 p-6 pb-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-primary/80">
                  {module?.title}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">{current.title}</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("coursePlayer.lessonOf", { current: idx + 1, total })}
                  {isVideo && (
                    <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground/80">
                      <ShieldOff className="h-3 w-3" /> {t("coursePlayer.downloadDisabled")}
                    </span>
                  )}
                </p>
              </div>
              {progressMap[current.id] && (
                <Badge className="bg-success/10 text-success border-success/20">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> {t("coursePlayer.completed")}
                </Badge>
              )}
            </div>

            <div
              className="relative aspect-video bg-black select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              {isVideo ? (
                <video
                  key={activeVideo?.id ?? current.id}
                  controls
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  playsInline
                  className="h-full w-full object-contain"
                  poster={course.image_cover || undefined}
                  src={uploadUrl(activeVideo!)}
                >
                  {t("coursePlayer.videoUnsupported")}
                </video>
              ) : (
                <div
                  className="flex h-full items-center justify-center bg-cover bg-center"
                  style={course.image_cover ? { backgroundImage: `url(${course.image_cover})` } : undefined}
                >
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/95 text-primary shadow-elegant">
                      {current.kind === "quiz" ? (
                        <ListChecks className="h-7 w-7" />
                      ) : (
                        <FileText className="h-7 w-7" />
                      )}
                    </div>
                    <p className="mt-3 text-sm font-medium text-white/90">
                      {t("coursePlayer.lessonOf", { current: idx + 1, total })}
                    </p>
                    {current.kind !== "quiz" && current.content_url && (
                      <Button asChild variant="secondary" size="sm" className="mt-4">
                        <a href={current.content_url} target="_blank" rel="noreferrer">
                          {t("coursePlayer.openReadingMaterial")}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={goPrev} disabled={idx === 0 || isSavingCurrent}>
                  {t("coursePlayer.previous")}
                </Button>
                <Button onClick={goNext} disabled={isSavingCurrent}>
                  {isSavingCurrent ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("coursePlayer.saving")}
                    </span>
                  ) : isLastLesson ? (
                    t("coursePlayer.markComplete")
                  ) : (
                    t("coursePlayer.markCompleteAndContinue")
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggle(current.id, !progressMap[current.id])}
                  disabled={isSavingCurrent}
                >
                  {isSavingCurrent ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("coursePlayer.saving")}
                    </span>
                  ) : progressMap[current.id] ? (
                    t("coursePlayer.markAsNotDone")
                  ) : (
                    t("coursePlayer.markComplete")
                  )}
                </Button>
                {current.kind === "quiz" &&
                  (currentQuiz ? (
                    <Button asChild variant="secondary">
                      <Link to="/dashboard/student/quizzes/$id" params={{ id: currentQuiz.id }}>
                        {t("coursePlayer.takeQuiz")}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled>
                      {t("coursePlayer.quizNotAvailable")}
                    </Button>
                  ))}
              </div>
            </div>
          </Card>

          {resourcesLoaded && lessonUploads.length > 0 && (
            <Card className="border-border/60 p-5 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">
                  {t("coursePlayer.attachmentsForLesson", { count: lessonUploads.length })}
                </p>
              </div>
              <div className="space-y-2">
                {lessonVideos.map((r) => (
                  <ResourceRow
                    key={r.id}
                    resource={r}
                    active={r.id === activeVideo?.id}
                    onPlay={() => setSelectedVideoId(r.id)}
                  />
                ))}
                {lessonPdfs.map((r) => (
                  <ResourceRow key={r.id} resource={r} />
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="border-border/60 p-4 shadow-card">
            <div className="flex items-center justify-between px-2 pb-3">
              <div>
                <p className="text-sm font-semibold">{t("coursePlayer.courseContent")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("coursePlayer.lessonsCompleted", { done: p.done, total })}
                </p>
              </div>
              <Badge variant="outline">{p.pct}%</Badge>
            </div>
            <Progress value={p.pct} className="mx-2 mb-3 h-1.5" />
            <div className="max-h-[640px] overflow-y-auto pr-1">
              {modules.map((m) => (
                <div key={m.id} className="mb-4">
                  <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.title}
                  </p>
                  <ul className="space-y-2.5">
                    {m.lessons.map((l) => {
                      const done = !!progressMap[l.id];
                      const active = l.id === current.id;
                      const lessonFiles = uploadsByLesson[l.id] ?? [];
                      const lessonFileVideos = lessonFiles.filter((u) => u.kind === "video");
                      const lessonFilePdfs = lessonFiles.filter((u) => u.kind === "pdf");

                      return (
                        <li
                          key={l.id}
                          className={cn(
                            "rounded-xl border p-3 transition-all",
                            active
                              ? "border-primary bg-primary-soft/20 shadow-sm"
                              : "border-border/50 hover:bg-muted/30",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setCurrentId(l.id)}
                            className="flex w-full items-start justify-between gap-2 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "text-xs font-semibold",
                                  active ? "text-primary" : "text-foreground",
                                )}
                              >
                                {l.title}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className="capitalize flex items-center gap-1">
                                  {l.kind === "quiz" ? (
                                    <ListChecks className="h-3 w-3" />
                                  ) : l.kind === "video" ? (
                                    <VideoIcon className="h-3 w-3" />
                                  ) : (
                                    <BookOpen className="h-3 w-3" />
                                  )}
                                  {t(`coursePlayer.lessonKind.${l.kind}`)}
                                </span>
                                {l.duration && <span>• {l.duration}</span>}
                              </div>
                            </div>
                            {done && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                          </button>

                          {lessonFileVideos.length > 0 && (
                            <div className="mt-2.5 space-y-1.5">
                              {lessonFileVideos.map((f) => {
                                const isVideoActive = active && activeVideo?.id === f.id;
                                return (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => playVideo(l.id, f.id)}
                                    className={cn(
                                      "flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors",
                                      isVideoActive
                                        ? "bg-primary/10 text-primary"
                                        : "hover:bg-muted/60 text-muted-foreground",
                                    )}
                                  >
                                    <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-muted border border-border/40 shadow-sm">
                                      <div
                                        className="h-full w-full bg-cover bg-center"
                                        style={
                                          course.image_cover
                                            ? { backgroundImage: `url(${course.image_cover})` }
                                            : undefined
                                        }
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40">
                                        <PlayCircle className="h-4 w-4 text-white drop-shadow" />
                                      </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-medium text-foreground">{f.title}</p>
                                      <span className="text-[10px] text-muted-foreground">
                                        {isVideoActive ? t("coursePlayer.playing") : t("coursePlayer.video")}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {lessonFilePdfs.length > 0 && (
                            <div className="mt-3 space-y-2 pt-2.5 border-t border-border/40">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                {t("coursePlayer.lessonDocuments")}
                              </p>
                              {lessonFilePdfs.map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => window.open(uploadUrl(f), "_blank", "noopener,noreferrer")}
                                  className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border/70 bg-card p-2.5 text-left transition-all hover:border-primary hover:shadow-sm"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-red-500/10 text-red-600 border border-red-500/20">
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                                        {f.title}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {t("coursePlayer.pdfDocument")} {f.size ? `• ${f.size}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Download className="h-3.5 w-3.5" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-2 px-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate({ to: "/dashboard/student/progress" })}
              >
                {t("coursePlayer.progress")}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </RoleDashboardLayout>
  );
}

function ResourceRow({
  resource,
  active,
  onPlay,
}: {
  resource: Upload;
  active?: boolean;
  onPlay?: () => void;
}) {
  const { t } = useTranslation();
  const isVideoResource = resource.kind === "video";
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        active ? "border-primary bg-primary-soft" : "border-border/60",
      )}
    >
      {isVideoResource ? (
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10">
          <VideoIcon className="h-5 w-5" />
        </div>
      ) : (
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10">
          <FileText className="h-5 w-5" />
          <span className="absolute -bottom-1 rounded bg-red-600 px-1 text-[9px] font-bold leading-tight text-white">
            {t("coursePlayer.pdfBadge")}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{resource.title}</p>
        <p className="text-xs text-muted-foreground">
          {isVideoResource ? t("coursePlayer.video") : t("coursePlayer.pdf")}
          {resource.size ? ` · ${resource.size}` : ""}
          {resource.uploaded ? ` · ${resource.uploaded}` : ""}
        </p>
      </div>
      {isVideoResource ? (
        <Button variant={active ? "default" : "outline"} size="sm" onClick={onPlay}>
          <PlayCircle className="mr-1.5 h-4 w-4" /> {active ? t("coursePlayer.playing") : t("coursePlayer.play")}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(uploadUrl(resource), "_blank", "noopener,noreferrer")}
        >
          <Download className="mr-1.5 h-4 w-4" /> {t("coursePlayer.get")}
        </Button>
      )}
    </div>
  );
}