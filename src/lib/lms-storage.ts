// Frontend-only LMS persistence + rich mock data. Everything lives in localStorage.
import { courses as baseCourses, students as baseStudents, categories as baseCategories, users as baseUsers, type Category, type Course, type User } from "./mock-data";
import { lmsApi,api } from "@/services/api-client";
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
  subscriptions: "lms.subscriptions",
   adminCourses: "lms.admin.courses",
    studentLiveReminders: "lms.student.liveReminders"
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
    addNotification({ title: "Course enrolled", body: "A new course has been added to My Courses.", kind: "course", audience: { scope: "course", courseId: id }, courseId: id, link: `/dashboard/student/courses/${id}` });
  }
  return next;
}
/* ============ Wishlist ============ */
export function getWishlist(): string[] {
  return readJSON(K.wishlist, [] as string[]);
}
export function setWishlist(ids: string[]) { writeJSON(K.wishlist, ids); emit(K.wishlist); }
export function toggleWishlist(id: string) {
  const cur = getWishlist();
  const wasWished = cur.includes(id);
  const next = wasWished ? cur.filter((x) => x !== id) : [...cur, id];
  setWishlist(next);
  if (!wasWished) {
    logActivity({ kind: "enroll", label: "Added a course to wishlist", refId: id });
  }
  return next;
}
export function isWishlisted(id: string): boolean {
  return getWishlist().includes(id);
}
/* ============ Wishlist ============ */


/* ============ Quizzes (API-backed) ============ */
export type QuestionType = "qcm" | "true_false" | "matching";

/** زوج يسار/يمين لسؤال المطابقة. */
export type MatchingPair = { id: string; left: string; right: string };

export type Question = {
  id: string;
  type: QuestionType;
  text: string;

  // --- qcm ---
  options?: string[];
  correctOptionIndexes?: number[];

  // --- true_false ---
  correctBoolean?: boolean;

  // --- matching ---
  pairs?: MatchingPair[];
};

export type Quiz = {
  id: string;
  title: string;
  course: string;
  courseId?: string;
  questions: Question[];
  minutes: number;
};

export type QuestionAnswer =
  | { type: "qcm"; selected: number[] }
  | { type: "true_false"; selected: boolean }
  | { type: "matching"; selected: Record<string, string> };

export type QuizAttempt = {
  id?: string;
  score: number;
  total: number;
  at: string;
  answers: Record<string, QuestionAnswer>;
};

/** جلب كل الكويزات الخاصة بكورس معيّن. */
export async function getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
  try {
    const res: any = await lmsApi.quizzes.listByCourse(courseId);
    return Array.isArray(res) ? res : res?.data || [];
  } catch (err) {
    console.error("Failed to fetch quizzes:", err);
    return [];
  }
}

/** جلب كويز واحد بالتفاصيل (أسئلة + خيارات). */
export async function getQuiz(id: string): Promise<Quiz | null> {
  try {
    const res: any = await lmsApi.quizzes.get(id);
    return res?.data || res || null;
  } catch (err) {
    console.error(`Failed to fetch quiz ${id}:`, err);
    return null;
  }
}

/** إنشاء أو تحديث كويز (id موجود = update، غير موجود = create). */
export async function upsertQuiz(q: Partial<Quiz>) {
  try {
    if (q.id) {
      const res: any = await lmsApi.quizzes.update(q.id, q);
      emit(K.teacherQuizzes);
      return res?.data || res;
    } else {
      console.log("q:", q);
      const res: any = await lmsApi.quizzes.create(q);
      emit(K.teacherQuizzes);
      return res?.data || res;
    }
  } catch (err) {
    console.error("Failed to save quiz:", err);
    throw err;
  }
}
export async function addQuizQuestion(quizId: string, question: Omit<Question, "id">) {
  const res: any = await lmsApi.quizzes.addQuestion(quizId, question);
  emit(K.teacherQuizzes);
  return res?.data || res;
}
export async function updateQuizQuestion(quizId: string, question: Question) {
  const res: any = await lmsApi.quizzes.updateQuestion(quizId, question.id, question);
  emit(K.teacherQuizzes);
  return res?.data || res;
}
export async function removeQuizQuestion(quizId: string, questionId: string) {
  const res = await lmsApi.quizzes.removeQuestion(quizId, questionId);
  emit(K.teacherQuizzes);
  return res;
}
/** حذف كويز. */
export async function deleteQuiz(id: string) {
  try {
    const res = await lmsApi.quizzes.remove(id);
    emit(K.teacherQuizzes);
    return res;
  } catch (err) {
    console.error(`Failed to delete quiz ${id}:`, err);
    throw err;
  }
}

