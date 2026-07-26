import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { DollarSign, Download, TrendingUp, Wallet } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/admin/StatusPill";
import { revenueSeries } from "@/lib/mock-data";
import { useKeyedStorage } from "@/hooks/useKeyedStorage";
import { storageKeys, getOrders } from "@/lib/lms-storage";
import { useTeacherStats } from "@/hooks/useTeacherStats";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/revenue")({
  head: () => ({ meta: [{ title: "Revenue — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Revenue,
});

function Revenue() {
  const stats = useTeacherStats();
  const orders = useKeyedStorage(storageKeys.orders, getOrders);
  const paid = orders.filter((o) => o.status === "paid");
  const gross = stats.totalRevenue;
  const scale = Math.max(1, gross / (revenueSeries.reduce((a, r) => a + r.revenue, 0) || 1));
  const series = revenueSeries.map((r) => ({ ...r, revenue: Math.round(r.revenue * scale) }));

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Revenue"
        description="Simulated earnings derived from your catalog and student orders."
        actions={<Button variant="outline" onClick={() => toast.success("Statement exported")}><Download className="mr-1.5 h-4 w-4" /> Export</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={`$${gross.toLocaleString()}`} icon={DollarSign} />
        <StatCard label="Order revenue" value={`$${stats.realOrdersRevenue.toLocaleString()}`} icon={Wallet} />
        <StatCard label="Catalog revenue" value={`$${stats.simulatedRevenue.toLocaleString()}`} icon={TrendingUp} />
        <StatCard label="Paid orders" value={String(paid.length)} icon={Wallet} />
      </div>
      <Card className="border-border/60 p-6 shadow-card">
        <p className="text-sm font-semibold">Monthly earnings</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
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
        <p className="text-sm font-semibold">Recent orders</p>
        <p className="text-xs text-muted-foreground">Payments captured through student checkouts.</p>
        <div className="mt-4 divide-y divide-border/60">
          {orders.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No orders yet — student purchases will appear here in real time.</p>}
          {orders.slice(0, 8).map((o) => (
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
