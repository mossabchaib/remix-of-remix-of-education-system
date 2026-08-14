import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Users,
  Clock,
  BookOpen,
  Calendar,
  GraduationCap,
  FileVideo,
  FileText,
  HardDrive,
  Radio,
  PlayCircle,
  FileQuestion,
  ExternalLink,
  Globe,
  Lock,
  Video,
  FileDown,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  getTeacherCourseById,
  resolvedModules,
  getStoredUploads,
  getLiveSessionsByCourse,
} from "@/lib/lms-storage";

export const Route = createFileRoute("/admin/courses/$id")({
  loader: async ({ params }) => {
    const course = await getTeacherCourseById(params.id);
    if (!course) throw notFound();

    const [modules, uploads, liveSessions] = await Promise.all([
      resolvedModules(params.id),
      getStoredUploads({ courseId: params.id, courseTitle: course.title }),
      getLiveSessionsByCourse(params.id),
    ]);

    const lessonsCount = modules.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0);

    return { course, modules, uploads, liveSessions, lessonsCount };
  },
  notFoundComponent: () => <CourseNotFound />,
  component: CourseAdminDetail,
});

// ---------- helpers ----------

/** Parses strings like "10 min", "1h 20min" into total minutes. Returns null if unparseable. */
function toMinutes(duration:any) {
  if (!duration || typeof duration !== "string") return null;
  const h = duration.match(/(\d+)\s*h/i);
  const m = duration.match(/(\d+)\s*m/i);
  if (!h && !m) return null;
  return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}

function formatMinutes(total:any) {
  if (!total || total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

const LEVELS = ["beginner", "intermediate", "advanced"];

/**
 * Static per-key t() calls so i18next-parser can extract every key at build time.
 * A dynamic key like `t(`courseDetail.level.${x}`)` is invisible to that scanner
 * and to translators, so we resolve it through this explicit lookup instead.
 *
 * Each t() call is cast to `string` because TFunction's return type is a union
 * (string | object | TFunctionDetailedResult) to support `returnObjects: true`
 * elsewhere in the app; these specific keys are known plain strings.
 */
function useLevelLabel() {
  const { t } = useTranslation();
  const labels: Record<"beginner" | "intermediate" | "advanced", string> = {
    beginner: t("courseDetail.level.beginner") as string,
    intermediate: t("courseDetail.level.intermediate") as string,
    advanced: t("courseDetail.level.advanced") as string,
  };
  return (level?: string): string => labels[level?.toLowerCase() as keyof typeof labels] ?? level ?? "";
}

// ---------- not found state ----------

function CourseNotFound() {
  const { t } = useTranslation();
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">{t("courseDetail.notFound.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("courseDetail.notFound.description")}</p>
      <Button asChild className="mt-4">
        <Link to="/admin/courses">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> {t("courseDetail.backToCourses")}
        </Link>
      </Button>
    </div>
  );
}

