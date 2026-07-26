import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, BookOpen, ClipboardList, DollarSign, ListChecks, Plus, Star, Users, Video,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { revenueSeries } from "@/lib/mock-data";
import { useLiveSessions, useAssignments } from "@/hooks/useTeacherData";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { useTeacherStats } from "@/hooks/useTeacherStats";
import { useNotifications } from "@/hooks/useNotifications";

export const Route = createFileRoute("/dashboard/teacher/")({
  head: () => ({ meta: [{ title: "Overview — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherOverview,
});

function TeacherOverview() {
  const stats = useTeacherStats();
  const courses = useTeacherCourses();
  const liveSessions = useLiveSessions();
  const assignments = useAssignments();
  const { list: notifs } = useNotifications();

  const topCourses = [...courses].sort((a, b) => b.students - a.students).slice(0, 4);
  const upcomingLive = [...liveSessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 4);
  const pendingAssignments = assignments.filter((a) => a.status === "Pending");

  // Scale mock chart series by real stat magnitudes so it still feels connected.
  const scale = Math.max(1, stats.totalStudents / 100);
  const chartData = revenueSeries.map((r) => ({
    month: r.month,
    signups: Math.round(r.signups * scale),
    revenue: Math.round((stats.totalRevenue / 12) * (0.7 + (r.revenue % 3000) / 6000)),
  }));

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Instructor overview"
        description="Live snapshot of your catalog, learners and revenue."
        actions={
          <Button asChild size="sm">
            <Link to="/dashboard/teacher/courses/new"><Plus className="mr-1.5 h-4 w-4" /> New course</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={`$${stats.totalRevenue.toLocaleString()}`} delta={9.2} icon={DollarSign} />
        <StatCard label="Total students" value={stats.totalStudents.toLocaleString()} delta={4.6} icon={Users} />
        <StatCard label="Published courses" value={String(stats.publishedCourses)} delta={stats.draftCourses} icon={BookOpen} />
        <StatCard label="Average rating" value={stats.averageRating.toFixed(2)} delta={0.4} icon={Star} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lessons" value={String(stats.totalLessons)} icon={BookOpen} />
        <StatCard label="Quizzes" value={String(stats.totalQuizzes)} icon={ListChecks} />
        <StatCard label="Assignments" value={String(stats.totalAssignments)} icon={ClipboardList} />
        <StatCard label="Live sessions" value={String(stats.totalLiveSessions)} icon={Video} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Enrollments over time</p>
              <p className="text-xs text-muted-foreground">Trend scaled to {stats.totalStudents.toLocaleString()} learners</p>
            </div>
            <Badge variant="outline" className="gap-1"><ArrowUpRight className="h-3 w-3" /> {stats.completionRate}% completion</Badge>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="e" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="signups" stroke="var(--primary)" strokeWidth={2} fill="url(#e)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">Revenue by month</p>
          <p className="text-xs text-muted-foreground">Gross earnings (simulated)</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Top courses</p>
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard/teacher/courses">All</Link></Button>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {topCourses.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No courses yet.</p>}
            {topCourses.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-3">
                <div className="h-9 w-14 shrink-0 rounded-md" style={{ backgroundImage: c.cover }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.students.toLocaleString()} students · {c.rating.toFixed(1)} ★</p>
                </div>
                <Badge variant="outline">${c.price}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Upcoming live</p>
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard/teacher/live">All</Link></Button>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {upcomingLive.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nothing scheduled.</p>}
            {upcomingLive.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.startsAt} · {s.attendees} attendees</p>
                </div>
                <Badge variant="outline">{s.duration}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Recent notifications</p>
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard/teacher/notifications">All</Link></Button>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {notifs.slice(0, 4).map((n) => (
              <div key={n.id} className="py-3 text-sm">
                <p className="truncate font-medium">{n.title}</p>
                <p className="truncate text-xs text-muted-foreground">{n.body}</p>
              </div>
            ))}
            {notifs.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">All caught up.</p>}
          </div>
        </Card>
      </div>

      <Card className="border-border/60 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Pending assignments</p>
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard/teacher/assignments">Manage</Link></Button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pendingAssignments.slice(0, 6).map((a) => (
            <div key={a.id} className="rounded-lg border border-border/60 p-3">
              <p className="truncate text-sm font-medium">{a.title}</p>
              <p className="truncate text-xs text-muted-foreground">{a.course} · due {a.due}</p>
            </div>
          ))}
          {pendingAssignments.length === 0 && <p className="text-xs text-muted-foreground">No pending assignments.</p>}
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}
