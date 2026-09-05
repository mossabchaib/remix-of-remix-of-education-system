import { redirect } from "@tanstack/react-router";
import {
  getSession,
  isAuthenticated,
  dashboardPathForRole,
  type SessionRole,
} from "@/lib/auth";

export async function requireAuth() {
  const session = getSession();
  const hasToken = isAuthenticated();
  if (!hasToken || !session) {
    throw redirect({ to: "/login" });
  }
  return session;
}

export async function requireRole(allowedRoles: SessionRole[]) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw redirect({ to: dashboardPathForRole(session.role) });
  }
  return session;
}

export async function redirectIfAuthenticated() {
  const session = getSession();
  const hasToken = isAuthenticated();
  if (hasToken && session) {
    throw redirect({ to: dashboardPathForRole(session.role) });
  }
}