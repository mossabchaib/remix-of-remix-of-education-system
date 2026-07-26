// Frontend-only LMS persistence + rich mock data. Everything lives in localStorage.
import { courses as baseCourses, students as baseStudents, categories as baseCategories, users as baseUsers, type Category, type Course, type User } from "./mock-data";

const K = {
  enrollments: "lms.enrollments",
  progress: "lms.progress",
  wishlist: "lms.wishlist",
  quizAttempts: "lms.quizAttempts",
  notifications: "lms.notifications",
  profile: "lms.profile",
  settings: "lms.settings",
  teacherCourses: "lms.teacher.courses",
  teacherModules: "lms.teacher.modules",
  teacherQuizzes: "lms.teacher.quizzes",
  teacherUploads: "lms.teacher.uploads",
  teacherAssignments: "lms.teacher.assignments",
  teacherLive: "lms.teacher.live",
  adminCategories: "lms.admin.categories",
  adminUsers: "lms.admin.users",
  orders: "lms.orders",
  checkout: "lms.checkout",
  lastAccessed: "lms.lastAccessed",
  notes: "lms.notes",
  submissions: "lms.submissions",
  certificates: "lms.certificates",
  activity: "lms.activity",
};

export const STORAGE_EVENT = "lms:storage-change";
function emit(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }));
}

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const storageKeys = K;

/* ============ Enrollments ============ */
export function getEnrollments(): string[] {
  return readJSON(K.enrollments, baseCourses.slice(0, 6).map((c) => c.id));
}
export function setEnrollments(ids: string[]) { writeJSON(K.enrollments, ids); emit(K.enrollments); }
export function toggleEnrollment(id: string) {
  const cur = getEnrollments();
  const wasEnrolled = cur.includes(id);
  const next = wasEnrolled ? cur.filter((x) => x !== id) : [...cur, id];
  setEnrollments(next);
  if (!wasEnrolled) {
    logActivity({ kind: "enroll", label: "Enrolled in a new course", refId: id });
    addNotification({ title: "Course enrolled", body: "A new course has been added to My Courses.", kind: "course" });
  }
  return next;
}

/* ============ Wishlist ============ */
export function getWishlist(): string[] {
  return readJSON(K.wishlist, baseCourses.slice(6, 10).map((c) => c.id));
}
export function setWishlist(ids: string[]) { writeJSON(K.wishlist, ids); emit(K.wishlist); }
export function toggleWishlist(id: string) {
  const cur = getWishlist();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  setWishlist(next);
  return next;
}

/* ============ Progress ============ */
export type Progress = Record<string, Record<string, boolean>>;
export function getProgress(): Progress { return readJSON(K.progress, {}); }
export function setLessonComplete(courseId: string, lessonId: string, done: boolean) {
  const p = getProgress();
  const before = p[courseId]?.[lessonId];
  p[courseId] = p[courseId] ?? {};
  if (done) p[courseId][lessonId] = true;
  else delete p[courseId][lessonId];
  writeJSON(K.progress, p);
  emit(K.progress);
  if (done && !before) logActivity({ kind: "lesson", label: "Completed a lesson", refId: `${courseId}/${lessonId}` });
}
export function courseProgress(courseId: string, totalLessons: number) {
  const p = getProgress()[courseId] ?? {};
  const done = Object.values(p).filter(Boolean).length;
  return { done, total: totalLessons, pct: totalLessons ? Math.round((done / totalLessons) * 100) : 0 };
}

/* ============ Quiz attempts ============ */
export type QuizAttempt = { score: number; total: number; at: string; answers: number[] };
export function getAttempts(): Record<string, QuizAttempt> { return readJSON(K.quizAttempts, {}); }
export function saveAttempt(id: string, a: QuizAttempt) {
  const all = getAttempts();
  all[id] = a;
  writeJSON(K.quizAttempts, all);
  emit(K.quizAttempts);
  logActivity({ kind: "quiz", label: `Quiz submitted · ${a.score}/${a.total}`, refId: id });
}

