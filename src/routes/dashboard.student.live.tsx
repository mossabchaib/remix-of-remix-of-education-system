import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  Video,
  History,
  Radio,
  Link as LinkIcon,
  Loader2,
  Lock,
  Sparkles,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLiveSessions,
  hasActiveAccess,
  getMySubscription,
  getAdminCategories,
  getAllCourses,
  type LiveSession,
  type Subscription,
} from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/live")({
  head: () => ({ meta: [{ title: "Live classes — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Live,
});

function parseDate(s?: string) {
  if (!s || typeof s !== "string") return new Date(0);
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function Live() {
  const { t } = useTranslation();

  const [checking, setChecking] = useState(true);
  const [access, setAccess] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [courses, setCourses] = useState<any[]>([]); // Courses coming from the API
  const [categories, setCategories] = useState<any[]>([]); // Categories coming from the API

  const [startingId, setStartingId] = useState<string | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<LiveSession | null>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  const now = Date.now();

  // Resolves a course title dynamically from the loaded course list
  const getCourseTitle = (courseId: string) => {
    return courses.find((c: any) => String(c.id) === String(courseId))?.title ?? "—";
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch subscription, access, categories, and courses together.
        // NOTE: uses getAllCourses (same source/id shape as the courses &
        // quizzes pages) instead of CourseService.list(), which returned a
        // different id shape and caused the course filter to come up empty
        // for course-only buyers.
        const [sub, ok, catsData, coursesData]: any = await Promise.all([
          getMySubscription(),
          hasActiveAccess(),
          getAdminCategories().catch(() => []),
          getAllCourses().catch(() => []),
        ]);

        if (cancelled) return;

        // Store only the plan object, not the whole {plan, courses} shape.
        setSubscription(sub.plan);

        // Individually purchased courses that are currently active.
        const activeCourseIds = (sub.courses ?? [])
          .filter((c: any) => c.status === "active")
          .map((c: any) => String(c.course_id));
        setOwnedCourseIds(activeCourseIds);
        setHasPlan(ok);

        // Access is granted either via an active plan OR at least one active course purchase.
        const hasAnyAccess = ok || activeCourseIds.length > 0;
        setAccess(hasAnyAccess);
        setChecking(false);

        // Normalize categories
        const validCats = Array.isArray(catsData)
          ? catsData
          : catsData?.categories || catsData?.data || [];
        setCategories(validCats);

        // Normalize courses
        const allCourses = Array.isArray(coursesData) ? coursesData : [];

        // Plan holders see the full catalog. Course-only buyers only see
        // (and filter by) the courses they actually purchased.
        const visibleCourses = ok
          ? allCourses
          : allCourses.filter((c: any) => activeCourseIds.includes(String(c.id)));

        setCourses(visibleCourses);

        if (hasAnyAccess) {
          const sessionsData = await getLiveSessions().catch(() => []);
          if (cancelled) return;
          const allSessions = Array.isArray(sessionsData) ? sessionsData : [];

          // Plan holders see every live session. Course-only buyers only
          // see sessions that belong to a course they actually purchased.
          const visibleSessions = ok
            ? allSessions
            : allSessions.filter((s: any) => {
                const courseId = String(s.course_id || s.courseId || "");
                return activeCourseIds.includes(courseId);
              });

          setSessions(visibleSessions);
        }
      } catch (err) {
        console.error("Failed to load live page data:", err);
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Courses available under the currently selected category
  const availableCourses = useMemo(() => {
    if (selectedCategory === "all") return courses;
    return courses.filter(
      (c: any) =>
        c.categories?.name?.toLowerCase() === selectedCategory.toLowerCase() ||
        c.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        c.category_id === selectedCategory ||
        c.category === selectedCategory
    );
  }, [courses, selectedCategory]);

  // Sessions filtered by category and course
  const filteredSessions = useMemo(() => {
    return sessions.filter((s: any) => {
      const courseId = s.course_id || s.courseId;
      const course = courses.find((c: any) => String(c.id) === String(courseId));

      if (selectedCourse !== "all" && String(courseId) !== String(selectedCourse)) {
        return false;
      }

      if (selectedCategory !== "all") {
        if (!course) return false;
        const matchesCategory =
          course.categories?.name?.toLowerCase() === selectedCategory.toLowerCase() ||
          course.category?.toLowerCase() === selectedCategory.toLowerCase() ||
          course.category_id === selectedCategory ||
          course.category === selectedCategory;

        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [sessions, courses, selectedCategory, selectedCourse]);

  // Split sessions into upcoming and past
  const { upcoming, past } = useMemo(() => {
    const validSessions = (filteredSessions || []).filter(
      (s: any) => s && (s.starts_at || (s as any).startsAt)
    );
    const sorted = [...validSessions].sort(
      (a: any, b: any) =>
        parseDate(a.starts_at || (a as any).startsAt).getTime() -
        parseDate(b.starts_at || (b as any).startsAt).getTime()
    );
    return {
      upcoming: sorted.filter((s: any) => {
        const sessionDate = parseDate(s.starts_at || (s as any).startsAt).getTime();
        return sessionDate + 2 * 3600 * 1000 >= now;
      }),
      past: sorted
        .filter((s: any) => {
          const sessionDate = parseDate(s.starts_at || (s as any).startsAt).getTime();
          return sessionDate + 2 * 3600 * 1000 < now;
        })
        .reverse(),
    };
  }, [filteredSessions, now]);

  async function handleJoin(s: LiveSession) {
    const url = s.join_url || (s as any).joinUrl;
    if (!url) {
      toast.error(t("liveClasses.toast.noJoinUrl"));
      return;
    }
    setStartingId(s.id);
    try {
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(t("liveClasses.toast.joining", { title: s.title }));
    } catch {
      toast.error(t("liveClasses.toast.openLinkError"));
    } finally {
      setStartingId(null);
    }
  }

  const hasActiveFilters = selectedCategory !== "all" || selectedCourse !== "all";

  function resetFilters() {
    setSelectedCategory("all");
    setSelectedCourse("all");
  }

  if (checking) {
    return (
      <RoleDashboardLayout role="student">
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          {t("liveClasses.loading")}
        </div>
      </RoleDashboardLayout>
    );
  }

  if (!access) {
    return (
      <RoleDashboardLayout role="student">
        <PageHeader title={t("liveClasses.title")} description={t("liveClasses.description")} />
        <LockedView subscription={subscription} />
      </RoleDashboardLayout>
    );
  }

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title={t("liveClasses.title")}
        description={
          hasPlan
            ? t("liveClasses.description")
            : t("liveClasses.descriptionCourseOnly", "Live sessions for the courses you have purchased.")
        }
      />

      <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        <span>
          {hasPlan ? (
            <>
              {t("liveClasses.membershipActive")}
              {subscription?.ends_at && (
                <>
                  {" "}
                  · {t("liveClasses.accessThrough", { date: new Date(subscription.ends_at).toLocaleDateString() })}
                </>
              )}
            </>
          ) : (
            t("liveClasses.courseAccessOnly", {
              count: ownedCourseIds.length,
              defaultValue: `You have access to ${ownedCourseIds.length} course(s)`,
            })
          )}
        </span>
      </div>

      {/* Category / course filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
        <div className="mr-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          {/* <span>{t("liveClasses.filterBy")}</span> */}
        </div>

        {/* Category filter */}
        <Select
          value={selectedCategory}
          onValueChange={(val) => {
            setSelectedCategory(val);
            setSelectedCourse("all");
          }}
        >
          <SelectTrigger className="h-9 w-[180px] bg-background text-xs">
            <SelectValue placeholder={t("liveClasses.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("liveClasses.allCategories")}</SelectItem>
            {categories.map((c: any) => (
              <SelectItem key={c.id || c.name} value={c.name || c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Course filter */}
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="h-9 w-[200px] bg-background text-xs">
            <SelectValue placeholder={t("liveClasses.allCourses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("liveClasses.allCourses")}</SelectItem>
            {availableCourses.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 text-xs">
            {t("liveClasses.resetFilters")}
          </Button>
        )}
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">{t("liveClasses.tabs.upcoming", { count: upcoming.length })}</TabsTrigger>
          <TabsTrigger value="past">{t("liveClasses.tabs.past", { count: past.length })}</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title={t("liveClasses.empty.upcomingTitle")}
              description={t("liveClasses.empty.upcomingDescription")}
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t("liveClasses.clearFilters")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Grid list={upcoming} mode="upcoming" startingId={startingId} onJoin={handleJoin} getCourseTitle={getCourseTitle} />
          )}
        </TabsContent>
        <TabsContent value="past">
          {past.length === 0 ? (
            <EmptyState
              icon={History}
              title={t("liveClasses.empty.pastTitle")}
              description={t("liveClasses.empty.pastDescription")}
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t("liveClasses.clearFilters")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Grid list={past} mode="past" onJoin={handleJoin} onViewRecording={setRecordingTarget} getCourseTitle={getCourseTitle} />
          )}
        </TabsContent>
      </Tabs>

      {/* Recording playback dialog */}
      <Dialog open={!!recordingTarget} onOpenChange={(o) => !o && setRecordingTarget(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{recordingTarget?.title || t("liveClasses.recording.defaultTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{getCourseTitle(recordingTarget?.course_id ?? "")}</p>
            {recordingTarget?.recording_url || (recordingTarget as any)?.recordingUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                <video
                  src={recordingTarget?.recording_url || (recordingTarget as any)?.recordingUrl}
                  controls
                  autoPlay
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("liveClasses.recording.unavailable")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </RoleDashboardLayout>
  );
}

function Grid({
  list,
  mode,
  startingId,
  onJoin,
  onViewRecording,
  getCourseTitle,
}: {
  list: LiveSession[];
  mode: "upcoming" | "past";
  startingId?: string | null;
  onJoin?: (s: LiveSession) => void;
  onViewRecording?: (s: LiveSession) => void;
  getCourseTitle: (id: string) => string;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {list.map((s: any) => {
        const isLiveNow = s.status === true;
        const sessionDate = s.starts_at || s.startsAt;
        const joinLink = s.join_url || s.joinUrl;
        const recordingLink = s.recording_url || s.recordingUrl;

        return (
          <Card key={s.id} className="border-border/60 p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Video className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{s.duration || t("liveClasses.defaultDuration")}</Badge>
                {isLiveNow && (
                  <Badge className="gap-1 bg-red-500/10 text-red-600 hover:bg-red-500/10">
                    <Radio className="h-3 w-3 animate-pulse" /> {t("liveClasses.live")}
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold">{s.title || t("liveClasses.untitledSession")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{getCourseTitle(s.course_id)}</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" /> {sessionDate ? new Date(sessionDate).toLocaleString() : "—"}
              </div>
              <p>{t("liveClasses.hostedBy", { host: s.host || t("liveClasses.defaultHost"), count: s.attendees ?? 0 })}</p>
            </div>
            {joinLink && mode === "upcoming" && (
              <a
                href={joinLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1.5 truncate text-xs text-primary hover:underline"
              >
                <LinkIcon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{joinLink}</span>
              </a>
            )}
            <div className="mt-4 flex gap-2">
              {mode === "upcoming" ? (
                <Button
                  className="flex-1"
                  disabled={startingId === s.id}
                  onClick={() => onJoin?.(s)}
                >
                  {startingId === s.id ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("liveClasses.opening")}
                    </>
                  ) : isLiveNow ? (
                    t("liveClasses.joinLiveNow")
                  ) : (
                    t("liveClasses.joinSession")
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!recordingLink}
                  onClick={() => onViewRecording?.(s)}
                >
                  {recordingLink ? t("liveClasses.viewRecording") : t("liveClasses.noRecording")}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function LockedView({ subscription }: { subscription: Subscription | null }) {
  const { t } = useTranslation();
  const pending = subscription?.status === "pending";
  const expired = subscription?.status === "expired";

  const title = pending
    ? t("liveClasses.locked.pendingTitle")
    : expired
      ? t("liveClasses.locked.expiredTitle")
      : t("liveClasses.locked.defaultTitle");

  const description = pending
    ? t("liveClasses.locked.pendingDescription")
    : expired
      ? t("liveClasses.locked.expiredDescription")
      : t("liveClasses.locked.defaultDescription");

  return (
    <div className="relative mt-6 overflow-hidden rounded-xl border border-border/60">
      <div className="relative flex flex-col items-center gap-4 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background shadow-card">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {!pending && (
          <Button asChild size="lg" className="mt-2">
            <Link to="/dashboard/student/orders">
              <Sparkles className="mr-1.5 h-4 w-4" />
              {expired ? t("liveClasses.locked.renew") : t("liveClasses.locked.viewPlans")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}