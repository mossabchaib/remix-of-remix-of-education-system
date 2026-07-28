import { useMemo } from "react";
import { useKeyedStorage } from "@/hooks/useKeyedStorage";
import { categories as categoryMeta } from "@/lib/mock-data";
import { readJSON, storageKeys } from "@/lib/lms-storage";

export type DateRangeKey = "7d" | "30d" | "90d" | "all";

type Order = {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  status: "paid" | "refunded" | "pending";
  createdAt: string;
};

type AdminUser = { id: string; name: string; email: string; role: string; createdAt: string };

type Course = { id: string; title: string; category: string; teacherId: string; price: number; createdAt: string };

type Enrollment = {
  id: string;
  userId: string;
  courseId: string;
  progress: number; // 0-100
  completedAt?: string;
  createdAt: string;
};

function rangeToDate(range: DateRangeKey): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

export function useReportsData(range: DateRangeKey = "30d") {
  // ✅ التصحيح: تمرير دالة () => readJSON(...) كمعامل ثاني
  const orders = useKeyedStorage<Order[]>(
    storageKeys.orders,
    () => readJSON(storageKeys.orders, [])
  );
  
  const users = useKeyedStorage<AdminUser[]>(
    storageKeys.adminUsers,
    () => readJSON(storageKeys.adminUsers, [])
  );
  
  const courses = useKeyedStorage<Course[]>(
    storageKeys.teacherCourses,
    () => readJSON(storageKeys.teacherCourses, [])
  );
  
  const enrollments = useKeyedStorage<Enrollment[]>(
    storageKeys.enrollments,
    () => readJSON(storageKeys.enrollments, [])
  );

  return useMemo(() => {
    const since = rangeToDate(range);

    const inRange = (iso: string) => (since ? new Date(iso) >= since : true);

    const filteredOrders = (orders || []).filter((o) => inRange(o.createdAt));
    const filteredEnrollments = (enrollments || []).filter((e) => inRange(e.createdAt));

    // KPIs
    const revenue = filteredOrders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + o.amount, 0);

    const enrollmentsCount = filteredEnrollments.length;

    const completions = filteredEnrollments.filter(
      (e) => e.completedAt || e.progress >= 100
    ).length;

    // مقارنة بالفترة السابقة لحساب delta%
    const prevSince = (() => {
      if (!since) return null;
      const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
      const d = new Date(since);
      d.setDate(d.getDate() - days);
      return d;
    })();

    const prevOrders = prevSince
      ? (orders || []).filter(
          (o) =>
            new Date(o.createdAt) >= prevSince &&
            new Date(o.createdAt) < (since as Date) &&
            o.status === "paid"
        )
      : [];
    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.amount, 0);
    const revenueDelta = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    const prevEnrollments = prevSince
      ? (enrollments || []).filter(
          (e) => new Date(e.createdAt) >= prevSince && new Date(e.createdAt) < (since as Date)
        ).length
      : 0;
    const enrollmentsDelta =
      prevEnrollments > 0 ? ((enrollmentsCount - prevEnrollments) / prevEnrollments) * 100 : 0;

    const prevCompletions = prevSince
      ? (enrollments || []).filter(
          (e) =>
            new Date(e.createdAt) >= prevSince &&
            new Date(e.createdAt) < (since as Date) &&
            (e.completedAt || e.progress >= 100)
        ).length
      : 0;
    const completionsDelta =
      prevCompletions > 0 ? ((completions - prevCompletions) / prevCompletions) * 100 : 0;

    // Revenue vs Signups بالشهر (Line Chart)
    const seriesMap = new Map<string, { month: string; revenue: number; signups: number }>();
    filteredOrders
      .filter((o) => o.status === "paid")
      .forEach((o) => {
        const key = monthKey(o.createdAt);
        const entry = seriesMap.get(key) || { month: key, revenue: 0, signups: 0 };
        entry.revenue += o.amount;
        seriesMap.set(key, entry);
      });
    filteredEnrollments.forEach((e) => {
      const key = monthKey(e.createdAt);
      const entry = seriesMap.get(key) || { month: key, revenue: 0, signups: 0 };
      entry.signups += 1;
      seriesMap.set(key, entry);
    });
    const revenueSeries = Array.from(seriesMap.values()).sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
    );

    // Courses by category (Pie + Bar)
    const courseCategoryMap = new Map((courses || []).map((c) => [c.id, c.category]));
    const enrollmentCountByCategory = new Map<string, number>();
    filteredEnrollments.forEach((e) => {
      const cat = courseCategoryMap.get(e.courseId) ?? "Other";
      enrollmentCountByCategory.set(cat, (enrollmentCountByCategory.get(cat) ?? 0) + 1);
    });

    const categoryColorMap = new Map(categoryMeta.map((c) => [c.name, c.color]));
    const categoriesData = Array.from(enrollmentCountByCategory.entries()).map(([name, value]) => ({
      name,
      value,
      color: categoryColorMap.get(name) ?? "var(--primary)",
    }));

    // Avg session
    const avgProgress =
      filteredEnrollments.length > 0
        ? filteredEnrollments.reduce((sum, e) => sum + e.progress, 0) / filteredEnrollments.length
        : 0;

    return {
      kpis: {
        revenue,
        revenueDelta,
        enrollments: enrollmentsCount,
        enrollmentsDelta,
        completions,
        completionsDelta,
        avgProgress: Math.round(avgProgress),
      },
      revenueSeries,
      categoriesData,
      rawOrders: filteredOrders,
      totalUsers: (users || []).length,
      totalCourses: (courses || []).length,
    };
  }, [orders, users, courses, enrollments, range]);
}