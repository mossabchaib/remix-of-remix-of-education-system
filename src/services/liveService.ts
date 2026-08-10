import {
  getLiveSessions,
  upsertLiveSession,
  deleteLiveSession,
  endLiveSession,
  logActivity,
  addNotification,
  readJSON,
  writeJSON,
  type LiveSession,
} from "@/lib/lms-storage";

export const list = getLiveSessions;      // async — الآن لازم await list()
export const save = upsertLiveSession;    // async
export const remove = deleteLiveSession;  // async
export const end = endLiveSession;        // async — جديد: تعليم الجلسة كمنتهية

/**
 * ينشئ جلسة جديدة عبر الـ API ويرجّع الكائن اللي رجعه السيرفر (بمعرّف حقيقي
 * من قاعدة البيانات — بعد ما كان يولّد id يدويًا بـ `l${Date.now()}`).
 */
export async function create(l: Omit<LiveSession, "id" | "status">): Promise<LiveSession> {
  return await upsertLiveSession(l);
}

/* ---- Student-side: join a live session ---- */
const JOINED_KEY = "lms.student.joinedLive";

export function getJoinedIds(): string[] {
  return readJSON<string[]>(JOINED_KEY, []);
}

export function hasJoined(sessionId: string): boolean {
  return getJoinedIds().includes(sessionId);
}

/**
 * يسجّل انضمام الطالب لجلسة Live: يزيد attendees عبر save()،
 * يسجّل Activity، ويبعث إشعار تأكيد. Idempotent per session.
 */
export async function join(session: LiveSession): Promise<LiveSession> {
  if (hasJoined(session.id)) return session;

  const updated = await save({ ...session, attendees: session.attendees + 1 });
  writeJSON(JOINED_KEY, [...getJoinedIds(), session.id]);

  logActivity({
    kind: "lesson",
    label: `Joined live session · ${session.title}`,
    refId: session.id,
  });

  addNotification({
    title: "Joined live session",
    body: `You're set to attend "${session.title}" with ${session.host}.`,
    kind: "live",
    audience: { scope: "role", role: "student" },
    link: "/dashboard/student/live",
    sourceId: `live-join:${session.id}`,
  });

  return updated;
}