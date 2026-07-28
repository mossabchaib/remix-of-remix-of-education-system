import {
  getLiveSessions,
  setLiveSessionsList,
  upsertLiveSession,
  deleteLiveSession,
  logActivity,
  addNotification,
  readJSON,
  writeJSON,
  type LiveSession,
} from "@/lib/lms-storage";

export const list = getLiveSessions;
export const replaceAll = setLiveSessionsList;
export const save = upsertLiveSession;
export const remove = deleteLiveSession;
export function create(l: Omit<LiveSession, "id">): LiveSession {
  const withId: LiveSession = { ...l, id: `l${Date.now()}` };
  upsertLiveSession(withId);
  return withId;
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
export function join(session: LiveSession): LiveSession {
  if (hasJoined(session.id)) return session;

  const updated: LiveSession = { ...session, attendees: session.attendees + 1 };
  save(updated);
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