/* ============ Notifications ============ */
export type NotifKind =
  | "course" | "quiz" | "live" | "system"
  | "assignment" | "resource" | "lesson" | "announcement";
export type NotifAudience =
  | { scope: "all" }
  | { scope: "role"; role: "student" | "teacher" | "admin" }
  | { scope: "course"; courseId: string }
  | { scope: "user"; userId: string };
export type Notif = {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  kind: NotifKind;
  audience: NotifAudience;
  courseId?: string;
  link?: string;
  sourceId?: string;
  createdBy?: { name: string; role: "student" | "teacher" | "admin" } | null;
};
const defaultNotifs: Notif[] = [
  { id: "n1", title: "New lesson available", body: "Module 3 · Advanced Hooks is now live in Modern React Patterns.", at: "2h ago", read: false, kind: "lesson", audience: { scope: "role", role: "student" } },
  { id: "n2", title: "Live session in 30 min", body: "Design Systems Mastery with Amelia Carter starts soon.", at: "Today", read: false, kind: "live", audience: { scope: "role", role: "student" } },
  { id: "n3", title: "Quiz graded", body: "You scored 9/10 in TypeScript Fundamentals.", at: "Yesterday", read: true, kind: "quiz", audience: { scope: "role", role: "student" } },
  { id: "n4", title: "Certificate ready", body: "Your certificate for SQL for Analysts is available.", at: "3 days ago", read: true, kind: "system", audience: { scope: "role", role: "student" } },
  { id: "n5", title: "Assignment due tomorrow", body: "Submit Project 2 before 11:59 PM.", at: "3 days ago", read: false, kind: "assignment", audience: { scope: "role", role: "student" } },
];
function normalizeNotif(n: Notif): Notif {
  return n.audience ? n : { ...n, audience: { scope: "role", role: "student" } };
}
export function getNotifications(): Notif[] {
  return readJSON<Notif[]>(K.notifications, defaultNotifs).map(normalizeNotif);
}
export function setNotifications(n: Notif[]) { writeJSON(K.notifications, n); emit(K.notifications); }
export function markNotificationRead(id: string, read = true) {
  setNotifications(getNotifications().map((n) => (n.id === id ? { ...n, read } : n)));
}
export function markAllNotificationsRead() {
  setNotifications(getNotifications().map((n) => ({ ...n, read: true })));
}
/** Add a notification. Deduped by sourceId when supplied. */
export function addNotification(n: Omit<Notif, "id" | "at" | "read" | "audience"> & { audience?: NotifAudience }): Notif | null {
  const existing = getNotifications();
  if (n.sourceId && existing.some((x) => x.sourceId === n.sourceId)) return null;
  const notif: Notif = {
    ...n,
    id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    at: "just now",
    read: false,
    audience: n.audience ?? { scope: "role", role: "student" },
  };
  setNotifications([notif, ...existing]);
  return notif;
}
export function deleteNotification(id: string) {
  setNotifications(getNotifications().filter((n) => n.id !== id));
}
export function notificationsFor(ctx: {
  role: "student" | "teacher" | "admin" | null;
  userId?: string | null;
  enrollments?: string[];
}): Notif[] {
  const enrol = ctx.enrollments ?? [];
  return getNotifications().filter((n) => {
    const a = n.audience;
    if (!a || a.scope === "all") return true;
    if (a.scope === "role") return ctx.role === a.role;
    if (a.scope === "course") return enrol.includes(a.courseId);
    if (a.scope === "user") return !!ctx.userId && ctx.userId === a.userId;
    return false;
  });
}