function CourseAdminDetail() {
  const { t, i18n } = useTranslation();
  const getLevelLabel = useLevelLabel();
  const { course: courseData, modules, uploads, liveSessions, lessonsCount } = Route.useLoaderData();

  // The loader response is nested one level deep: { course: { course: {...} } },
  // with category and teacher data nested further under `categories` / `profiles`.
  // We unwrap it here purely for rendering purposes.
  const course = courseData?.course ?? {};

  const teacherName = course.profiles?.full_name || course.profiles?.email || t("courseDetail.unassigned");
  const categoryName = course.categories?.name;
  const levelIndex = LEVELS.indexOf((course.level || "").toLowerCase());

  const totalMinutes = modules.reduce(
    (sum, m) => sum + (m.lessons ?? []).reduce((s, l) => s + (toMinutes(l.duration) ?? 0), 0),
    0
  );
  const totalDurationLabel = formatMinutes(totalMinutes);

  const videoLessonCount = modules.reduce(
    (sum, m) => sum + (m.lessons ?? []).filter((l) => l.kind === "video").length,
    0
  );
  const resourceCount = uploads.filter((u) => u.kind !== "video").length;

  const locale = i18n.language || undefined;

  return (
    <div className="-m-6">
      {/* ---------- Header / syllabus title block ---------- */}
      <div className="border-b border-teal-900/10 bg-gradient-to-b from-teal-50/70 to-transparent">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-6">
          <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
            <Link to="/admin/courses">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> {t("courseDetail.backToCourses")}
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {categoryName && (
              <Badge className="border-0 bg-teal-600 text-white hover:bg-teal-600">{categoryName}</Badge>
            )}
            <StatusPill value={course.status || "draft"} />
          </div>

          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-tight tracking-tight text-zinc-900 sm:text-[2.75rem]">
            {course.title || t("courseDetail.untitledCourse")}
          </h1>
          {course.subtitle && (
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{course.subtitle}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-600/10 text-teal-700">
                <GraduationCap className="h-3.5 w-3.5" />
              </span>
              {t("courseDetail.courseBy")} <span className="font-medium text-zinc-800">{teacherName}</span>
            </div>

            {course.language && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Globe className="h-3.5 w-3.5" /> {course.language}
              </span>
            )}
            {course.updated_at && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {t("courseDetail.updated", {
                  date: new Date(course.updated_at).toLocaleDateString(locale, { month: "long", year: "numeric" }),
                })}
              </span>
            )}

            {/* Level meter — a genuine reading of course.level, not decoration */}
            {levelIndex >= 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  {LEVELS.map((lvl, i) => (
                    <span
                      key={lvl}
                      className={`h-1.5 w-5 rounded-full ${i <= levelIndex ? "bg-teal-600" : "bg-teal-900/10"}`}
                    />
                  ))}
                </span>
                <span>{getLevelLabel(course.level)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Stat strip ---------- */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border sm:grid-cols-4">
          {[
            {
              icon: Users,
              label: t("courseDetail.stats.students"),
              value: (course.students_count ?? course.students ?? 0).toLocaleString(locale),
            },
            { icon: BookOpen, label: t("courseDetail.stats.lessons"), value: lessonsCount || "—" },
            { icon: Clock, label: t("courseDetail.stats.duration"), value: totalDurationLabel || "—" },
            { icon: Radio, label: t("courseDetail.stats.liveSessions"), value: liveSessions.length || "—" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 px-6 py-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-600/10 text-teal-700">
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-base font-semibold text-zinc-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Body ---------- */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          {/* ===== Left: tabs ===== */}
          <div className="min-w-0">
            <Tabs defaultValue="curriculum" className="w-full">
              <TabsList>
                <TabsTrigger value="curriculum">
                  {t("courseDetail.tabs.curriculum")}
                  {lessonsCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {lessonsCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="uploads">
                  {t("courseDetail.tabs.uploads")}
                  {uploads.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {uploads.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="live">
                  {t("courseDetail.tabs.live")}
                  {liveSessions.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {liveSessions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="metadata">{t("courseDetail.tabs.metadata")}</TabsTrigger>
              </TabsList>

              {/* ----- Curriculum: syllabus layout, large serif numerals as the signature ----- */}
              <TabsContent value="curriculum" className="mt-6">
                {modules.length === 0 ? (
                  <Card className="border-border/60 shadow-card">
                    <EmptyState
                      title={t("courseDetail.curriculum.emptyTitle")}
                      description={t("courseDetail.curriculum.emptyDescription")}
                    />
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {modules.map((m, mi) => {
                      const moduleMinutes = (m.lessons ?? []).reduce((s, l) => s + (toMinutes(l.duration) ?? 0), 0);
                      const moduleDurationLabel = formatMinutes(moduleMinutes);
                      const lessonCount = m.lessons?.length ?? 0;
                      return (
                        <div key={m.id} className="flex gap-5">
                          <div className="w-10 shrink-0 pt-1 text-right font-serif text-3xl font-medium text-teal-600/25">
                            {String(mi + 1).padStart(2, "0")}
                          </div>
                          <div className="min-w-0 flex-1 border-l border-border pb-1 pl-5">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                              <h4 className="text-base font-semibold text-zinc-900">{m.title}</h4>
                              <span className="text-xs text-muted-foreground">
                                {t("courseDetail.curriculum.lessonCount", { count: lessonCount })}
                                {moduleDurationLabel && <> · {moduleDurationLabel}</>}
                              </span>
                            </div>

                            {lessonCount > 0 && (
                              <ul className="mt-3 space-y-0.5">
                                {m.lessons.map((l:any) => (
                                  <li
                                    key={l.id}
                                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-teal-600/[0.04]"
                                  >
                                    {l.kind === "video" ? (
                                      <PlayCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    ) : l.kind === "quiz" ? (
                                      <FileQuestion className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    )}
                                    <span className="min-w-0 flex-1 truncate text-zinc-700">{l.title}</span>
                                    {l.is_preview ? (
                                      <Badge className="shrink-0 border-0 bg-teal-600/10 text-[10px] font-medium text-teal-700 hover:bg-teal-600/10">
                                        {t("courseDetail.curriculum.preview")}
                                      </Badge>
                                    ) : (
                                      <Lock
                                        className="h-3 w-3 shrink-0 text-muted-foreground/40"
                                        aria-label={t("courseDetail.curriculum.locked")}
                                      />
                                    )}
                                    {l.duration && (
                                      <span className="shrink-0 text-xs text-muted-foreground">{l.duration}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ----- Uploads ----- */}
              <TabsContent value="uploads" className="mt-6">
                <Card className="border-border/60 shadow-card">
                  {uploads.length === 0 ? (
                    <EmptyState
                      title={t("courseDetail.uploads.emptyTitle")}
                      description={t("courseDetail.uploads.emptyDescription")}
                    />
                  ) : (
                    <div className="divide-y divide-border/60">
                      {uploads.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 p-4">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-600/10 text-teal-700">
                            {u.kind === "video" ? <FileVideo className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{u.title}</p>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <HardDrive className="h-3 w-3" /> {u.size || "—"}
                              <span aria-hidden="true">·</span>
                              {u.uploaded || "—"}
                            </p>
                          </div>
                          {u.url && (
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <a
                                href={u.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t("courseDetail.uploads.openFile", { title: u.title })}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* ----- Live sessions ----- */}
              <TabsContent value="live" className="mt-6">
                <Card className="border-border/60 shadow-card">
                  {liveSessions.length === 0 ? (
                    <EmptyState
                      title={t("courseDetail.live.emptyTitle")}
                      description={t("courseDetail.live.emptyDescription")}
                    />
                  ) : (
                    <div className="divide-y divide-border/60">
                      {liveSessions.map((s:any) => {
                        const startsAt = s.starts_at || s.startsAt;
                        return (
                          <div key={s.id} className="flex items-center gap-3 p-4">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-600/10 text-teal-700">
                              <Radio className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{s.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {startsAt ? new Date(startsAt).toLocaleString(locale) : "—"} · {s.duration || "—"} ·{" "}
                                {t("courseDetail.live.attendees", { count: s.attendees ?? 0 })}
                                {s.host && <> · {t("courseDetail.live.hostedBy", { host: s.host })}</>}
                              </p>
                            </div>
                            {s.join_url && (
                              <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <a
                                  href={s.join_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={t("courseDetail.live.joinSession", { title: s.title })}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Badge variant={s.status ? "secondary" : "default"} className="shrink-0">
                              {s.status ? t("courseDetail.live.ended") : t("courseDetail.live.upcoming")}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* ----- Metadata ----- */}
              <TabsContent value="metadata" className="mt-6">
                <Card className="border-border/60 p-6 shadow-card">
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">{t("courseDetail.metadata.slug")}</dt>
                      <dd className="mt-0.5 font-mono text-xs">{course.slug || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("courseDetail.metadata.courseId")}</dt>
                      <dd className="mt-0.5 font-mono text-xs">{course.id}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("courseDetail.metadata.language")}</dt>
                      <dd className="mt-0.5">{course.language || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("courseDetail.metadata.created")}</dt>
                      <dd className="mt-0.5">
                        {course.created_at ? new Date(course.created_at).toLocaleDateString(locale) : "—"}
                      </dd>
                    </div>
                  </dl>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* ===== Right: about this course ===== */}
          <aside className="space-y-6">
            {course.image_cover && (
              <div
                className="aspect-video w-full rounded-xl border border-border bg-muted bg-cover bg-center shadow-sm"
                style={{ backgroundImage: `url(${course.image_cover})` }}
                role="img"
                aria-label={course.title || t("courseDetail.untitledCourse")}
              />
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
                {t("courseDetail.about.title")}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {course.description || t("courseDetail.about.noDescription")}
              </p>
            </div>

            <div className="border-t border-border pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-teal-700">
                {t("courseDetail.includes.title")}
              </p>
              <ul className="space-y-2.5 text-sm text-zinc-700">
                {videoLessonCount > 0 && (
                  <li className="flex items-center gap-2.5">
                    <Video className="h-4 w-4 shrink-0 text-teal-700" />
                    {t("courseDetail.includes.videos", { count: videoLessonCount })}
                  </li>
                )}
                {resourceCount > 0 && (
                  <li className="flex items-center gap-2.5">
                    <FileDown className="h-4 w-4 shrink-0 text-teal-700" />
                    {t("courseDetail.includes.resources", { count: resourceCount })}
                  </li>
                )}
                {liveSessions.length > 0 && (
                  <li className="flex items-center gap-2.5">
                    <Radio className="h-4 w-4 shrink-0 text-teal-700" />
                    {t("courseDetail.includes.liveSessions", { count: liveSessions.length })}
                  </li>
                )}
                <li className="flex items-center gap-2.5">
                  <InfinityIcon className="h-4 w-4 shrink-0 text-teal-700" /> {t("courseDetail.includes.lifetimeAccess")}
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}