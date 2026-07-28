import { useMemo } from "react";
import { useKeyedStorage } from "@/hooks/useKeyedStorage";
import { storageKeys, getOrders } from "@/lib/lms-storage";
import { revenueSeries } from "@/lib/mock-data";

export type DateRangeValue = "all" | "7d" | "30d" | "90d";

const RANGE_MS: Record<DateRangeValue, number | null> = {
  all: null,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
  "90d": 90 * 86_400_000,
};

function monthLabel(d: Date) {
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export function useRevenueAnalytics(courseId: string, range: DateRangeValue) {
  const orders = useKeyedStorage(storageKeys.orders, getOrders);

  return useMemo(() => {
    const now = new Date();
    const cutoff = RANGE_MS[range] ? new Date(now.getTime() - RANGE_MS[range]!) : null;

    // Orders scoped by course only (used for KPIs that shouldn't move when the date filter changes)
    const courseScoped = orders.filter((o) => courseId === "all" || o.courseId === courseId);
    const coursePaid = courseScoped.filter((o) => o.status === "paid");

    // Orders scoped by course AND date range (used for the table + "filtered" KPIs)
    const filteredOrders = courseScoped.filter((o) => !cutoff || new Date(o.date) >= cutoff);
    const filteredPaid = filteredOrders.filter((o) => o.status === "paid");

    const realOrdersRevenue = filteredPaid.reduce((sum, o) => sum + o.amount, 0);
    const averageOrderValue = filteredPaid.length ? Math.round(realOrdersRevenue / filteredPaid.length) : 0;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - 7 * 86_400_000);
    const revenueThisMonth = coursePaid
      .filter((o) => new Date(o.date) >= startOfMonth)
      .reduce((s, o) => s + o.amount, 0);
    const revenueThisWeek = coursePaid
      .filter((o) => new Date(o.date) >= startOfWeek)
      .reduce((s, o) => s + o.amount, 0);

    // Simulated baseline only makes sense at the "all courses" scope (mock series has no per-course split)
    const simulatedRevenue = courseId === "all" ? revenueSeries.reduce((s, r) => s + r.revenue, 0) : 0;
    const baselineTimeline =
      courseId === "all"
        ? revenueSeries.map((r) => ({ month: r.month, sortKey: `0-${r.month}`, revenue: r.revenue, simulated: true }))
        : [];

    // Real timeline: actual paid orders bucketed by real month, never scaled/altered
    const realBuckets = new Map<string, { month: string; sortKey: string; revenue: number }>();
    coursePaid.forEach((o) => {
      const d = new Date(o.date);
      const sortKey = `1-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = realBuckets.get(sortKey) ?? { month: monthLabel(d), sortKey, revenue: 0 };
      cur.revenue += o.amount;
      realBuckets.set(sortKey, cur);
    });
    const realTimeline = Array.from(realBuckets.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((r) => ({ ...r, simulated: false }));

    const timeline = [...baselineTimeline, ...realTimeline];

    // Revenue per course (from real paid orders only — the only source with a course breakdown)
    const perCourse = new Map<string, number>();
    filteredPaid.forEach((o) => {
      perCourse.set(o.courseTitle, (perCourse.get(o.courseTitle) ?? 0) + o.amount);
    });
    const revenuePerCourse = Array.from(perCourse.entries())
      .map(([course, amount]) => ({
        course: course.length > 18 ? course.slice(0, 16) + "…" : course,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    return {
      totalRevenue: simulatedRevenue + realOrdersRevenue,
      realOrdersRevenue,
      simulatedRevenue,
      revenueThisMonth,
      revenueThisWeek,
      averageOrderValue,
      paidOrdersCount: filteredPaid.length,
      timeline,
      revenuePerCourse,
      filteredOrders,
    };
  }, [orders, courseId, range]);
}