/* ============ Course structure (lessons/modules) ============ */
export type Lesson = { id: string; title: string; duration: string; kind: "video" | "reading" | "quiz" };
export type Module = { id: string; title: string; lessons: Lesson[] };
const lessonNames = [
  "Introduction & setup", "Core concepts", "Hands-on workshop", "Deep dive walkthrough",
  "Common pitfalls", "Best practices", "Real-world case study", "Wrap-up & next steps",
];
const moduleTitles = ["Foundations", "Applied practice", "Advanced patterns", "Capstone project"];
export function modulesForCourse(courseId: string, count = 4): Module[] {
  return Array.from({ length: count }).map((_, mi) => ({
    id: `${courseId}-m${mi + 1}`,
    title: `Module ${mi + 1} · ${moduleTitles[mi % moduleTitles.length]}`,
    lessons: Array.from({ length: 5 }).map((_, li) => {
      const idx = mi * 5 + li;
      const kind: Lesson["kind"] = li === 4 ? "quiz" : li === 2 ? "reading" : "video";
      return {
        id: `${courseId}-m${mi + 1}-l${li + 1}`,
        title: lessonNames[idx % lessonNames.length],
        duration: kind === "quiz" ? "10 questions" : kind === "reading" ? "8 min read" : `${8 + ((idx * 7) % 15)} min`,
        kind,
      };
    }),
  }));
}
export function flatLessons(courseId: string) {
  return modulesForCourse(courseId).flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
}

/* ============ PDF resources ============ */
export const pdfResources = [
  { id: "r1", title: "React Hooks Cheat Sheet", course: "Modern React Patterns", size: "1.2 MB", pages: 6, updatedAt: "2026-06-12" },
  { id: "r2", title: "TypeScript Generics Guide", course: "TypeScript from Zero to Hero", size: "820 KB", pages: 4, updatedAt: "2026-06-08" },
  { id: "r3", title: "Design Tokens Reference", course: "Design Systems Mastery", size: "2.4 MB", pages: 18, updatedAt: "2026-05-30" },
  { id: "r4", title: "SQL Window Functions", course: "SQL for Analysts", size: "640 KB", pages: 5, updatedAt: "2026-05-22" },
  { id: "r5", title: "Kubernetes Deployment Recipes", course: "Docker & Kubernetes", size: "1.8 MB", pages: 12, updatedAt: "2026-05-14" },
  { id: "r6", title: "ML Model Evaluation", course: "Machine Learning Foundations", size: "1.1 MB", pages: 9, updatedAt: "2026-05-02" },
];

/* ============ Quizzes ============ */
export type Question = { id: string; text: string; options: string[]; answer: number };
export type Quiz = { id: string; title: string; course: string; questions: Question[]; minutes: number };
const defaultQuizzes: Quiz[] = [
  { id: "q1", title: "React Hooks — Basics", course: "Modern React Patterns", minutes: 10, questions: [
    { id: "q1a", text: "Which hook manages local component state?", options: ["useEffect", "useState", "useMemo", "useRef"], answer: 1 },
    { id: "q1b", text: "useEffect callbacks run…", options: ["Before render", "During render", "After commit", "Never"], answer: 2 },
    { id: "q1c", text: "useMemo is used to…", options: ["Cache callbacks", "Cache derived values", "Trigger effects", "Read refs"], answer: 1 },
    { id: "q1d", text: "Custom hook names must start with…", options: ["get", "use", "on", "with"], answer: 1 },
    { id: "q1e", text: "The rules of hooks require calling them…", options: ["Anywhere", "Inside loops", "At the top level", "In classes"], answer: 2 },
  ]},
  { id: "q2", title: "TypeScript Fundamentals", course: "TypeScript from Zero to Hero", minutes: 12, questions: [
    { id: "q2a", text: "Which is a valid tuple type?", options: ["[string, number]", "{string, number}", "(string, number)", "<string, number>"], answer: 0 },
    { id: "q2b", text: "`readonly` on an array…", options: ["Freezes at runtime", "Blocks mutation at type level", "Removes methods", "Deep clones"], answer: 1 },
    { id: "q2c", text: "`keyof T` returns…", options: ["Values of T", "Keys of T", "Type of T", "Length of T"], answer: 1 },
    { id: "q2d", text: "`as const` narrows values to…", options: ["string", "readonly literal types", "any", "unknown"], answer: 1 },
  ]},
  { id: "q3", title: "SQL — Aggregates & Joins", course: "SQL for Analysts", minutes: 15, questions: [
    { id: "q3a", text: "INNER JOIN returns…", options: ["All rows in both", "Matching rows only", "Left rows only", "Right rows only"], answer: 1 },
    { id: "q3b", text: "GROUP BY is used with…", options: ["Aggregations", "Sub-queries only", "Views", "Indexes"], answer: 0 },
    { id: "q3c", text: "HAVING filters…", options: ["Rows before grouping", "Grouped rows", "Columns", "Indexes"], answer: 1 },
  ]},
];
export function getQuizzes(): Quiz[] { return readJSON(K.teacherQuizzes, defaultQuizzes); }
export function setQuizzes(q: Quiz[]) { writeJSON(K.teacherQuizzes, q); emit(K.teacherQuizzes); }
export function getQuiz(id: string): Quiz | undefined { return getQuizzes().find((q) => q.id === id); }
export function upsertQuiz(q: Quiz) {
  const all = getQuizzes();
  const idx = all.findIndex((x) => x.id === q.id);
  if (idx === -1) all.unshift(q); else all[idx] = q;
  setQuizzes(all);
}
export function deleteQuiz(id: string) { setQuizzes(getQuizzes().filter((q) => q.id !== id)); }
/** Backward-compat: static snapshot for pages that haven't migrated to reactive reads. */
export const quizzes = defaultQuizzes;

