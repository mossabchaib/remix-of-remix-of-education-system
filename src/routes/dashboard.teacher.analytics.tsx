import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Eye, Star, TrendingUp, Users } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { revenueSeries } from "@/lib/mock-data";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { useTeacherStats } from "@/hooks/useTeacherStats";

export const Route = createFileRoute("/dashboard/teacher/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Analytics,
});

function Analytics() {
  const stats = useTeacherStats();
  const courses = useTeacherCourses();
  // Watch minutes scaled by real total students so chart reflects catalog size.
  const scale = Math.max(1, stats.totalStudents / 100);
  const engagement = revenueSeries.map((r) => ({
    month: r.month, minutes: Math.round(r.signups * 8 * scale),
  }));
  const byCourse = [...courses]
    .sort((a, b) => b.students - a.students)
    .slice(0, 8)
    .map((c) => ({ name: c.title.length > 18 ? c.title.slice(0, 16) + "…" : c.title, students: c.students }));

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader title="Analytics" description="Engagement, completion and satisfaction — computed live from your catalog." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total enrollments" value={stats.totalEnrollments.toLocaleString()} icon={Eye} />
        <StatCard label="Active learners" value={stats.activeStudents.toLocaleString()} icon={Users} />
        <StatCard label="Completion" value={`${stats.completionRate}%`} icon={TrendingUp} />
        <StatCard label="Avg rating" value={stats.averageRating.toFixed(2)} icon={Star} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">Watch minutes</p>
          <p className="text-xs text-muted-foreground">Estimated across your catalog</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagement}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="minutes" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">Students per course</p>
          <p className="text-xs text-muted-foreground">Top 8 by enrollment</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCourse}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="students" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card className="border-border/60 p-6 shadow-card">
        <p className="text-sm font-semibold">Catalog snapshot</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6 text-sm">
          <div><p className="text-xs text-muted-foreground">Courses</p><p className="font-semibold">{stats.totalCourses}</p></div>
          <div><p className="text-xs text-muted-foreground">Published</p><p className="font-semibold">{stats.publishedCourses}</p></div>
          <div><p className="text-xs text-muted-foreground">Drafts</p><p className="font-semibold">{stats.draftCourses}</p></div>
          <div><p className="text-xs text-muted-foreground">Lessons</p><p className="font-semibold">{stats.totalLessons}</p></div>
          <div><p className="text-xs text-muted-foreground">Quizzes</p><p className="font-semibold">{stats.totalQuizzes}</p></div>
          <div><p className="text-xs text-muted-foreground">Avg quiz score</p><p className="font-semibold">{stats.averageQuizScore}%</p></div>
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}
