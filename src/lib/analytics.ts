// Pure, READ-ONLY analytics derived from persisted LMS storage.
import {
  getOrders,
  getAdminUsers,
  getTeacherCourses,
  getEnrollments,
  courseProgress,
  type Order,
} from "./lms-storage";
import type { ProfileData } from "./lms-storage";
import { payments as seedPayments, courses as catalogCourses, users as seedUsers } from "./mock-data";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function resolvedOrders(): Order[] {
  const real = getOrders();
  if (real.length > 0) return real;
  return seedPayments.map((p, i) => {
    const course = catalogCourses[i % catalogCourses.length];
    return {
      id: `seed-${p.id}`,
      invoice: p.invoice,
      courseId: course.id,
      courseTitle: course.title,
      teacher: course.teacher,
      amount: p.amount,
      status:
        p.status === "Paid" ? "paid" : p.status === "Pending" ? "pending" : "failed",
      method: p.method,
      txId: `seed-${p.id}`,
      date: p.date,
      buyerName: p.user,
      buyerEmail: seedUsers.find((u) => u.name === p.user)?.email ?? "",
    } satisfies Order;
  });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function pctDelta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Safe fallback: never let a rejected/mistyped call blow up analytics. */
async function safeUsers(): Promise<ProfileData[]> {
  try {
    const list = await getAdminUsers();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function safeCourses(): Promise<any[]> {
  try {
    const list = await getTeacherCourses();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export type AdminKpis = {
  totalRevenue: number;
  revenueDelta: number;
  activeLearners: number;
  learnersDelta: number;
  publishedCourses: number;
  coursesDelta: number;
  completionRate: number;
};

export async function computeKpis(): Promise<AdminKpis> {
  const orders = resolvedOrders();
  const paid = orders.filter((o) => o.status === "paid");
  const totalRevenue = paid.reduce((sum, o) => sum + o.amount, 0);

  const revenueByMonth = new Map<string, number>();
  for (const o of paid) {
    const k = monthKey(o.date);
    revenueByMonth.set(k, (revenueByMonth.get(k) ?? 0) + o.amount);
  }
  const revMonths = [...revenueByMonth.keys()].sort();
  const revenueDelta =
    revMonths.length >= 2
      ? pctDelta(
          revenueByMonth.get(revMonths.at(-1)!)!,
          revenueByMonth.get(revMonths.at(-2)!)!,
        )
      : 0;

  const users = await safeUsers();
  // `profiles` has no `status` column — every returned row is an existing
  // account, so "active" just means "is a student" until a status field
  // is added to the schema.
  const students = users.filter((u) => u.role === "student");
  const activeLearners = students.length;

  const learnersByMonth = new Map<string, number>();
  for (const u of students) {
    if (!u.created_at) continue;
    const k = monthKey(u.created_at);
    learnersByMonth.set(k, (learnersByMonth.get(k) ?? 0) + 1);
  }
  const lMonths = [...learnersByMonth.keys()].sort();
  const learnersDelta =
    lMonths.length >= 2
      ? pctDelta(
          learnersByMonth.get(lMonths.at(-1)!)!,
          learnersByMonth.get(lMonths.at(-2)!)!,
        )
      : 0;

  const courses = await safeCourses();
  const published = courses.filter((c) => c.status === "Published");
  const publishedCourses = published.length;

  const coursesByMonth = new Map<string, number>();
  for (const c of published) {
    if (!c.updatedAt) continue;
    const k = monthKey(c.updatedAt);
    coursesByMonth.set(k, (coursesByMonth.get(k) ?? 0) + 1);
  }
  const cMonths = [...coursesByMonth.keys()].sort();
  const coursesDelta =
    cMonths.length >= 2
      ? pctDelta(
          coursesByMonth.get(cMonths.at(-1)!)!,
          coursesByMonth.get(cMonths.at(-2)!)!,
        )
      : 0;

  const enrolled = getEnrollments();
  const pcts = enrolled.map((id) => {
    const course =
      courses.find((c) => c.id === id) ?? catalogCourses.find((c) => c.id === id);
    return courseProgress(id, course?.lessons ?? 20).pct;
  });
  const completionRate = pcts.length
    ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    : 0;

  return {
    totalRevenue,
    revenueDelta,
    activeLearners,
    learnersDelta,
    publishedCourses,
    coursesDelta,
    completionRate,
  };
}

export type RevenuePoint = { month: string; revenue: number; signups: number };

export async function computeMonthlySeries(monthsBack = 12): Promise<RevenuePoint[]> {
  const orders = resolvedOrders().filter((o) => o.status === "paid");
  const users = await safeUsers();
  const students = users.filter((u) => u.role === "student");
  const now = new Date();

  const points: RevenuePoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const revenue = orders
      .filter((o) => monthKey(o.date) === key)
      .reduce((sum, o) => sum + o.amount, 0);
    const signups = students.filter((u) => u.created_at && monthKey(u.created_at) === key).length;
    points.push({ month: MONTH_LABELS[d.getMonth()], revenue, signups });
  }
  return points;
}

export type RecentPayment = {
  id: string;
  user: string;
  invoice: string;
  method: string;
  amount: number;
  status: "Paid" | "Failed" | "Pending";
};

export function recentPayments(limit = 6): RecentPayment[] {
  return resolvedOrders()
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit)
    .map((o) => ({
      id: o.id,
      user: o.buyerName,
      invoice: o.invoice,
      method: o.method,
      amount: o.amount,
      status: o.status === "paid" ? "Paid" : o.status === "failed" ? "Failed" : "Pending",
    }));
}

export async function recentUsers(limit = 6): Promise<ProfileData[]> {
  const users = await safeUsers();
  return users
    .slice()
    .sort((a, b) => ((a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1))
    .slice(0, limit);
}

export type UserPayment = {
  id: string;
  invoice: string;
  courseTitle: string;
  method: string;
  amount: number;
  status: "Paid" | "Failed" | "Pending";
  date: string;
};

export function paymentsForUser(email: string): UserPayment[] {
  const normalized = email.trim().toLowerCase();
  return resolvedOrders()
    .filter((o) => o.buyerEmail.toLowerCase() === normalized)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((o) => ({
      id: o.id,
      invoice: o.invoice,
      courseTitle: o.courseTitle,
      method: o.method,
      amount: o.amount,
      status: o.status === "paid" ? "Paid" : o.status === "failed" ? "Failed" : "Pending",
      date: o.date,
    }));
}

export async function coursesForTeacher(teacherName: string) {
  const courses = await safeCourses();
  return courses.filter((c) => c.teacher === teacherName);
}