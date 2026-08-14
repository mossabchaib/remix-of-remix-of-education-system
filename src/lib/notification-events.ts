// Event-driven notification emitters. Called by teacher/admin actions and
// the periodic reminder scheduler. All notifications go through
// addNotification() so audience filtering and sourceId dedupe apply.
import {
  addNotification,
  getAssignments,
  getLiveSessions,
  getProfile,
  type NotifAudience,
  type Assignment,
  type LiveSession,
} from "./lms-storage";
import { courses as allCourses } from "./mock-data";

type Actor = { name: string; role: "student" | "teacher" | "admin" } | null;

function actorFrom(session?: { name?: string; role?: "student" | "teacher" | "admin" } | null): Actor {
  if (session && session.name && session.role) return { name: session.name, role: session.role };
  const p:any = getProfile();
  return { name: p.name, role: "teacher" };
}

/* ============ Teacher-driven events ============ */

export function notifyLessonPublished(input: {
  courseId: string; courseTitle: string; lessonTitle: string; session?: Actor;
}) {
  addNotification({
    title: "New lesson available",
    body: `${input.lessonTitle} — ${input.courseTitle}`,
    kind: "lesson",
    audience: { scope: "course", courseId: input.courseId },
    courseId: input.courseId,
    link: `/dashboard/student/courses/${input.courseId}`,
    createdBy: actorFrom(input.session),
  });
}

export function notifyResourceUploaded(input: {
  courseId?: string; courseTitle: string; title: string; kind: "video" | "pdf"; session?: Actor;
}) {
  const audience: NotifAudience = input.courseId
    ? { scope: "course", courseId: input.courseId }
    : { scope: "role", role: "student" };
  addNotification({
    title: input.kind === "video" ? "New video uploaded" : "New resource available",
    body: `${input.title} — ${input.courseTitle}`,
    kind: "resource",
    audience,
    courseId: input.courseId,
    link: `/dashboard/student/resources`,
    createdBy: actorFrom(input.session),
  });
}

export function notifyQuizPublished(input: {
  courseId?: string; courseTitle: string; quizId: string; quizTitle: string; session?: Actor;
}) {
  const audience: NotifAudience = input.courseId
    ? { scope: "course", courseId: input.courseId }
    : { scope: "role", role: "student" };
  addNotification({
    title: "New quiz published",
    body: `${input.quizTitle} — ${input.courseTitle}`,
    kind: "quiz",
    audience,
    courseId: input.courseId,
    link: `/dashboard/student/quizzes/${input.quizId}`,
    sourceId: `quiz-new:${input.quizId}`,
    createdBy: actorFrom(input.session),
  });
}

export function notifyAssignmentCreated(input: {
  courseId?: string; courseTitle: string; assignmentId: string; title: string; due: string; session?: Actor;
}) {
  const audience: NotifAudience = input.courseId
    ? { scope: "course", courseId: input.courseId }
    : { scope: "role", role: "student" };
  addNotification({
    title: "New assignment",
    body: `${input.title} · Due ${input.due} — ${input.courseTitle}`,
    kind: "assignment",
    audience,
    courseId: input.courseId,
    link: `/dashboard/student/assignments`,
    sourceId: `asgn-new:${input.assignmentId}`,
    createdBy: actorFrom(input.session),
  });
}

export function notifyLiveScheduled(input: {
  courseId?: string; courseTitle: string; sessionId: string; title: string; startsAt: string; host: string; session?: Actor;
}) {
  const audience: NotifAudience = input.courseId
    ? { scope: "course", courseId: input.courseId }
    : { scope: "role", role: "student" };
  addNotification({
    title: "Live session scheduled",
    body: `${input.title} · ${input.startsAt} with ${input.host}`,
    kind: "live",
    audience,
    courseId: input.courseId,
    link: `/dashboard/student/live`,
    sourceId: `live-new:${input.sessionId}`,
    createdBy: actorFrom(input.session),
  });
}

/* ============ Manual announcements ============ */

export function sendAnnouncement(input: {
  title: string;
  body: string;
  audience: NotifAudience;
  link?: string;
  session?: Actor;
}) {
  return addNotification({
    title: input.title,
    body: input.body,
    kind: "announcement",
    audience: input.audience,
    link: input.link,
    createdBy: actorFrom(input.session),
  });
}

/* ============ Reminder scheduler ============ */

function courseIdByTitle(title: string): string | undefined {
  return allCourses.find((c) => c.title === title)?.id;
}

function parseWhen(s: string) {
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Called on a timer from any dashboard. Emits reminder notifications for
 * live sessions starting within the next hour and assignments due within
 * the next 24 hours. Each event is deduped by sourceId so it fires once.
 */
/**
 * Called on a timer from any dashboard. Emits reminder notifications for
 * live sessions starting within the next hour and assignments due within
 * the next 24 hours. Each event is deduped by sourceId so it fires once.
 */
export async function runReminderSweep() {
  const now = Date.now();
  const inOneHour = now + 60 * 60 * 1000;
  const inOneDay = now + 24 * 60 * 60 * 1000;

  const liveSessions = await getLiveSessions();

  for (const s of liveSessions) {
    const when = parseWhen(s.startsAt);
    if (!when) continue;
    const t = when.getTime();
    if (t >= now && t <= inOneHour) {
      addNotification({
        title: "Live session starting soon",
        body: `${s.title} · ${s.startsAt}`,
        kind: "live",
        audience: s.course_id ? { scope: "course", courseId: s.course_id } : { scope: "role", role: "student" },
        courseId: s.course_id,
        link: `/dashboard/student/live`,
        sourceId: `live-soon:${s.id}`,
      });
    }
  }

  for (const a of getAssignments() as Assignment[]) {
    if (a.status !== "Pending") continue;
    const when = parseWhen(a.due);
    if (!when) continue;
    const t = when.getTime();
    if (t >= now && t <= inOneDay) {
      const courseId = courseIdByTitle(a.course);
      addNotification({
        title: "Assignment due soon",
        body: `${a.title} · ${a.course} · Due ${a.due}`,
        kind: "assignment",
        audience: courseId ? { scope: "course", courseId } : { scope: "role", role: "student" },
        courseId,
        link: `/dashboard/student/assignments`,
        sourceId: `asgn-due:${a.id}:${a.due}`,
      });
    }
  }
}