/* ============ Assignments ============ */
export type Assignment = { id: string; title: string; course: string; due: string; status: "Pending" | "Submitted" | "Graded"; grade?: string };
const defaultAssignments: Assignment[] = [
  { id: "a1", title: "Build a component library", course: "Design Systems Mastery", due: "2026-08-05", status: "Pending" },
  { id: "a2", title: "Analyze the Northwind dataset", course: "SQL for Analysts", due: "2026-08-02", status: "Submitted" },
  { id: "a3", title: "Refactor to hooks", course: "Modern React Patterns", due: "2026-07-30", status: "Graded", grade: "A" },
  { id: "a4", title: "ML pipeline write-up", course: "Machine Learning Foundations", due: "2026-08-12", status: "Pending" },
  { id: "a5", title: "Kubernetes rollout plan", course: "Docker & Kubernetes", due: "2026-08-15", status: "Pending" },
  { id: "a6", title: "Design tokens audit", course: "Design Systems Mastery", due: "2026-08-20", status: "Pending" },
];
export function getAssignments(): Assignment[] { return readJSON(K.teacherAssignments, defaultAssignments); }
export function setAssignmentsList(a: Assignment[]) { writeJSON(K.teacherAssignments, a); emit(K.teacherAssignments); }
export function upsertAssignment(a: Assignment) {
  const all = getAssignments();
  const idx = all.findIndex((x) => x.id === a.id);
  if (idx === -1) all.unshift(a); else all[idx] = a;
  setAssignmentsList(all);
}
export function deleteAssignment(id: string) { setAssignmentsList(getAssignments().filter((a) => a.id !== id)); }
export const assignments = defaultAssignments;

