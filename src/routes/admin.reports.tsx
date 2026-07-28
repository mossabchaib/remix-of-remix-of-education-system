import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Download, TrendingUp, Users, DollarSign, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { DateRangeFilter } from "@/components/admin/reports/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useReportsData, type DateRangeKey } from "@/hooks/useReportsData";
import { downloadCsv } from "@/lib/export-csv";
export const Route = createFileRoute("/admin/reports")({
  component: Reports,
});

function Reports() {
  const [range, setRange] = useState<DateRangeKey>("30d");
  const { kpis, revenueSeries, categoriesData, rawOrders } = useReportsData(range);

  const handleExport = () => {
    downloadCsv(
      `reports-${range}.csv`,
      rawOrders.map((o) => ({
        id: o.id,
        amount: o.amount,
        status: o.status,
        createdAt: o.createdAt,
      }))
    );
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Understand what's working and where to invest next."
        actions={
          <div className="flex items-center gap-2">
            <DateRangeFilter value={range} onChange={setRange} />
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={`$${kpis.revenue.toLocaleString()}`}
          delta={kpis.revenueDelta}
          icon={DollarSign}
        />
        <StatCard label="Enrollments" value={kpis.enrollments.toLocaleString()} delta={kpis.enrollmentsDelta} icon={Users} />
        <StatCard label="Completions" value={kpis.completions.toLocaleString()} delta={kpis.completionsDelta} icon={BookOpen} />
        <StatCard label="Avg. progress" value={`${kpis.avgProgress}%`} delta={0} icon={TrendingUp} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">Revenue vs Signups</p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="signups" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">Enrollments by category</p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoriesData} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={3}>
                  {categoriesData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="border-border/60 p-6 shadow-card">
        <p className="text-sm font-semibold">Top categories by enrollment</p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {categoriesData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}