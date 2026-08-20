import { redirect } from "@tanstack/react-router";
import {
  getSession,
  isAuthenticated,
  dashboardPathForRole,
  type Session,
  type SessionRole,
} from "@/lib/auth";
import { getServerSession } from "@/lib/server-session";

async function resolveSession(): Promise<{ session: Session; hasToken: boolean }> {
  if (typeof window !== "undefined") {
    return { session: getSession(), hasToken: isAuthenticated() };
  }
  return getServerSession();
}

export async function requireAuth() {
  const { session, hasToken } = await resolveSession();
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
  const { session, hasToken } = await resolveSession();
  if (hasToken && session) {
    throw redirect({ to: dashboardPathForRole(session.role) });
  }
}