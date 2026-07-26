// Ultra-simple frontend-only "auth" using localStorage. No backend.
export type SessionRole = "admin" | "teacher" | "student";
export type Session = { email: string; name: string; role: SessionRole } | null;

const KEY = "lms.session";
export const SESSION_EVENT = "lms:session-change";

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function getSession(): Session {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: NonNullable<Session>) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
  emitChange();
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
  emitChange();
}

export function inferRole(email: string): SessionRole {
  const e = email.toLowerCase();
  if (e.includes("admin")) return "admin";
  if (e.includes("teacher") || e.includes("instructor")) return "teacher";
  return "student";
}

export function dashboardPathForRole(role: SessionRole): string {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/dashboard/teacher";
  return "/dashboard/student";
}
