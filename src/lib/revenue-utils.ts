import type { Order } from "./lms-storage";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export type DateRangeFilter = "all" | "30d" | "month" | "year";

export type RevenuePoint = { key: string; label: string; revenue: number; orders: number };
export type CourseRevenue = { courseTitle: string; revenue: number; orders: number };

export function filterOrdersByRange(orders: Order[], range: DateRangeFilter): Order[] {
  if (range === "all") return orders;
  const now = new Date();
  return orders.filter((o) => {
    const d = new Date(o.date);
    if (range === "30d") return (now.getTime() - d.getTime()) / 86400000 <= 30;
    if (range === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (range === "year") return d.getFullYear() === now.getFullYear();
    return true;
  });
}

export function filterOrdersByCourse(orders: Order[], courseTitle: string | "all"): Order[] {
  if (courseTitle === "all") return orders;
  return orders.filter((o) => o.courseTitle === courseTitle);
}

/** Builds a real monthly revenue series strictly from paid orders — no mock data. */
export function monthlyRevenueSeries(orders: Order[]): RevenuePoint[] {
  const paid = orders.filter((o) => o.status === "paid");
  const map = new Map<string, RevenuePoint>();
  for (const o of paid) {
    const d = new Date(o.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTH_LABELS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
    const existing = map.get(key);
    if (existing) { existing.revenue += o.amount; existing.orders += 1; }
    else map.set(key, { key, label, revenue: o.amount, orders: 1 });
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function revenueByCourse(orders: Order[]): CourseRevenue[] {
  const paid = orders.filter((o) => o.status === "paid");
  const map = new Map<string, CourseRevenue>();
  for (const o of paid) {
    const existing = map.get(o.courseTitle);
    if (existing) { existing.revenue += o.amount; existing.orders += 1; }
    else map.set(o.courseTitle, { courseTitle: o.courseTitle, revenue: o.amount, orders: 1 });
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export function averageOrderValue(orders: Order[]): number {
  const paid = orders.filter((o) => o.status === "paid");
  if (paid.length === 0) return 0;
  return Math.round((paid.reduce((a, o) => a + o.amount, 0) / paid.length) * 100) / 100;
}