/* ============ Live sessions ============ */
export type LiveSession = { id: string; title: string; course: string; host: string; startsAt: string; duration: string; attendees: number };
const defaultLive: LiveSession[] = [
  { id: "l1", title: "Office hours — React", course: "Modern React Patterns", host: "Amelia Carter", startsAt: "2026-07-27 18:00", duration: "60 min", attendees: 84 },
  { id: "l2", title: "Design critique workshop", course: "Design Systems Mastery", host: "Olivia Reyes", startsAt: "2026-07-28 16:30", duration: "90 min", attendees: 42 },
  { id: "l3", title: "SQL Q&A", course: "SQL for Analysts", host: "Mateo Alvarez", startsAt: "2026-07-30 19:00", duration: "45 min", attendees: 61 },
  { id: "l4", title: "K8s hands-on lab", course: "Docker & Kubernetes", host: "Henry Larsen", startsAt: "2026-08-02 17:00", duration: "120 min", attendees: 118 },
  { id: "l5", title: "ML paper reading club", course: "Machine Learning Foundations", host: "Sofia Patel", startsAt: "2026-08-05 20:00", duration: "60 min", attendees: 37 },
];
export function getLiveSessions(): LiveSession[] { return readJSON(K.teacherLive, defaultLive); }
export function setLiveSessionsList(l: LiveSession[]) { writeJSON(K.teacherLive, l); emit(K.teacherLive); }
export function upsertLiveSession(l: LiveSession) {
  const all = getLiveSessions();
  const idx = all.findIndex((x) => x.id === l.id);
  if (idx === -1) all.unshift(l); else all[idx] = l;
  setLiveSessionsList(all);
}
export function deleteLiveSession(id: string) { setLiveSessionsList(getLiveSessions().filter((l) => l.id !== id)); }
export const liveSessions = defaultLive;


/* ============ Certificates (see Issued certificates section below) ============ */

/* ============ Profile / preferences ============ */
export type ProfileData = {
  name: string;
  email: string;
  bio: string;
  timezone: string;
  language: string;
  avatarInitials: string;
};
export function getProfile(): ProfileData {
  return readJSON(K.profile, {
    name: "Alex Morgan",
    email: "alex@example.com",
    bio: "Curious learner building products at the intersection of design and code.",
    timezone: "GMT+1 · Amsterdam",
    language: "English",
    avatarInitials: "AM",
  });
}
export function setProfile(p: ProfileData) { writeJSON(K.profile, p); }

export type PreferencesData = {
  emailUpdates: boolean;
  weeklyDigest: boolean;
  liveReminders: boolean;
  darkMode: boolean;
  autoplay: boolean;
  captions: boolean;
};
export function getPreferences(): PreferencesData {
  return readJSON(K.settings, {
    emailUpdates: true, weeklyDigest: true, liveReminders: true, darkMode: false, autoplay: true, captions: false,
  });
}
export function setPreferences(p: PreferencesData) { writeJSON(K.settings, p); }

export { baseCourses, baseStudents };

/* ============ Admin: categories with images (persisted) ============ */
export function getAdminCategories(): Category[] {
  return readJSON(K.adminCategories, baseCategories);
}
export function setAdminCategories(list: Category[]) {
  writeJSON(K.adminCategories, list);
}

/* ============ Orders / purchase flow ============ */
export type Order = {
  id: string;
  invoice: string;
  courseId: string;
  courseTitle: string;
  teacher: string;
  amount: number;
  status: "paid" | "failed" | "pending";
  method: string;
  cardLast4?: string;
  txId: string;
  date: string; // ISO date
  buyerName: string;
  buyerEmail: string;
};
export function getOrders(): Order[] { return readJSON(K.orders, []); }
export function getOrder(id: string): Order | undefined {
  return getOrders().find((o) => o.id === id);
}
export function addOrder(o: Order) {
  const all = getOrders();
  all.unshift(o);
  writeJSON(K.orders, all);
  emit(K.orders);
  logActivity({ kind: "purchase", label: `Purchased ${o.courseTitle}`, refId: o.id });
  addNotification({ title: "Purchase confirmed", body: `${o.courseTitle} · ${o.invoice}`, kind: "system" });
}
export type CheckoutDraft = {
  courseId: string;
  method: "Card" | "PayPal";
  cardLast4?: string;
  cardName?: string;
};
export function setCheckout(d: CheckoutDraft) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(K.checkout, JSON.stringify(d));
}
export function getCheckout(): CheckoutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(K.checkout);
    return raw ? (JSON.parse(raw) as CheckoutDraft) : null;
  } catch { return null; }
}
export function clearCheckout() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(K.checkout);
}
export function generateOrderId() {
  return "ord_" + Math.random().toString(36).slice(2, 10);
}
export function generateInvoice() {
  return "INV-" + String(Date.now()).slice(-8);
}
export function generateTxId() {
  return "txn_" + Math.random().toString(36).slice(2, 12).toUpperCase();
}

