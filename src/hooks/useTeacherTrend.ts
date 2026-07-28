import { useMemo } from "react";
import { useKeyedStorage } from "@/hooks/useKeyedStorage";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";

type OrderRecord = {
  id: string;
  courseId: string;
  amount: number;
  createdAt: string;
};

type EnrollmentRecord = {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
};

type MonthBucket = {
  key: string;
  month: string;
  signups: number;
  revenue: number;
};

const MONTHS_BACK = 6;

function monthLabel(d: Date) {
  return d.toLocaleString("en-US", { month: "short" });
}

function safeDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ⚠️ عدّل التوقيع حسب useKeyedStorage الحقيقي عندك (key, read) إلخ.
export function useTeacherTrend() {
  const courses = useTeacherCourses();
  const { data: ordersRaw } = useKeyedStorage<OrderRecord[]>("lms.orders", () => []);
  const { data: enrollmentsRaw } = useKeyedStorage<EnrollmentRecord[]>("lms.enrollments", () => []);

  const orders = ordersRaw ?? [];
  const enrollments = enrollmentsRaw ?? [];

  return useMemo(() => {
    const courseIds = new Set(courses.map((c) => c.id));
    const myOrders = orders.filter((o:any) => courseIds.has(o.courseId));
    const myEnrollments = enrollments.filter((e:any) => courseIds.has(e.courseId));

    const now = new Date();
    const buckets: MonthBucket[] = Array.from({ length: MONTHS_BACK }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: monthLabel(d),
        signups: 0,
        revenue: 0,
      };
    });
    const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

    for (const e of myEnrollments) {
      const d = safeDate(e.enrolledAt);
      if (!d) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = bucketByKey.get(key);
      if (b) b.signups += 1;
    }

    for (const o of myOrders) {
      const d = safeDate(o.createdAt);
      if (!d) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = bucketByKey.get(key);
      if (b) b.revenue += o.amount;
    }

    const last = buckets[buckets.length - 1];
    const prev = buckets[buckets.length - 2];

    const revenueDeltaPct = prev && prev.revenue > 0
      ? ((last.revenue - prev.revenue) / prev.revenue) * 100
      : 0;

    const signupsDeltaPct = prev && prev.signups > 0
      ? ((last.signups - prev.signups) / prev.signups) * 100
      : 0;

    const hasData = myOrders.length > 0 || myEnrollments.length > 0;

    return {
      chartData: buckets,
      revenueDeltaPct,
      signupsDeltaPct,
      hasData,
    };
  }, [courses, orders, enrollments]);
}