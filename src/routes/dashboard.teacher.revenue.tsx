import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CalendarDays, DollarSign, Download, Receipt, TrendingUp, Wallet } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/admin/StatusPill";
import { CourseFilterSelect } from "@/components/teacher/dashboard/CourseFilterSelect";
import { DateRangeSelect } from "@/components/teacher/dashboard/DateRangeSelect";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { useRevenueAnalytics, type DateRangeValue } from "@/hooks/useRevenueAnalytics";
import { downloadCsv } from "@/lib/export-csv";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/revenue")({
  head: () => ({ meta: [{ title: "Revenue — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Revenue,
});

function Revenue() {
  const [courseId, setCourseId] = useState<string>("all");
  const [range, setRange] = useState<DateRangeValue>("all");
  const courses = useTeacherCourses();
  const revenue = useRevenueAnalytics(courseId, range);

  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title }));

  function handleExport() {
    if (revenue.filteredOrders.length === 0) {
      toast.error("No orders to export for the current filters");
      return;
    }
    const rows = revenue.filteredOrders.map((o) => ({
      Invoice: o.invoice,
      Course: o.courseTitle,
      Buyer: o.buyerName,
      Email: o.buyerEmail,
      Amount: o.amount,
      Status: o.status,
      Method: o.method,
      Date: o.date.slice(0, 10),
    }));
    downloadCsv(`revenue-statement-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success("Statement exported");
  }

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Revenue"
        description="Earnings derived from your catalog and real student orders."
        actions={<Button variant="outline" onClick={handleExport}><Download className="mr-1.5 h-4 w-4" /> Export</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <CourseFilterSelect value={courseId} onChange={setCourseId} options={courseOptions} />
        <DateRangeSelect value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={`$${revenue.totalRevenue.toLocaleString()}`} icon={DollarSign} />
        <StatCard label="Order revenue" value={`$${revenue.realOrdersRevenue.toLocaleString()}`} icon={Wallet} />
        <StatCard label="Catalog revenue" value={`$${revenue.simulatedRevenue.toLocaleString()}`} icon={TrendingUp} />
        <StatCard label="Paid orders" value={String(revenue.paidOrdersCount)} icon={Receipt} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue this month" value={`$${revenue.revenueThisMonth.toLocaleString()}`} icon={CalendarDays} />
        <StatCard label="Revenue this week" value={`$${revenue.revenueThisWeek.toLocaleString()}`} icon={CalendarDays} />
        <StatCard label="Avg. order value" value={`$${revenue.averageOrderValue.toLocaleString()}`} icon={Wallet} />
      </div>

      <Card className="border-border/60 p-6 shadow-card">
        <p className="text-sm font-semibold">Monthly earnings</p>
        <p className="text-xs text-muted-foreground">
          Simulated catalog history + real orders, by month — no artificial scaling.
        </p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenue.timeline}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v: number) => [`$${v}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="border-border/60 p-6 shadow-card">
        <p className="text-sm font-semibold">Revenue by course</p>
        <p className="text-xs text-muted-foreground">Top 8 courses by real paid orders, matching current filters.</p>
        <div className="mt-4 h-64">
          {revenue.revenuePerCourse.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No paid orders for the selected filters yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue.revenuePerCourse}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="course" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                  formatter={(v: number) => [`$${v}`, "Revenue"]}
                />
                <Bar dataKey="amount" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="border-border/60 p-6 shadow-card">
        <p className="text-sm font-semibold">Recent orders</p>
        <p className="text-xs text-muted-foreground">Payments captured through student checkouts, matching current filters.</p>
        <div className="mt-4 divide-y divide-border/60">
          {revenue.filteredOrders.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No orders match the current filters — student purchases will appear here in real time.
            </p>
          )}
          {revenue.filteredOrders.slice(0, 8).map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{o.courseTitle}</p>
                <p className="truncate text-xs text-muted-foreground">{o.invoice} · {o.buyerName} · {o.date.slice(0, 10)}</p>
              </div>
              <StatusPill value={o.status === "paid" ? "Active" : o.status === "failed" ? "Suspended" : "Pending"} />
              <span className="font-semibold">${o.amount}</span>
              <Button asChild variant="ghost" size="sm"><Link to="/admin/payments/$id" params={{ id: o.id }}>View</Link></Button>
            </div>
          ))}
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}