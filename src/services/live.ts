import {
  readJSON,
  writeJSON,
  STORAGE_EVENT,
  storageKeys,
  getLiveSessions,
  baseCourses,
  getEnrollments,
  logActivity,
  addNotification,
  type LiveSession,
} from "@/lib/lms-storage";

function emit(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }));
}

/* ---------- حالة الجلسة الديناميكية ---------- */
export type SessionStatus = "live" | "upcoming" | "ended";

function parseStart(s: string): Date {
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? new Date(0) : d;
}
function parseDurationMinutes(duration: string): number {
  const m = duration.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 60;
}

export function computeSessionStatus(session: LiveSession, now = Date.now()): SessionStatus {
  const start = parseStart(session.startsAt).getTime();
  const end = start + parseDurationMinutes(session.duration) * 60 * 1000;
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "ended";
}

/* ---------- فلترة حسب تسجيل الطالب ---------- */
export function filterSessionsForEnrolledStudent(sessions: LiveSession[]): LiveSession[] {
  const enrolledIds = getEnrollments();
  const enrolledTitles = new Set(
    baseCourses.filter((c) => enrolledIds.includes(c.id)).map((c) => c.title)
  );
  return sessions.filter((s) => enrolledTitles.has(s.course));
}

export function getStudentLiveSessions(): LiveSession[] {
  return filterSessionsForEnrolledStudent(getLiveSessions());
}

/* ---------- تذكيرات (RSVP) — المفتاح الآن من storageKeys ---------- */
export function getReminders(): string[] {
  return readJSON<string[]>(storageKeys.studentLiveReminders, []);
}
export function hasReminder(sessionId: string): boolean {
  return getReminders().includes(sessionId);
}
export function setReminder(session: LiveSession, on: boolean) {
  const cur = getReminders();
  const next = on
    ? Array.from(new Set([...cur, session.id]))
    : cur.filter((id) => id !== session.id);
  writeJSON(storageKeys.studentLiveReminders, next);
  emit(storageKeys.studentLiveReminders);
  if (on) {
    logActivity({ kind: "lesson", label: `Reminder set · ${session.title}`, refId: session.id });
    addNotification({
      title: "Reminder set",
      body: `We'll remind you before "${session.title}" starts.`,
      kind: "live",
      audience: { scope: "role", role: "student" },
      link: "/dashboard/student/live",
      sourceId: `live-reminder:${session.id}`,
    });
  }
}

/* ---------- الانضمام للجلسة ---------- */
export function joinSession(session: LiveSession) {
  logActivity({ kind: "lesson", label: `Joined live · ${session.title}`, refId: session.id });
}

/* ---------- توليد ملف .ics ---------- */
export function buildICSDataUrl(session: LiveSession): string {
  const start = parseStart(session.startsAt);
  const end = new Date(start.getTime() + parseDurationMinutes(session.duration) * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lumen LMS//EN",
    "BEGIN:VEVENT",
    `UID:${session.id}@lumen-lms`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${session.title}`,
    `DESCRIPTION:Live class for ${session.course} hosted by ${session.host}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export const LiveService = {
  getStudentLiveSessions,
  filterSessionsForEnrolledStudent,
  computeSessionStatus,
  getReminders,
  hasReminder,
  setReminder,
  joinSession,
  buildICSDataUrl,
};