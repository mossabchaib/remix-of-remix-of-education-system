import { useEffect, useMemo, useState } from "react";
import {
  getOrders,
  getQuizzes,
  getAttempts,
  getActivity,
  getTeacherCourses,
  STORAGE_EVENT,
} from "@/lib/lms-storage";

export type CourseFilterValue = string | "all";

/** Re-renders whenever any lms-storage key changes (orders, quizzes, activity, courses...). */
function useStorageTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener(STORAGE_EVENT, handler);
    return () => window.removeEventListener(STORAGE_EVENT, handler);
  }, []);
}

export function useTeacherAnalytics(courseId: CourseFilterValue = "all") {
  useStorageTick();

  return useMemo(() => {
    const courses = getTeacherCourses();
    const paidOrders = getOrders().filter((o) => o.status === "paid");
    const quizzes = getQuizzes();
    const attempts = getAttempts();
    const activity = getActivity();

    const scopedCourses = courseId === "all" ? courses : courses.filter((c) => c.id === courseId);
    const scopedCourseTitles = new Set(scopedCourses.map((c) => c.title));

    /* ---- Revenue by month (real, from paid orders) ---- */
    const scopedOrders = courseId === "all" ? paidOrders : paidOrders.filter((o) => o.courseId === courseId);
    const revenueBuckets = new Map<string, { label: string; amount: number; sortKey: string }>();
    scopedOrders.forEach((o) => {
      const d = new Date(o.date);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      const cur = revenueBuckets.get(sortKey) ?? { label, amount: 0, sortKey };
      cur.amount += o.amount;
      revenueBuckets.set(sortKey, cur);
    });
    const revenueByMonth = Array.from(revenueBuckets.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((r) => ({ month: r.label, amount: r.amount }));
    const totalRevenue = scopedOrders.reduce((sum, o) => sum + o.amount, 0);

    /* ---- Quiz performance (real, from quizAttempts) ---- */
    const scopedQuizzes = courseId === "all" ? quizzes : quizzes.filter((q) => scopedCourseTitles.has(q.course));
    const quizPerformance = scopedQuizzes.map((q) => {
      const a = attempts[q.id];
      const scorePct = a ? Math.round((a.score / a.total) * 100) : 0;
      return {
        name: q.title.length > 18 ? q.title.slice(0, 16) + "…" : q.title,
        score: scorePct,
        attempted: !!a,
      };
    });
    const attemptedQuizzes = quizPerformance.filter((q) => q.attempted);
    const averageQuizScore = attemptedQuizzes.length
      ? Math.round(attemptedQuizzes.reduce((s, q) => s + q.score, 0) / attemptedQuizzes.length)
      : 0;

    /* ---- Engagement trend (real, from activity log — lesson completions) ---- */
    const scopedLessonActivity = activity.filter((a) => {
      if (a.kind !== "lesson") return false;
      if (courseId === "all") return true;
      return a.refId?.startsWith(`${courseId}/`) ?? false;
    });
    const dayBuckets = new Map<string, { label: string; count: number; sortKey: string }>();
    scopedLessonActivity.forEach((a) => {
      const d = new Date(a.at);
      const sortKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const cur = dayBuckets.get(sortKey) ?? { label, count: 0, sortKey };
      cur.count += 1;
      dayBuckets.set(sortKey, cur);
    });
    const engagementTrend = Array.from(dayBuckets.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-14)
      .map((d) => ({ day: d.label, lessons: d.count }));

    return {
      revenueByMonth,
      totalRevenue,
      quizPerformance,
      averageQuizScore,
      engagementTrend,
      courseOptions: courses.map((c) => ({ id: c.id, title: c.title })),
    };
  }, [courseId]);
}