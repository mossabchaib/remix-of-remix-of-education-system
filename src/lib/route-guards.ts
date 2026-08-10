import { redirect } from "@tanstack/react-router";
import { getSession, isAuthenticated, dashboardPathForRole, type SessionRole } from "@/lib/auth";

/** Blocks the route unless the user is logged in. Redirects to /login otherwise. */
export function requireAuth() {
  const session = getSession();
  if (!isAuthenticated() || !session) {
    throw redirect({ to: "/login" });
  }
  return session;
}

/**
 * Blocks the route unless the user is logged in AND has one of the allowed
 * roles. If logged in but with the wrong role, sends them to *their own*
 * dashboard instead of /login (so a student hitting /admin lands on
 * /dashboard/student, not a login screen they don't need).
 */
export function requireRole(allowedRoles: SessionRole[]) {
  const session = requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw redirect({ to: dashboardPathForRole(session.role) });
  }
  return session;
}

/** Optional: keep logged-in users out of /login and /register. */
export function redirectIfAuthenticated() {
  const session = getSession();
  if (isAuthenticated() && session) {
    throw redirect({ to: dashboardPathForRole(session.role) });
  }
}