// Derived teacher statistics — everything is computed from lms-storage state.
import {
  getTeacherCourses,
  getQuizzes,
  getAssignments,
  getLiveSessions,
  getOrders,
  getAttempts,
  getProgress,
  resolvedModules,
  getAdminUsers,
} from "./lms-storage";
import type { Course } from "./mock-data";

export type TeacherStats = {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  archivedCourses: number;
  totalLessons: number;
  totalQuizzes: number;
  totalAssignments: number;
  totalLiveSessions: number;
  totalStudents: number;
  activeStudents: number;
  totalEnrollments: number;
  totalRevenue: number;
  simulatedRevenue: number;
  realOrdersRevenue: number;
  completionRate: number;
  averageRating: number;
  averageQuizScore: number;
};

export function computeTeacherStats(): TeacherStats {
  // حماية البيانات وجعلها مصفوفات آمنة دائماً لمنع أخطاء الـ reduce
  const rawCourses = getTeacherCourses();
  const courses: Course[] = Array.isArray(rawCourses) ? rawCourses : [];
  
  const quizzes = Array.isArray(getQuizzes()) ? getQuizzes() : [];
  const assignments = Array.isArray(getAssignments()) ? getAssignments() : [];
  const live = Array.isArray(getLiveSessions()) ? getLiveSessions() : [];
  
  const ordersList = Array.isArray(getOrders()) ? getOrders() : [];
  const orders = ordersList.filter((o) => o?.status === "paid");
  
  const attemptsObj = getAttempts() || {};
  const attempts = Object.values(attemptsObj);
  
  const progress = getProgress() || {};
  
  const adminUsers = Array.isArray(getAdminUsers()) ? getAdminUsers() : [];
  const students = adminUsers.filter((u) => u?.role === "Student");

  const totalLessons = courses.reduce(
    (a, c) => a + (resolvedModules(c?.id) || []).reduce((n, m) => n + (m?.lessons?.length || 0), 0),
    0,
  );
  const simulatedRevenue = courses.reduce((a, c) => a + (c?.price || 0) * (c?.students || 0), 0);
  const realOrdersRevenue = orders.reduce((a, o) => a + (o?.amount || 0), 0);
  const totalEnrollments = courses.reduce((a, c) => a + (c?.students || 0), 0) + orders.length;
  
  const completedLessons = Object.values(progress).reduce(
    (a, m) => a + Object.values(m || {}).filter(Boolean).length,
    0,
  );
  const completionRate = totalLessons
    ? Math.round((completedLessons / Math.max(totalLessons, 1)) * 100)
    : 0;
    
  const ratingSum = courses.reduce((a, c) => a + (c?.rating || 0), 0);
  const rated = courses.filter((c) => (c?.rating || 0) > 0).length;
  const averageRating = rated ? ratingSum / rated : 0;
  
  const scoreSum = attempts.reduce((a, x) => a + (x?.total ? x.score / x.total : 0), 0);
  const averageQuizScore = attempts.length
    ? Math.round((scoreSum / attempts.length) * 100)
    : 0;

  return {
    totalCourses: courses.length,
    publishedCourses: courses.filter((c) => c?.status === "Published").length,
    draftCourses: courses.filter((c) => c?.status === "Draft").length,
    archivedCourses: courses.filter((c) => c?.status === "Archived").length,
    totalLessons,
    totalQuizzes: quizzes.length,
    totalAssignments: assignments.length,
    totalLiveSessions: live.length,
    totalStudents: students.length,
    activeStudents: students.filter((s) => s?.status === "Active").length,
    totalEnrollments,
    totalRevenue: simulatedRevenue + realOrdersRevenue,
    simulatedRevenue,
    realOrdersRevenue,
    completionRate,
    averageRating,
    averageQuizScore,
  };
}

/** Students derived from paid orders + seeded admin students, deduped. */
export function derivedStudents() {
  const ordersList = Array.isArray(getOrders()) ? getOrders() : [];
  const orders = ordersList.filter((o) => o?.status === "paid");
  
  const adminUsers = Array.isArray(getAdminUsers()) ? getAdminUsers() : [];
  const seeded = adminUsers.filter((u) => u?.role === "Student");
  
  const map = new Map<string, {
    id: string; name: string; email: string; status: "Active" | "Pending" | "Suspended";
    joined: string; enrolled: number; spent: number;
  }>();
  
  for (const s of seeded) {
    if (!s?.email) continue;
    map.set(s.email.toLowerCase(), {
      id: s.id, name: s.name, email: s.email, status: s.status,
      joined: s.joined, enrolled: 0, spent: 0,
    });
  }
  
  for (const o of orders) {
    if (!o?.buyerEmail) continue;
    const key = o.buyerEmail.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.enrolled += 1;
      existing.spent += o.amount || 0;
    } else {
      map.set(key, {
        id: `stu-${key}`, name: o.buyerName, email: o.buyerEmail, status: "Active",
        joined: (o.date || "").slice(0, 10), enrolled: 1, spent: o.amount || 0,
      });
    }
  }
  return Array.from(map.values());
}

/** Per-course teacher progress rollup, derived from student progress storage. */
export function courseProgressRollup(courses: Course[]) {
  const safeCourses = Array.isArray(courses) ? courses : [];
  const progress = getProgress() || {};
  
  return safeCourses.map((c) => {
    const mods = resolvedModules(c?.id) || [];
    const totalLessons = mods.reduce((n, m) => n + (m?.lessons?.length || 0), 0);
    const done = Object.values(progress[c?.id] ?? {}).filter(Boolean).length;
    const pct = totalLessons ? Math.round((done / totalLessons) * 100) : 0;
    return { course: c, done, totalLessons, pct };
  });
}