/** حفظ محاولة الطالب فـ الكويز. */
export async function saveAttempt(
  quizId: string,
  attempt: { score: number; total: number; answers: Record<string, QuestionAnswer> }
) {
  try {
    const res: any = await lmsApi.quizzes.saveAttempt(quizId, attempt);
    emit(K.quizAttempts);
    logActivity({ kind: "quiz", label: `Quiz submitted · ${attempt.score}/${attempt.total}`, refId: quizId });
    return res?.data || res;
  } catch (err) {
    console.error(`Failed to save attempt for quiz ${quizId}:`, err);
    throw err;
  }
}

/** جلب كل محاولات الطالب الحالي. */
export async function getMyAttempts(): Promise<QuizAttempt[]> {
  try {
    const res: any = await lmsApi.quizzes.getMyAttempts();
    return Array.isArray(res) ? res : res?.data || [];
  } catch (err) {
    console.error("Failed to fetch attempts:", err);
    return [];
  }
}

/* ============ Quiz attempts ============ */
/* ============ Quiz attempts ============ */

export function getAttempts(): Record<string, QuizAttempt> { return readJSON(K.quizAttempts, {}); }
/* ============ Admin: All Courses ============ */
export async function getAllCourses() {
  try {
    const res: any = await lmsApi.getallteachers(); // GET /api/courses/ — عام، كل الكورسات
    if (Array.isArray(res)) return res;
    return res?.data || res?.courses || [];
  } catch (err) {
    console.error("Failed to fetch all courses:", err);
    return [];
  }
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
export interface Lesson {
  title: string;
  kind: "video" | "quiz" | "article";
  duration?: string;
  content_url?: string;
  order_index: number;
  is_preview?: boolean;
}

export interface Module {
  title: string;
  order_index: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  kind: "video" | "quiz" | "article";
  duration?: string;
  content_url?: string;
  order_index: number;
  is_preview?: boolean;
}

export interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

// --- Modules ---
export async function getStoredModules(courseId: string): Promise<Module[] | null> {
  try {
    const res: any = await lmsApi.getCourseModules(courseId);
    return Array.isArray(res) ? res : res?.data || res?.modules || [];
  } catch (err) {
    console.error("Failed to fetch modules:", err);
    return null;
  }
}

export async function setStoredModules(courseId: string, mods: Module[]) {
  try {
    const res = await lmsApi.syncCourseModules(courseId, mods);
    emit(K.teacherModules);
    return res;
  } catch (err) {
    console.error("Failed to sync modules:", err);
    throw err;
  }
}

export async function resolvedModules(courseId: string): Promise<Module[]> {
  const stored = await getStoredModules(courseId);
  return stored ?? [];
}

export async function deleteStoredModule(moduleId: string) {
  try {
    const res = await lmsApi.deleteModule(moduleId);
    emit(K.teacherModules);
    return res;
  } catch (err) {
    console.error("Failed to delete module:", err);
    throw err;
  }
}

// --- Lessons ---
export async function getStoredLessons(courseId: string): Promise<Lesson[]> {
  try {
    const res: any = await lmsApi.getCourseLessons(courseId);
    return Array.isArray(res) ? res : res?.data || res?.lessons || [];
  } catch (err) {
    console.error("Failed to fetch lessons:", err);
    return [];
  }
}

export async function addStoredLesson(moduleId: string, data: Partial<Lesson>) {
  try {
    const res = await lmsApi.addLesson(moduleId, data);
    emit(K.teacherModules);
    return res;
  } catch (err) {
    console.error("Failed to add lesson:", err);
    throw err;
  }
}

export async function updateStoredLesson(lessonId: string, data: Partial<Lesson>) {
  try {
    const res = await lmsApi.updateLesson(lessonId, data);
    emit(K.teacherModules);
    return res;
  } catch (err) {
    console.error("Failed to update lesson:", err);
    throw err;
  }
}

export async function deleteStoredLesson(lessonId: string) {
  try {
    const res = await lmsApi.deleteLesson(lessonId);
    emit(K.teacherModules);
    return res;
  } catch (err) {
    console.error("Failed to delete lesson:", err);
    throw err;
  }
}
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
/* ============ Live sessions (API-backed) ============ */
export type LiveSession = {
  id: string;
  title: string;
  course_id: string;
  host: string;
  startsAt: string;
  joinUrl?: string;
  duration: string;       // e.g. "60 min"
  attendees: number;
  recording_url?: string;   // رابط التسجيل (اختياري)
  join_url?: string;        // رابط الانضمام (اختياري)
  status: boolean;         // false = لم تنتهِ بعد, true = انتهت
};

/** جلب كل الجلسات (فلترة اختيارية عبر courseId/status). */
export async function getLiveSessions(params?: { courseId?: string; status?: boolean }): Promise<LiveSession[]> {
  try {
    const res: any = await lmsApi.live.list(params);
    return Array.isArray(res) ? res : res?.data || [];
  } catch (err) {
    console.error("Failed to fetch live sessions:", err);
    return [];
  }
}

/** جلب جلسات كورس معيّن. */
export async function getLiveSessionsByCourse(courseId: string): Promise<LiveSession[]> {
  try {
    const res: any = await lmsApi.live.listByCourse(courseId);
    return Array.isArray(res) ? res : res?.data || [];
  } catch (err) {
    console.error("Failed to fetch live sessions for course:", err);
    return [];
  }
}

/** جلب جلسة واحدة بالتفصيل. */
export async function getLiveSession(id: string): Promise<LiveSession | null> {
  try {
    const res: any = await lmsApi.live.get(id);
    return res?.data || res || null;
  } catch (err) {
    console.error(`Failed to fetch live session ${id}:`, err);
    return null;
  }
}

/** إنشاء أو تحديث جلسة (id موجود = update، غير موجود = create). */
export async function upsertLiveSession(l: Partial<LiveSession>) {
  try {
    if (l.id) {
      const res: any = await lmsApi.live.update(l.id, l);
      emit(K.teacherLive);
      return res?.data || res;
    } else {
      const res: any = await lmsApi.live.create(l);
      emit(K.teacherLive);
      return res?.data || res;
    }
  } catch (err) {
    console.error("Failed to save live session:", err);
    throw err;
  }
}

/** تعليم الجلسة كمنتهية. */
export async function endLiveSession(id: string) {
  try {
    const res: any = await lmsApi.live.end(id);
    emit(K.teacherLive);
    return res?.data || res;
  } catch (err) {
    console.error(`Failed to end live session ${id}:`, err);
    throw err;
  }
}

/** حذف جلسة. */
export async function deleteLiveSession(id: string) {
  try {
    const res = await lmsApi.live.remove(id);
    emit(K.teacherLive);
    return res;
  } catch (err) {
    console.error(`Failed to delete live session ${id}:`, err);
    throw err;
  }
}
/* ============ Quizzes ============ */
/* ============ Quizzes ============ */

const defaultQuizzes: Quiz[] = [
  {
    id: "q1", title: "React Hooks — Basics", course: "Modern React Patterns", minutes: 10,
    questions: [
      { id: "q1a", type: "qcm", text: "Which hook manages local component state?", options: ["useEffect", "useState", "useMemo", "useRef"], correctOptionIndexes: [1] },
      { id: "q1b", type: "qcm", text: "useEffect callbacks run…", options: ["Before render", "During render", "After commit", "Never"], correctOptionIndexes: [2] },
      { id: "q1c", type: "qcm", text: "useMemo is used to…", options: ["Cache callbacks", "Cache derived values", "Trigger effects", "Read refs"], correctOptionIndexes: [1] },
      { id: "q1d", type: "true_false", text: "Custom hook names must start with `use`.", correctBoolean: true },
      { id: "q1e", type: "matching", text: "Match each hook to its purpose.", pairs: [
        { id: "p1", left: "useState", right: "Local state" },
        { id: "p2", left: "useEffect", right: "Side effects" },
        { id: "p3", left: "useMemo", right: "Memoized value" },
      ]},
    ],
  },
  {
    id: "q2", title: "TypeScript Fundamentals", course: "TypeScript from Zero to Hero", minutes: 12,
    questions: [
      { id: "q2a", type: "qcm", text: "Which is a valid tuple type?", options: ["[string, number]", "{string, number}", "(string, number)", "<string, number>"], correctOptionIndexes: [0] },
      { id: "q2b", type: "qcm", text: "`readonly` on an array…", options: ["Freezes at runtime", "Blocks mutation at type level", "Removes methods", "Deep clones"], correctOptionIndexes: [1] },
      { id: "q2c", type: "qcm", text: "`keyof T` returns…", options: ["Values of T", "Keys of T", "Type of T", "Length of T"], correctOptionIndexes: [1] },
      { id: "q2d", type: "true_false", text: "`as const` narrows values to readonly literal types.", correctBoolean: true },
    ],
  },
  {
    id: "q3", title: "SQL — Aggregates & Joins", course: "SQL for Analysts", minutes: 15,
    questions: [
      { id: "q3a", type: "qcm", text: "INNER JOIN returns…", options: ["All rows in both", "Matching rows only", "Left rows only", "Right rows only"], correctOptionIndexes: [1] },
      { id: "q3b", type: "qcm", text: "GROUP BY is used with…", options: ["Aggregations", "Sub-queries only", "Views", "Indexes"], correctOptionIndexes: [0] },
      { id: "q3c", type: "true_false", text: "HAVING filters grouped rows.", correctBoolean: true },
    ],
  },
];

export function getQuizzes(): Quiz[] { return readJSON(K.teacherQuizzes, defaultQuizzes); }
export function setQuizzes(q: Quiz[]) { writeJSON(K.teacherQuizzes, q); emit(K.teacherQuizzes); }
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
// عدّل تعريف LiveSession فقط، الباقي يبقى كما هو



/* ============ Certificates (see Issued certificates section below) ============ */
/* ============ Profile / preferences (API-backed) ============ */
export type ProfileData = {
  id?: string;
  full_name: string;
  email: string;
  role?: "admin" | "teacher" | "student";
  avatar_url?: string;
};

/** جلب بروفايل المستخدم الحالي من الباك اند. */
export async function getProfile(): Promise<ProfileData> {
  try {
    const res: any = await lmsApi.users.getMe();
    return res?.profile ?? res ?? { full_name: "", email: "" };
  } catch (err) {
    console.error("Failed to fetch profile:", err);
    return { full_name: "", email: "" };
  }
}

export async function setProfile(p: Partial<ProfileData>) {
  try {
    const res: any = await lmsApi.users.updateMe(p);
    emit(K.profile);
    return res?.profile ?? res;
  } catch (err) {
    console.error("Failed to update profile:", err);
    throw err;
  }
}

/* ============ Admin Users (API-backed) ============ */

/** جلب كل المستخدمين (admin فقط). */
export async function getAdminUsers(): Promise<ProfileData[]> {
  try {
    const res: any = await lmsApi.users.list();
    console.log("getAdminUsers response:", res);
    if (Array.isArray(res)) return res;
    return res?.data ?? [];
  } catch (err) {
    console.error("Failed to fetch admin users:", err);
    return [];
  }
}

/** جلب مستخدم واحد بالـ id (من اللائحة الكاملة، الباك اند ماعندوش GET /:id حالياً). */
export async function getAdminUser(id: string): Promise<User | undefined> {
  const all = await getAdminUsers();
  return all.find((u: any) => u.id === id);
}

/** تغيير role مستخدم معيّن (admin فقط). */
export async function upsertAdminUser(u: { id: string; role: "admin" | "teacher" | "student" }) {
  try {
    const res: any = await lmsApi.users.changeRole(u.id, u.role);
    emit(K.adminUsers);
    return res?.profile ?? res;
  } catch (err) {
    console.error(`Failed to update role for user ${u.id}:`, err);
    throw err;
  }
}

// ⚠️ لا يوجد حالياً DELETE /api/users/:id فـ الباك اند (user.routes.js)
// إيلا حبيت هاذ الوظيفة، خاصنا نزيدو route + controller + service جدد.
export async function deleteAdminUser(id: string) {
  console.warn("deleteAdminUser: لا يوجد endpoint DELETE فـ user.routes.js حالياً.");
  throw new Error("Delete user endpoint not implemented on backend.");
}
/* ============ Subscriptions (API-backed) ============ */
export type SubscriptionStatus = "pending" | "active" | "expired" | "cancelled" | "rejected";

export type Subscription = {
  id: string;
  user_id?: string;
  plan_name: string;
  amount: number;
  status: SubscriptionStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  payment_proof_url?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  profiles?: { full_name: string; email: string }; // مرفقة عند جلب admin
};

/** الطالب: إرسال طلب اشتراك مع إثبات الدفع (صورة الشيك base64). */
export async function submitSubscription(data: {
  plan_name: string;
  amount: number;
  payment_proof: string;
}): Promise<Subscription | null> {
  try {
    const res: any = await lmsApi.subscriptions.submit(data);
    emit(K.subscriptions);
    logActivity({ kind: "purchase", label: `Subscription requested · ${data.plan_name}`, refId: res?.subscription?.id });
    return res?.subscription ?? res;
  } catch (err) {
    console.error("Failed to submit subscription:", err);
    throw err;
  }
}

/** جلب اشتراك المستخدم الحالي. */
export async function getMySubscription(): Promise<Subscription | null> {
  try {
    const res: any = await lmsApi.subscriptions.getMine();
    return res?.subscription ?? null;
  } catch (err) {
    console.error("Failed to fetch my subscription:", err);
    return null;
  }
}

/** التحقق هل عند المستخدم وصول نشط (اشتراك active وما فاتش أجله). */
export async function hasActiveAccess(): Promise<boolean> {
  const sub = await getMySubscription();
  if (!sub || sub.status !== "active" || !sub.ends_at) return false;
  return new Date(sub.ends_at) > new Date();
}

/** admin: جلب الطلبات المعلّقة فقط. */
export async function getPendingSubscriptions(): Promise<Subscription[]> {
  try {
    const res: any = await lmsApi.subscriptions.listPending();
    return Array.isArray(res) ? res : res?.subscriptions || [];
  } catch (err) {
    console.error("Failed to fetch pending subscriptions:", err);
    return [];
  }
}

/** admin: جلب كل الاشتراكات. */
export async function getAllSubscriptions(): Promise<Subscription[]> {
  try {
    const res: any = await lmsApi.subscriptions.listAll();
    return Array.isArray(res) ? res : res?.subscriptions || [];
  } catch (err) {
    console.error("Failed to fetch subscriptions:", err);
    return [];
  }
}

/** admin: قبول الاشتراك. */
/** admin: قبول الاشتراك مع تحديد عدد أيام الوصول. */
export async function approveSubscription(id: string, days: number): Promise<Subscription | null> {
  try {
    const res: any = await lmsApi.subscriptions.approve(id, days);
    emit(K.subscriptions);
    return res?.subscription ?? res;
  } catch (err) {
    console.error(`Failed to approve subscription ${id}:`, err);
    throw err;
  }
}

/** admin: رفض الاشتراك. */
export async function rejectSubscription(id: string): Promise<Subscription | null> {
  try {
    const res: any = await lmsApi.subscriptions.reject(id);
    emit(K.subscriptions);
    return res?.subscription ?? res;
  } catch (err) {
    console.error(`Failed to reject subscription ${id}:`, err);
    throw err;
  }
}
/* ============ Profile / preferences ============ */

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
export async function getAdminCategories() {
  return await lmsApi.getCategories();
}
export function setAdminCategories(list: Category[]) {
  writeJSON(K.adminCategories, list);
}
export async function upsertCategory(categoryData: any) {
  console.log("categoryData:",categoryData)
  if (categoryData.id) {
    return await lmsApi.updateCategory(categoryData.id, categoryData);
  }
  return await lmsApi.createCategory(categoryData);
}

export async function deleteAdminCategory(id: string) {
  return await lmsApi.deleteCategory(id);
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
  addNotification({ title: "Purchase confirmed", body: `${o.courseTitle} · ${o.invoice}`, kind: "system", audience: { scope: "course", courseId: o.courseId }, courseId: o.courseId, link: `/orders/${o.id}/receipt`, sourceId: `order:${o.id}` });
  addNotification({ title: "Course available", body: `${o.courseTitle} is ready to start.`, kind: "course", audience: { scope: "course", courseId: o.courseId }, courseId: o.courseId, link: `/dashboard/student/courses/${o.courseId}`, sourceId: `available:${o.courseId}` });
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

export function setAdminUsers(list: User[]) { writeJSON(K.adminUsers, list); emit(K.adminUsers); }




/* ============ Teacher Courses (persisted) ============ */
export async function getTeacherCourses() {
  try {
    const res: any = await lmsApi.getTeacherCourses();
    if (Array.isArray(res)) return res;
    return res?.data || res?.courses || [];
  } catch (err) {
    console.error("Failed to fetch teacher courses:", err);
    return []; // إرجاع مصفوفة فارغة لتجنب انهيار التطبيق
  }
}

export async function getTeacherCourse(id: string) {
  try {
    const res: any = await lmsApi.getTeacherCourse(id);
    return res?.data || res;
  } catch (err) {
    console.error(`Failed to fetch course ${id}:`, err);
    return null;
  }
}
export async function getTeacherCourseById(id: string) {
  try {
    const res: any = await lmsApi.getTeacherCourse(id);
    return res?.data || res;
  } catch (err) {
    console.error(`Failed to fetch course ${id}:`, err);
    return null;
  }
}
export async function upsertTeacherCourse(data: any) {
  try {
    if (data.id) {
      const res: any = await lmsApi.updateCourse(data.id, data);
      return res?.data || res;
    } else {
      const res: any = await lmsApi.createCourse(data);
      return res?.data || res;
    }
  } catch (err) {
    console.error("Failed to upsert course:", err);
    throw err;
  }
}

export async function deleteTeacherCourse(id: string) {
  try {
    return await lmsApi.deleteCourse(id);
  } catch (err) {
    console.error(`Failed to delete course ${id}:`, err);
    throw err;
  }
}

// /* ============ Teacher Modules override (persisted per course) ============ */
// export function getStoredModules(courseId: string): Module[] | null {
//   const all = readJSON<Record<string, Module[]>>(K.teacherModules, {});
//   return all[courseId] ?? null;
// }
// export function setStoredModules(courseId: string, mods: Module[]) {
//   const all = readJSON<Record<string, Module[]>>(K.teacherModules, {});
//   all[courseId] = mods;
//   writeJSON(K.teacherModules, all);
//   emit(K.teacherModules);
// }
// export function resolvedModules(courseId: string): Module[] {
//   return getStoredModules(courseId) ?? modulesForCourse(courseId);
// }

/* ============ Teacher Uploads (API-backed) ============ */
// Mirrors the `uploads` table columns:
// id, file_url, file_key, file_name, mime_type, file_size, kind, lesson_id, teacher_id, upload_date.
export type UploadKind = "video" | "pdf";

export type Upload = {
  id: string;
  title: string;        // file_name
  course: string;        // resolved course title — falls back to courseId or "General"
  course_id?: string;
  lesson_id?: string;     // lesson_id
  fileKey?: string;      // file_key (storage path/key)
  mimeType?: string;     // mime_type
  size: string;          // human-readable, derived from file_size
  uploaded: string;      // upload_date, sliced to YYYY-MM-DD
  kind: UploadKind;
  progress: number;      // always 100 for records fetched from the backend
  url: string;           // file_url
};

function humanFileSize(bytes: number): string {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function toUpload(row: any, courseTitle?: string): Upload {
  return {
    id: row.id,
    title: row.file_name,
    course: courseTitle ?? row.course_id ?? "General",
    course_id: row.course_id ?? undefined,
    lesson_id: row.lesson_id ?? undefined,
    fileKey: row.file_key ?? undefined,
    mimeType: row.mime_type ?? undefined,
    size: humanFileSize(row.file_size),
    uploaded: (row.upload_date ?? "").slice(0, 10),
    kind: row.kind,
    progress: 100,
    url: row.file_url,
  };
}

/** Fetch uploads for a course (optionally filtered by lesson). */
export async function getStoredUploads(params?: {
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
}): Promise<Upload[]> {
  try {
    const res: any = await lmsApi.uploads.list({ courseId: params?.courseId, lessonId: params?.lessonId });
    const rows = Array.isArray(res) ? res : res?.data || [];
    return rows.map((row: any) => toUpload(row, params?.courseTitle));
  } catch (err) {
    console.error("Failed to fetch uploads:", err);
    return [];
  }
}

/** Upload a file (with progress) and store it against an optional course/lesson. */
export async function addStoredUpload(
  file: File,
  options?: {
    course_id?: string;
    courseTitle?: string;
    lesson_id?: string;
    onProgress?: (pct: number) => void;
  }
): Promise<Upload> {
  const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(file.name);
  const kind: "video" | "pdf" = isVideo ? "video" : "pdf";

  try {
    console.log("Uploading file:", file,options);
    // 1) اطلب من الباك اند رابط رفع موقّع (بدون إرسال أي بايت من الملف)
    const signRes: any = await lmsApi.uploads.sign({
      fileName: file.name,
      kind,
      courseId: options?.course_id,
    });
    const { path, signedUrl } = signRes?.data ?? signRes;

    // 2) ارفع الملف مباشرة إلى Supabase — هنا يُقاس الـ progress الحقيقي بالكامل
    await api.uploadToSignedUrl(signedUrl, file, options?.onProgress);
console.log("File uploaded to signed URL:", file, options);
    // 3) بلّغ الباك اند بالاكتمال ليسجّل الميتاداتا فقط
    const confirmRes: any = await lmsApi.uploads.confirm({
      key: path,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      kind,
      course_id: options?.course_id,
      lesson_id: options?.lesson_id,
    });

    emit(K.teacherUploads);
    return toUpload(confirmRes?.data ?? confirmRes, options?.courseTitle);
  } catch (err) {
    console.error("Failed to upload file:", err);
    throw err;
  }
}

export async function deleteStoredUpload(id: string) {
  try {
    const res = await lmsApi.uploads.remove(id);
    emit(K.teacherUploads);
    return res;
  } catch (err) {
    console.error("Failed to delete upload:", err);
    throw err;
  }
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
export type Certificate = {
  id: string;
  course: string;
  courseId?: string;
  teacher?: string;        // جديد: اسم المحاضر ليُطبع على الشهادة
  issued: string;
  credential: string;
};
const seedCertificates: Certificate[] = [
  { id: "cert1", course: "SQL for Analysts", teacher: "Mateo Alvarez", issued: "2026-06-14", credential: "LMN-SQL-2026-3491" },
  { id: "cert2", course: "Advanced CSS & Tailwind", teacher: "Amelia Carter", issued: "2026-05-02", credential: "LMN-CSS-2026-2211" },
  { id: "cert3", course: "TypeScript from Zero to Hero", teacher: "Noah Bennett", issued: "2026-03-19", credential: "LMN-TS-2026-1088" },
];
export function getIssuedCertificates(): Certificate[] {
  return readJSON(K.certificates, seedCertificates);
}
export function issueCertificate(course: { id: string; title: string; teacher?: string }): Certificate | null {
  const list = getIssuedCertificates();
  if (list.some((c) => c.courseId === course.id)) return null;
  const code = course.title.replace(/[^A-Z]/g, "").slice(0, 4) || "CRS";
  const cert: Certificate = {
    id: `cert${Date.now()}`,
    course: course.title,
    courseId: course.id,
    teacher: course.teacher,
    issued: new Date().toISOString().slice(0, 10),
    credential: `LMN-${code}-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
  };
  const next = [cert, ...list];
  writeJSON(K.certificates, next);
  emit(K.certificates);
  logActivity({ kind: "certificate", label: `Earned certificate · ${course.title}`, refId: course.id });
  addNotification({
    title: "Certificate issued",
    body: `Your certificate for ${course.title} is ready.`,
    kind: "system",
    audience: { scope: "course", courseId: course.id },
    courseId: course.id,
    link: `/dashboard/student/certificates`,
    sourceId: `cert:${course.id}`,
  });
  return cert;
}
export type Progress = Record<string, Record<string, boolean>>;

/** جلب كل تقدّم المستخدم الحالي (كل الكورسات مجمّعة). */
export async function getProgress(): Promise<Progress> {
  try {
    const res: any = await lmsApi.progress.getMine();
    return res?.data || {};
  } catch (err) {
    console.error("Failed to fetch progress:", err);
    return {};
  }
}

/** تحديد/إلغاء إكمال درس. */
export async function setLessonComplete(courseId: string, lessonId: string, done: boolean) {
  try {
    const res: any = await lmsApi.progress.setLessonComplete({
      courseId,
      lessonId,
      completed: done,
    });
    emit(K.progress);
    if (done) {
      logActivity({ kind: "lesson", label: "Completed a lesson", refId: `${courseId}/${lessonId}` });
    }
    return res?.data;
  } catch (err) {
    console.error("Failed to update lesson progress:", err);
    throw err;
  }
}

/** ملخص رقمي لكورس واحد: done/total/pct (مباشرة من الباك اند). */
export async function courseProgress(courseId: string, totalLessons?: number) {
  try {
    const res: any = await lmsApi.progress.getCourseSummary(courseId);
    return res?.data || { done: 0, total: totalLessons ?? 0, pct: 0 };
  } catch (err) {
    console.error(`Failed to fetch progress summary for course ${courseId}:`, err);
    return { done: 0, total: totalLessons ?? 0, pct: 0 };
  }
}
/** الأستاذ: ملخص تقدّم الطلبة عبر كل كورساته. */
export async function getTeacherProgressRollup() {
  try {
    const res: any = await lmsApi.progress.getTeacherRollup();
    return Array.isArray(res) ? res : res?.data || [];
  } catch (err) {
    console.error("Failed to fetch teacher progress rollup:", err);
    return [];
  }
}