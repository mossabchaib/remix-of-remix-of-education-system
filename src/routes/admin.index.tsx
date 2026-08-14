import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  Users,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { downloadCsv } from "@/lib/export-csv";
import {
  getAllCourses,
  getAdminUsers,
  getAllSubscriptions,
  type ProfileData,
  type Subscription,
} from "@/lib/lms-storage";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

// Minimal local shape for a course record. Replace with the real exported
// type from "@/lib/lms-storage" if/when one is available there.
interface CourseSummary {
  id: string;
  status?: string;
  is_published?: boolean;
}

interface MonthlyBucket {
  key: string;
  month: string;
  revenue: number;
  signups: number;
}

interface PaymentRow {
  id: string;
  user: string;
  invoice: string;
  method: string;
  amount: number;
  status: string;
}

const RECENT_PAYMENTS_LIMIT = 8;
const RECENT_USERS_LIMIT = 6;
const TREND_MONTHS = 6;

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function AdminDashboard() {
  const { t } = useTranslation();

  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [users, setUsers] = useState<ProfileData[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setLoadError(null);

    try {
      const [coursesRes, usersRes, subsRes] = await Promise.all([
        getAllCourses(),
        getAdminUsers(),
        getAllSubscriptions(),
      ]);

      setCourses(Array.isArray(coursesRes) ? coursesRes : (coursesRes as any)?.data ?? []);
      setUsers(Array.isArray(usersRes) ? usersRes : (usersRes as any)?.data ?? []);
      setSubscriptions(Array.isArray(subsRes) ? subsRes : (subsRes as any)?.data ?? []);
    } catch (error) {
      console.error("Failed to load admin dashboard data:", error);
      setLoadError(t("admin.loadErrorDesc"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await loadDashboardData("initial");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- KPIs built from live data ---
  const totalRevenue = useMemo(
    () =>
      subscriptions
        .filter((s) => s?.status === "active")
        .reduce((sum, s) => sum + (s?.amount ?? 0), 0),
    [subscriptions]
  );

  const activeLearners = useMemo(
    () => (Array.isArray(users) ? users.filter((u) => u?.role === "student").length : 0),
    [users]
  );

  const publishedCourses = useMemo(
    () => courses.filter((c) => c?.status === "published" || c?.is_published).length,
    [courses]
  );

  const draftCourses = courses.length - publishedCourses;

  // --- Monthly revenue / signups series (last 6 months) built from subscriptions ---
  const revenueSeries = useMemo<MonthlyBucket[]>(() => {
    const now = new Date();
    const months: MonthlyBucket[] = [];
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: d.toLocaleString("en", { month: "short" }),
        revenue: 0,
        signups: 0,
      });
    }
    const byKey = Object.fromEntries(months.map((m) => [m.key, m]));

    subscriptions.forEach((s) => {
      if (!s?.created_at) return;
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = byKey[key];
      if (!bucket) return;
      bucket.signups += 1;
      if (s?.status === "active") bucket.revenue += s?.amount ?? 0;
    });

    return months;
  }, [subscriptions]);

  const hasRevenueData = revenueSeries.some((m) => m.revenue > 0 || m.signups > 0);

  // Month-over-month delta for the revenue trend badge
  const revenueDelta = useMemo(() => {
    const last = revenueSeries[revenueSeries.length - 1]?.revenue ?? 0;
    const prev = revenueSeries[revenueSeries.length - 2]?.revenue ?? 0;
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 1000) / 10;
  }, [revenueSeries]);

  // --- Recent payments table ---
  const payments = useMemo<PaymentRow[]>(
    () =>
      [...subscriptions]
        .sort((a, b) => (b?.created_at ?? "").localeCompare(a?.created_at ?? ""))
        .slice(0, RECENT_PAYMENTS_LIMIT)
        .map((s: any) => ({
          id: s.id,
          user: s?.profiles?.full_name ?? t("admin.unknownUser"),
          invoice: s?.plan_name ?? t("admin.untitledPlan"),
          method: t("admin.subscriptionMethod"),
          amount: s?.amount ?? 0,
          status: s?.status ?? "unknown",
        })),
    [subscriptions, t]
  );

  const newUsers = useMemo(
    () => (Array.isArray(users) ? [...users].slice(0, RECENT_USERS_LIMIT) : []),
    [users]
  );

  const handleExport = useCallback(async () => {
    if (payments.length === 0) return;
    setIsExporting(true);
    try {
      downloadCsv(
        `lumen-payments-${new Date().toISOString().slice(0, 10)}.csv`,
        payments.map((p) => ({
          invoice: p.invoice,
          user: p.user,
          method: p.method,
          amount: p.amount,
          status: p.status,
        }))
      );
    } finally {
      setIsExporting(false);
    }
  }, [payments]);

  const handleRefresh = useCallback(() => {
    loadDashboardData("refresh");
  }, [loadDashboardData]);

  // --- Error state ---
  if (loadError && !isLoading) {
    return (
      <>
        <PageHeader title={t("admin.overview")} description={t("admin.overviewDesc")} />
        <Card className="border-border/60 p-10 shadow-card">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-sm font-semibold">{t("admin.loadErrorTitle")}</p>
            <p className="max-w-sm text-xs text-muted-foreground">{loadError}</p>
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`me-1.5 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? t("common.retrying") : t("common.retry")}
            </Button>
          </div>
        </Card>
      </>
    );
  }

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <>
        <PageHeader title={t("admin.overview")} description={t("admin.overviewDesc")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/60 p-6 shadow-card">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-16" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card className="border-border/60 p-6 shadow-card">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-6 h-72 w-full" />
          </Card>
          <Card className="border-border/60 p-6 shadow-card">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-6 h-72 w-full" />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("admin.overview")}
        description={t("admin.overviewDesc")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`me-1.5 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? t("common.refreshing") : t("common.refresh")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || payments.length === 0}
            >
              <Download className="me-1.5 h-4 w-4" />
              {isExporting ? t("common.exporting") : t("common.export")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("admin.totalRevenue")}
          value={formatCurrency(totalRevenue)}
          delta={revenueDelta}
          icon={DollarSign}
        />
        <StatCard
          label={t("admin.activeLearners")}
          value={activeLearners.toLocaleString()}
          icon={Users}
        />
        <StatCard
          label={t("admin.publishedCourses")}
          value={String(publishedCourses)}
          delta={draftCourses > 0 ? -draftCourses : 0}
          icon={BookOpen}
        />
        <StatCard
          label={t("admin.totalCourses")}
          value={String(courses.length)}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{t("admin.revenueTrend")}</p>
              <p className="text-xs text-muted-foreground">{t("admin.mrr")}</p>
            </div>
            <Badge variant="outline" className="gap-1">
              {revenueDelta >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {revenueDelta >= 0 ? "+" : ""}
              {revenueDelta}%
            </Badge>
          </div>
          <div className="mt-4 h-72">
            {hasRevenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message={t("admin.noRevenueData")} />
            )}
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">{t("admin.newSignups")}</p>
          <p className="text-xs text-muted-foreground">{t("admin.last6Months")}</p>
          <div className="mt-4 h-72">
            {hasRevenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="signups" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message={t("admin.noSignupData")} />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-border/60 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{t("admin.recentPayments")}</p>
              <p className="text-xs text-muted-foreground">{t("admin.latestTransactions")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExport}
              disabled={isExporting || payments.length === 0}
              aria-label={t("common.export")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border/60">
            {payments.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("admin.noPaymentsYet")}
              </p>
            )}
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {getInitials(p.user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.user}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.invoice} · {p.method}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill value={p.status} />
                  <p className="w-16 text-end text-sm font-semibold">
                    {formatCurrency(p.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border/60 p-6 shadow-card">
          <p className="text-sm font-semibold">{t("admin.newUsers")}</p>
          <p className="text-xs text-muted-foreground">{t("admin.recentlyJoined")}</p>
          <div className="mt-4 space-y-3">
            {newUsers.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("admin.noUsersYet")}
              </p>
            )}
            {newUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {u?.avatar_url && <AvatarImage src={u.avatar_url} alt={u.full_name ?? ""} />}
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {getInitials(u?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">
                  {u.role}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}