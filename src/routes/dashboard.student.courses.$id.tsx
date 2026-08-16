import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileText,
  Loader2,
  ListChecks,
  Maximize2,
  Pause,
  Paperclip,
  PlayCircle,
  Settings,
  ShieldOff,
  Video as VideoIcon,
  Volume2,
  VolumeX,
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
import { CourseRatingCard } from "@/components/course/CourseRatingCard";
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

/**
 * Security note (frontend-only mitigation):
 * ------------------------------------------------------------
 * This function extracts ONLY the bare YouTube video ID. The raw
 * YouTube URL itself is never stored anywhere it could be rendered
 * as text, placed in an href/title/data-* attribute, or otherwise
 * surfaced in the DOM.
 *
 * This is NOT a complete protection: someone who opens DevTools'
 * Network tab can still see the underlying request. That part is
 * inherent to using YouTube as a video host and cannot be solved
 * from the frontend alone.
 * ------------------------------------------------------------
 */
function getYouTubeVideoId(value?: string): string | undefined {
  if (!value) return undefined;

  const input = value.trim();

  // Already a bare YouTube video ID.
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // Defensive fallback: some stored records may have a YouTube link
  // concatenated after another URL (e.g. a storage base URL). Look
  // for any recognizable YouTube pattern embedded anywhere in the
  // string before falling back to strict URL parsing.
  const embeddedMatch = input.match(
    /https?:\/\/(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (embeddedMatch) {
    return embeddedMatch[1];
  }

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : undefined;
    }

    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const id = url.searchParams.get("v");
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;

      const parts = url.pathname.split("/").filter(Boolean);
      const embedIndex = parts.indexOf("embed");
      const shortsIndex = parts.indexOf("shorts");
      const candidate =
        embedIndex >= 0 ? parts[embedIndex + 1] :
        shortsIndex >= 0 ? parts[shortsIndex + 1] :
        undefined;

      return candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)
        ? candidate
        : undefined;
    }
  } catch {
    // Ignore invalid URLs. The existing UI will simply show the fallback state.
  }

  return undefined;
}

