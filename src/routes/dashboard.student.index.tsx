import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Award, BookOpen, CheckCircle2, ClipboardList, Clock, Flame, Heart,
  PlayCircle, Sparkles, Video,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { courses, revenueSeries } from "@/lib/mock-data";
import { courseProgress, flatLessons } from "@/lib/lms-storage";
import {
  useActivity, useEnrollmentIds, useIssuedCertificates, useLastAccessed,
  useProgress, useWishlistIds,
} from "@/hooks/useStudentData";
import { useAssignments, useLiveSessions } from "@/hooks/useTeacherData";
import { useNotifications } from "@/hooks/useNotifications";

export const Route = createFileRoute("/dashboard/student/")({
  head: () => ({ meta: [{ title: "Overview — Student · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: StudentOverview,
});

function StudentOverview() {
  const ids = useEnrollmentIds();
  const wishlist = useWishlistIds();
  const certs = useIssuedCertificates();
  const activity = useActivity();
  const lastAccessed = useLastAccessed();
  useProgress();
  const live = useLiveSessions();
  const assignments = useAssignments();
  const { list: notifs, unread } = useNotifications();

  const enrolled = useMemo(() => courses.filter((c) => ids.includes(c.id)), [ids]);

  const withProgress = useMemo(
    () =>
      enrolled.map((c) => {
        const total = flatLessons(c.id).length;
        return { c, p: courseProgress(c.id, total), lastAt: lastAccessed[c.id] };
      }),
    [enrolled, lastAccessed],
  );

  const completedCount = withProgress.filter((x) => x.p.pct === 100).length;
  const inProgressCount = withProgress.filter((x) => x.p.pct > 0 && x.p.pct < 100).length;
  const pendingAssignments = assignments.filter((a) => a.status === "Pending").length;

  const continueLearning = [...withProgress]
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""))
    .slice(0, 3);
  const upcoming = live.slice(0, 3);
  const dueSoon = assignments.filter((a) => a.status === "Pending").slice(0, 3);

  const weeklyHours = revenueSeries.slice(-7).map((r, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    hours: 1 + (r.signups % 4),
  }));

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title="Welcome back"
        description="Pick up where you left off and stay on track this week."
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/student/wishlist">
                <Heart className="mr-1.5 h-4 w-4" /> Wishlist ({wishlist.length})
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/courses">
                <Sparkles className="mr-1.5 h-4 w-4" /> Discover courses
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrolled courses" value={String(enrolled.length)} icon={BookOpen} />
        <StatCard label="In progress" value={String(inProgressCount)} icon={PlayCircle} />
        <StatCard label="Completed" value={String(completedCount)} icon={CheckCircle2} />
        <StatCard label="Certificates" value={String(certs.length)} icon={Award} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Upcoming live" value={String(upcoming.length)} icon={Video} />
        <StatCard label="Pending assignments" value={String(pendingAssignments)} icon={ClipboardList} />
        <StatCard label="Unread notifications" value={String(unread)} icon={Sparkles} />
        <StatCard label="Study streak" value="14 days" icon={Flame} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Continue learning</p>
              <p className="text-xs text-muted-foreground">Jump back in with one click</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard/student/courses">See all</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {continueLearning.length === 0 && (
              <p className="text-sm text-muted-foreground">
                You aren't enrolled in any courses yet.{" "}
                <Link to="/courses" className="text-primary underline">Browse the catalog</Link>.
              </p>
            )}
            {continueLearning.map(({ c, p }) => (
              <Link
                key={c.id}
                to="/dashboard/student/courses/$id"
                params={{ id: c.id }}
                className="group flex items-center gap-4 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40"
              >
                <div className="h-14 w-20 shrink-0 rounded-lg" style={{ backgroundImage: c.cover }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.teacher} · {c.category}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={p.pct} className="h-1.5" />
                    <span className="w-10 text-right text-xs font-medium text-muted-foreground">{p.pct}%</span>
                  </div>
                </div>
                <PlayCircle className="h-6 w-6 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">Study activity</p>
          <p className="text-xs text-muted-foreground">Hours studied — last 7 days</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyHours}>
                <defs>
                  <linearGradient id="hrs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={2} fill="url(#hrs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Upcoming live</p>
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard/student/live">All</Link></Button>
          </div>
          <div className="mt-3 divide-y divide-border/60">
            {upcoming.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nothing scheduled.</p>}
            {upcoming.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Video className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.host} · {s.startsAt}</p>
                </div>
                <Badge variant="outline">{s.duration}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Assignments due</p>
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard/student/assignments">All</Link></Button>
          </div>
          <div className="mt-3 divide-y divide-border/60">
            {dueSoon.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nothing due.</p>}
            {dueSoon.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-warning/10 text-warning">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.course}</p>
                </div>
                <Badge variant="outline">Due {a.due.slice(5)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Recent notifications</p>
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard/student/notifications">All</Link></Button>
          </div>
          <div className="mt-3 divide-y divide-border/60">
            {notifs.slice(0, 4).map((n) => (
              <div key={n.id} className="flex items-start gap-3 py-3">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: n.read ? "var(--border)" : "var(--primary)" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                </div>
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">{n.at}</span>
              </div>
            ))}
            {notifs.length === 0 && <p className="py-3 text-sm text-muted-foreground">You're all caught up.</p>}
          </div>
        </Card>
      </div>

      <Card className="border-border/60 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Recent activity</p>
            <p className="text-xs text-muted-foreground">A live feed of your learning</p>
          </div>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-4 divide-y divide-border/60">
          {activity.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">
              Complete a lesson or a quiz to see your activity here.
            </p>
          )}
          {activity.slice(0, 6).map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
                {a.kind === "quiz" ? <ClipboardList className="h-4 w-4" /> :
                 a.kind === "purchase" ? <Award className="h-4 w-4" /> :
                 a.kind === "certificate" ? <Award className="h-4 w-4" /> :
                 a.kind === "assignment" ? <ClipboardList className="h-4 w-4" /> :
                 a.kind === "enroll" ? <BookOpen className="h-4 w-4" /> :
                 <CheckCircle2 className="h-4 w-4" />}
              </div>
              <p className="flex-1 text-sm">{a.label}</p>
              <span className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}
