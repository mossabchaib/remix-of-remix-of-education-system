// Pure, READ-ONLY analytics derived from persisted LMS storage.
// This module never writes to storage — it only reads via the existing
// lms-storage getters and shapes numbers for the Admin Overview page.
// (Per project rules: reads flow through hooks/computation helpers,
// writes stay exclusively inside lms-storage + Services.)
import {
  getOrders,
  getAdminUsers,
  getTeacherCourses,
  getEnrollments,
  courseProgress,
  type Order,
} from "./lms-storage";
import { payments as seedPayments, courses as catalogCourses, users as seedUsers } from "./mock-data";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * `lms.orders` defaults to an EMPTY array (see lms-storage.getOrders()).
 * Until the checkout flow produces real orders (addOrder), the Admin
 * Overview would show all zeros. We fall back to a deterministic seed
 * built from the existing `payments` mock so the dashboard isn't blank
 * on first load. Real orders take over automatically the moment they
 * exist, since `real.length > 0` short-circuits the seed.
 */
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
      // `payments` and `users` in mock-data are generated from the same
      // `names` pool, so this lookup reliably resolves a real seeded email.
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

export type AdminKpis = {
  totalRevenue: number;
  revenueDelta: number;
  activeLearners: number;
  learnersDelta: number;
  publishedCourses: number;
  coursesDelta: number;
  /** Approximate — see note in computeKpis(). */
  completionRate: number;
};

export function computeKpis(): AdminKpis {
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

  const users = getAdminUsers();
  const students = users.filter((u) => u.role === "Student");
  const activeLearners = students.filter((u) => u.status === "Active").length;

  const learnersByMonth = new Map<string, number>();
  for (const u of students) {
    const k = monthKey(u.joined);
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

  const courses = getTeacherCourses();
  const published = courses.filter((c) => c.status === "Published");
  const publishedCourses = published.length;

  const coursesByMonth = new Map<string, number>();
  for (const c of published) {
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

  // NOTE (important limitation, be transparent with the user about this):
  // This app has no backend, so there is no cross-user progress table —
  // `lms.progress` only tracks the CURRENT BROWSER's learner. A true
  // platform-wide completion rate is not derivable client-side. We
  // approximate it from the current session's enrolled-course progress.
  // Replace with a real aggregate once a backend/API exists.
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

export function computeMonthlySeries(monthsBack = 12): RevenuePoint[] {
  const orders = resolvedOrders().filter((o) => o.status === "paid");
  const students = getAdminUsers().filter((u) => u.role === "Student");
  const now = new Date();

  const points: RevenuePoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const revenue = orders
      .filter((o) => monthKey(o.date) === key)
      .reduce((sum, o) => sum + o.amount, 0);
    const signups = students.filter((u) => monthKey(u.joined) === key).length;
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

export function recentUsers(limit = 6) {
  return getAdminUsers()
    .slice()
    .sort((a, b) => (a.joined < b.joined ? 1 : -1))
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

/** All orders placed by a given user, newest first. Used on the Admin
 * User Detail page — matched by email since `Order` has no `userId`. */
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

/** Courses authored by a given teacher (matched by name, since Course
 * has no teacherId — mirrors how `teacher` is stored elsewhere). Used
 * on the Admin User Detail page when the user's role is "Teacher". */
export function coursesForTeacher(teacherName: string) {
  return getTeacherCourses().filter((c) => c.teacher === teacherName);
}