/* ============ Admin Users (persisted, single source of truth) ============ */
export function getAdminUsers(): User[] {
  return readJSON(K.adminUsers, baseUsers);
}
export function setAdminUsers(list: User[]) { writeJSON(K.adminUsers, list); emit(K.adminUsers); }
export function getAdminUser(id: string): User | undefined {
  return getAdminUsers().find((u) => u.id === id);
}
export function upsertAdminUser(u: User) {
  const all = getAdminUsers();
  const idx = all.findIndex((x) => x.id === u.id);
  if (idx === -1) all.unshift(u); else all[idx] = { ...all[idx], ...u };
  setAdminUsers(all);
}
export function deleteAdminUser(id: string) {
  setAdminUsers(getAdminUsers().filter((u) => u.id !== id));
}

/* ============ Teacher Courses (persisted) ============ */
export function getTeacherCourses(): Course[] {
  return readJSON(K.teacherCourses, baseCourses.slice(0, 12));
}
export function setTeacherCourses(list: Course[]) { writeJSON(K.teacherCourses, list); emit(K.teacherCourses); }
export function getTeacherCourse(id: string): Course | undefined {
  return getTeacherCourses().find((c) => c.id === id);
}
export function upsertTeacherCourse(c: Course) {
  const all = getTeacherCourses();
  const idx = all.findIndex((x) => x.id === c.id);
  if (idx === -1) all.unshift(c); else all[idx] = { ...all[idx], ...c };
  setTeacherCourses(all);
}
export function deleteTeacherCourse(id: string) {
  setTeacherCourses(getTeacherCourses().filter((c) => c.id !== id));
}

/* ============ Teacher Modules override (persisted per course) ============ */
export function getStoredModules(courseId: string): Module[] | null {
  const all = readJSON<Record<string, Module[]>>(K.teacherModules, {});
  return all[courseId] ?? null;
}
export function setStoredModules(courseId: string, mods: Module[]) {
  const all = readJSON<Record<string, Module[]>>(K.teacherModules, {});
  all[courseId] = mods;
  writeJSON(K.teacherModules, all);
  emit(K.teacherModules);
}
export function resolvedModules(courseId: string): Module[] {
  return getStoredModules(courseId) ?? modulesForCourse(courseId);
}

/* ============ Teacher Uploads (persisted) ============ */
export type Upload = { id: string; title: string; course: string; size: string; uploaded: string; kind: "video" | "pdf"; progress: number };
const defaultUploads: Upload[] = [
  { id: "v1", title: "Intro to hooks.mp4", course: "Modern React Patterns", size: "128 MB", uploaded: "2026-06-11", progress: 100, kind: "video" },
  { id: "v2", title: "State machines.mp4", course: "Modern React Patterns", size: "212 MB", uploaded: "2026-06-08", progress: 100, kind: "video" },
  { id: "v3", title: "SQL joins deep dive.mp4", course: "SQL for Analysts", size: "185 MB", uploaded: "2026-06-04", progress: 100, kind: "video" },
];
export function getUploads(): Upload[] { return readJSON(K.teacherUploads, defaultUploads); }
export function setUploads(list: Upload[]) { writeJSON(K.teacherUploads, list); emit(K.teacherUploads); }
export function addUpload(u: Omit<Upload, "id" | "uploaded">) {
  const up: Upload = { id: `up${Date.now()}`, uploaded: new Date().toISOString().slice(0, 10), ...u };
  setUploads([up, ...getUploads()]);
}
export function deleteUpload(id: string) {
  setUploads(getUploads().filter((u) => u.id !== id));
}

