import {
  getLiveSessions,
  setLiveSessionsList,
  upsertLiveSession,
  deleteLiveSession,
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