/* ============ YouTube IFrame Player API loader (singleton) ============ */
// Loaded once and reused across every lesson/video mount. We talk to the
// player exclusively through this API (postMessage under the hood) instead
// of letting the student interact with YouTube's own iframe UI directly.
let youTubeApiPromise: Promise<void> | null = null;
function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise((resolve) => {
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return youTubeApiPromise;
}

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const QUALITY_LABELS: Record<string, string> = {
  auto: "Auto",
  highres: "4K+",
  hd2160: "2160p",
  hd1440: "1440p",
  hd1080: "1080p",
  hd720: "720p",
  large: "480p",
  medium: "360p",
  small: "240p",
  tiny: "144p",
};
function qualityLabel(level: string): string {
  return QUALITY_LABELS[level] ?? level;
}

/**
 * Fully custom video player.
 * ------------------------------------------------------------
 * YouTube's own UI is completely hidden (`controls: 0`), so the
 * student never sees YouTube's title/channel link, YouTube logo,
 * or default control bar. Instead, an entirely custom, in-house
 * control layer (its own DOM, not the YouTube iframe) handles
 * play/pause, seeking, mute and fullscreen via the IFrame Player
 * API. Because that overlay lives in our own document (not inside
 * YouTube's cross-origin iframe), we CAN reliably block the
 * right-click "Copy video URL" context menu — something that was
 * previously impossible once a click reached YouTube's own iframe.
 *
 * Still not solvable from the frontend: someone using the browser's
 * DevTools Network tab, or reading this component's compiled source,
 * can find the underlying request. No client-side technique can
 * prevent that.
 * ------------------------------------------------------------
 */
function YouTubePlayer({
  video,
  title,
  poster,
}: {
  video: Upload;
  title: string;
  poster?: string;
}) {
  const source = uploadUrl(video);
  const videoId = getYouTubeVideoId(source);

  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const guardTimerRef:any = useRef<ReturnType<typeof setTimeout>>();

  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [availableRates, setAvailableRates] = useState<number[]>([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  const [quality, setQualityState] = useState<string>("auto");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Opaque cover shown whenever YouTube would otherwise render its own
  // chrome (title/channel name + "copy link" icon on pause, suggested-
  // videos grid on end). Both appear regardless of controls=0 / rel=0 —
  // they are not controls, they're YouTube's pause/end-screen overlays.
  // The only reliable fix is to visually hide the player behind our own
  // opaque layer whenever it is not actively, cleanly playing.
  const [coverVisible, setCoverVisible] = useState(true);

  useEffect(() => {
    setReady(false);
    setStarted(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCoverVisible(true);

    if (!videoId) return;
    let cancelled = false;
    let progressTimer: ReturnType<typeof setInterval> | undefined;

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !mountRef.current) return;
      const YT = (window as any).YT;

      playerRef.current = new YT.Player(mountRef.current, {
        videoId,
        // Belt-and-suspenders: also ask for a 100% box up front. The real
        // fix is below in onReady, because the API replaces our styled
        // mount div with its own <iframe> that otherwise defaults to a
        // fixed 640x390 pixel box — which is why the video used to render
        // small, pinned to the top-left corner, especially in fullscreen.
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,        // hide YouTube's own control bar entirely
          modestbranding: 1,
          rel: 0,              // no related videos from other channels
          iv_load_policy: 3,   // hide annotations/cards
          disablekb: 1,        // our overlay handles interaction, not the iframe
          fs: 0,                // fullscreen handled by our own button
          cc_load_policy: 0,   // no captions/subtitles shown by default
          playsinline: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: (e: any) => {
            if (cancelled) return;
            // The API's own <iframe> ignores our Tailwind classes, so we
            // pin it to fill its (positioned) parent directly via inline
            // styles. This is what actually makes fullscreen work correctly.
            const iframeEl: HTMLIFrameElement | undefined = e.target?.getIframe?.();
            if (iframeEl) {
              iframeEl.style.position = "absolute";
              iframeEl.style.inset = "0";
              iframeEl.style.width = "100%";
              iframeEl.style.height = "100%";
              iframeEl.style.border = "0";
            }
            setReady(true);
            setDuration(e.target.getDuration?.() ?? 0);

            // Playback speed options this specific video actually supports.
            const rates = e.target.getAvailablePlaybackRates?.();
            if (Array.isArray(rates) && rates.length) setAvailableRates(rates);

            // Best-effort: YouTube's adaptive streaming means manual quality
            // selection isn't honored for every video, but we still expose
            // it when the API reports levels for this one.
            const qualities = e.target.getAvailableQualityLevels?.();
            if (Array.isArray(qualities) && qualities.length) setAvailableQualities(qualities);

            // Defensive: make sure no caption track got auto-enabled.
            try {
              e.target.unloadModule?.("captions");
            } catch {
              /* ignore */
            }
          },
          onStateChange: (e: any) => {
            if (cancelled) return;
            const State = (window as any).YT.PlayerState;
            if (e.data === State.PLAYING) {
              setPlaying(true);
              setStarted(true);
              // YouTube briefly shows its own title/channel overlay for a
              // moment right after playback starts (and after every seek).
              // Keep our cover up through that window, then fade it out.
              setCoverVisible(true);
              clearTimeout(guardTimerRef.current);
              guardTimerRef.current = setTimeout(() => setCoverVisible(false), 1200);
              if (!progressTimer) {
                progressTimer = setInterval(() => {
                  const p = playerRef.current;
                  if (p?.getCurrentTime) {
                    setCurrentTime(p.getCurrentTime());
                    setDuration(p.getDuration?.() ?? 0);
                  }
                }, 400);
              }
            } else if (e.data === State.PAUSED || e.data === State.ENDED) {
              setPlaying(false);
              // Re-cover immediately: this is exactly when YouTube shows the
              // title/channel/"copy link" overlay (on pause) or the
              // suggested-videos end screen (on end) — neither is affected
              // by controls=0 or rel=0.
              clearTimeout(guardTimerRef.current);
              setCoverVisible(true);
              if (progressTimer) {
                clearInterval(progressTimer);
                progressTimer = undefined;
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (progressTimer) clearInterval(progressTimer);
      clearTimeout(guardTimerRef.current);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <p className="px-6 text-center text-sm text-white/70">
          Unable to load this video.
        </p>
      </div>
    );
  }

  const handleStart = () => {
    setStarted(true);
    playerRef.current?.playVideo?.();
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };

  const changeSpeed = (rate: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.setPlaybackRate(rate);
    setPlaybackRateState(p.getPlaybackRate?.() ?? rate);
  };

  const changeQuality = (level: string) => {
    const p = playerRef.current;
    if (!p) return;
    p.setPlaybackQuality(level);
    setQualityState(level);
  };

  const seekToRatio = (ratio: number) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    p.seekTo(duration * Math.min(1, Math.max(0, ratio)), true);
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none bg-black"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* YouTube's IFrame API renders its (UI-less, controls=0) player here.
          It is never interacted with directly by the student. */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Our own transparent, same-origin click-catcher. Sits above the
          YouTube iframe at all times, so any click/right-click lands here
          first rather than on YouTube's own UI. */}
      <div
        className="absolute inset-0 z-10"
        onContextMenu={(e) => e.preventDefault()}
        onClick={started && !coverVisible ? togglePlay : undefined}
      >
        {started && !ready && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/80" />
          </div>
        )}
      </div>

      {/* Opaque cover — shown whenever the player is not cleanly, actively
          playing (before first play, while paused, right after a seek, and
          when the video ends). This is what actually hides YouTube's own
          title/channel-name overlay, its "copy video link" icon, and its
          end-of-video suggested-videos screen: none of those are affected
          by the controls=0 / rel=0 embed parameters, so blocking clicks
          alone isn't enough — the pixels themselves have to be covered. */}
      {coverVisible && (
        <button
          type="button"
          onClick={started ? togglePlay : handleStart}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 z-20 flex h-full w-full items-center justify-center bg-cover bg-center"
          style={poster ? { backgroundImage: `url(${poster})` } : undefined}
          aria-label={title}
        >
          <div className="absolute inset-0 bg-black/40" />
          {(!started || (!playing && ready)) && (
            <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/95 text-primary shadow-elegant">
              <PlayCircle className="h-8 w-8" />
            </div>
          )}
        </button>
      )}

      {/* Fully custom control bar — replaces YouTube's native controls.
          Kept above the cover (z-30) so it stays visible and usable even
          while paused, matching normal player expectations. */}
      {started && ready && (
        <div
          className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 py-3"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            onClick={togglePlay}
            className="text-white/90 transition-colors hover:text-white"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
          </button>

          <div
            className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/25"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekToRatio((e.clientX - rect.left) / rect.width);
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <span className="text-xs tabular-nums text-white/80">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            type="button"
            onClick={toggleMute}
            className="text-white/90 transition-colors hover:text-white"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {/* Our own speed/quality menu — replaces YouTube's gear icon,
              which is gone now that controls=0 hides YouTube's native UI. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="text-white/90 transition-colors hover:text-white"
              aria-label="Playback settings"
            >
              <Settings className="h-5 w-5" />
            </button>

            {settingsOpen && (
              <>
                {/* Backdrop: closes the menu on outside click. */}
                <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                <div
                  className="absolute bottom-full right-0 z-50 mb-2 w-44 rounded-lg border border-white/10 bg-black/90 p-2 text-xs shadow-elegant"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="px-2 pb-1 pt-1 font-semibold text-white/60">Speed</p>
                  <div className="grid grid-cols-4 gap-1 pb-2">
                    {availableRates.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => changeSpeed(rate)}
                        className={cn(
                          "rounded-md px-1.5 py-1 text-center transition-colors",
                          playbackRate === rate
                            ? "bg-primary text-primary-foreground"
                            : "text-white/80 hover:bg-white/10",
                        )}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  {availableQualities.length > 0 && (
                    <>
                      <p className="border-t border-white/10 px-2 pb-1 pt-2 font-semibold text-white/60">
                        Quality
                      </p>
                      <div className="max-h-40 space-y-0.5 overflow-y-auto">
                        {availableQualities.map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => changeQuality(level)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition-colors",
                              quality === level ? "text-primary" : "text-white/80 hover:bg-white/10",
                            )}
                          >
                            {qualityLabel(level)}
                            {quality === level && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="text-white/90 transition-colors hover:text-white"
            aria-label="Fullscreen"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
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
  const [currentId, setCurrentId]:any = useState<string | undefined>(allLessons[0]?.id);
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
  }, [course.id]);

  const current:any = allLessons.find((l) => l.id === currentId);
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
                <YouTubePlayer
                  key={activeVideo?.id ?? current.id}
                  video={activeVideo!}
                  title={current.title}
                  poster={course.image_cover || undefined}
                />
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
          <CourseRatingCard courseId={course.id} />
          {resourcesLoaded && lessonUploads.length > 0 && (
            <Card className="border-border/60 p-5 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">
                  {t("coursePlayer.attachmentsForLesson", { count: lessonUploads.length })}
                </p>
              </div>
              <div className="space-y-2">
                {lessonVideos.map((r:any) => (
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
                    {m.lessons.map((l:any) => {
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