/* ============ Last accessed (per course) ============ */
export function getLastAccessedMap(): Record<string, string> {
  return readJSON(K.lastAccessed, {});
}
export function touchCourse(courseId: string) {
  const map = getLastAccessedMap();
  map[courseId] = new Date().toISOString();
  writeJSON(K.lastAccessed, map);
  emit(K.lastAccessed);
}
export function getLastAccessed(courseId: string): string | undefined {
  return getLastAccessedMap()[courseId];
}

/* ============ Lesson notes ============ */
export function getNotesMap(): Record<string, Record<string, string>> {
  return readJSON(K.notes, {});
}
export function getLessonNote(courseId: string, lessonId: string): string {
  return getNotesMap()[courseId]?.[lessonId] ?? "";
}
export function setLessonNote(courseId: string, lessonId: string, text: string) {
  const all = getNotesMap();
  all[courseId] = all[courseId] ?? {};
  all[courseId][lessonId] = text;
  writeJSON(K.notes, all);
  emit(K.notes);
}
export function getCourseNotes(courseId: string): Record<string, string> {
  return getNotesMap()[courseId] ?? {};
}

/* ============ Assignment submissions history ============ */
export type Submission = { id: string; assignmentId: string; notes: string; at: string };
export function getSubmissions(): Record<string, Submission[]> {
  return readJSON(K.submissions, {});
}
export function getAssignmentSubmissions(assignmentId: string): Submission[] {
  return getSubmissions()[assignmentId] ?? [];
}
export function addSubmission(assignmentId: string, notes: string) {
  const all = getSubmissions();
  const s: Submission = { id: `sub${Date.now()}`, assignmentId, notes, at: new Date().toISOString() };
  all[assignmentId] = [s, ...(all[assignmentId] ?? [])];
  writeJSON(K.submissions, all);
  emit(K.submissions);
  logActivity({ kind: "assignment", label: "Assignment submitted", refId: assignmentId });
  return s;
}

/* ============ Activity log ============ */
export type ActivityKind = "lesson" | "quiz" | "enroll" | "assignment" | "purchase" | "certificate";
export type ActivityEntry = { id: string; kind: ActivityKind; label: string; refId?: string; at: string };
export function getActivity(): ActivityEntry[] {
  return readJSON(K.activity, [] as ActivityEntry[]);
}
export function logActivity(a: Omit<ActivityEntry, "id" | "at">) {
  const list = getActivity();
  const entry: ActivityEntry = { id: `act${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), ...a };
  const next = [entry, ...list].slice(0, 100);
  writeJSON(K.activity, next);
  emit(K.activity);
}

/* ============ Issued certificates (dynamic + persisted) ============ */
export type Certificate = { id: string; course: string; courseId?: string; issued: string; credential: string };
const seedCertificates: Certificate[] = [
  { id: "cert1", course: "SQL for Analysts", issued: "2026-06-14", credential: "LMN-SQL-2026-3491" },
  { id: "cert2", course: "Advanced CSS & Tailwind", issued: "2026-05-02", credential: "LMN-CSS-2026-2211" },
  { id: "cert3", course: "TypeScript from Zero to Hero", issued: "2026-03-19", credential: "LMN-TS-2026-1088" },
];
export function getIssuedCertificates(): Certificate[] {
  return readJSON(K.certificates, seedCertificates);
}
export function issueCertificate(course: { id: string; title: string }): Certificate | null {
  const list = getIssuedCertificates();
  if (list.some((c) => c.courseId === course.id)) return null;
  const code = course.title.replace(/[^A-Z]/g, "").slice(0, 4) || "CRS";
  const cert: Certificate = {
    id: `cert${Date.now()}`,
    course: course.title,
    courseId: course.id,
    issued: new Date().toISOString().slice(0, 10),
    credential: `LMN-${code}-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
  };
  const next = [cert, ...list];
  writeJSON(K.certificates, next);
  emit(K.certificates);
  logActivity({ kind: "certificate", label: `Earned certificate · ${course.title}`, refId: course.id });
  addNotification({ title: "Certificate issued", body: `Your certificate for ${course.title} is ready.`, kind: "system" });
  return cert;
}
