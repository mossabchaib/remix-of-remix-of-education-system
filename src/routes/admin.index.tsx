import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookOpen, DollarSign, TrendingUp, Users, Download,
  ArrowUpRight, ArrowDownRight, MoreHorizontal,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { downloadCsv } from "@/lib/export-csv";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const { kpis, revenueSeries, payments, users } = useAdminOverview();

  function handleExport() {
    downloadCsv(
      `lumen-payments-${new Date().toISOString().slice(0, 10)}.csv`,
      payments.map((p) => ({
        invoice: p.invoice,
        user: p.user,
        method: p.method,
        amount: p.amount,
        status: p.status,
      })),
    );
  }

  return (
    <>
      <PageHeader
        title="Overview"
        description="A snapshot of your learning platform this month."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={`$${kpis.totalRevenue.toLocaleString()}`}
          delta={kpis.revenueDelta}
          icon={DollarSign}
        />
        <StatCard
          label="Active learners"
          value={kpis.activeLearners.toLocaleString()}
          delta={kpis.learnersDelta}
          icon={Users}
        />
        <StatCard
          label="Published courses"
          value={String(kpis.publishedCourses)}
          delta={kpis.coursesDelta}
          icon={BookOpen}
        />
        <StatCard
          label="Completion rate"
          value={`${kpis.completionRate}%`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Revenue trend</p>
              <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
            </div>
            <Badge variant="outline" className="gap-1">
              {kpis.revenueDelta >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {kpis.revenueDelta >= 0 ? "+" : ""}{kpis.revenueDelta}%
            </Badge>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">New signups</p>
          <p className="text-xs text-muted-foreground">Last 12 months</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="signups" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Recent payments</p>
              <p className="text-xs text-muted-foreground">Latest transactions</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleExport}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {payments.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No payments yet.
              </p>
            )}
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {p.user.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.user}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.invoice} · {p.method}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill value={p.status} />
                  <p className="w-16 text-right text-sm font-semibold">${p.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">New users</p>
          <p className="text-xs text-muted-foreground">Recently joined</p>
          <div className="mt-4 space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {u.name.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="outline" className="text-xs">{u.role}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}