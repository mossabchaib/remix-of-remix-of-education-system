// src/lib/auth.ts
//
// Same public API as the old localStorage-only version — getSession,
// setSession, clearSession, SESSION_EVENT, inferRole, dashboardPathForRole,
// SessionRole, Session — nothing here changes for existing consumers.
//
// signIn / signUp / signOut call the real backend and then reuse the
// existing setSession / clearSession under the hood.
//
// NOTE: signUp can return a "confirm_email" result when Supabase email
// confirmation is enabled — in that case there is no session yet, so we
// do NOT call setSession. The caller (Register page) must check `status`
// and show a "check your email" message instead of navigating away.

import { signInRequest, signUpRequest, signOutRequest, type SignUpResult } from "@/services/auth.service";
import { ApiError, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/services/api-client";

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
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
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

// ---------------------------------------------------------------------------
// Backend-backed auth
// ---------------------------------------------------------------------------

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY));
}

export function authErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function signIn(email: string, password: string): Promise<NonNullable<Session>> {
  const profile = await signInRequest({ email, password });
  console.log("profile:",profile)
  const session: NonNullable<Session> = {
    email: profile.email,
    name: profile.full_name,
    role: profile.role,
  };
  setSession(session);
  return session;
}

/**
 * Two possible outcomes:
 * - { status: "signed_in", session }  → email confirmation disabled, user is logged in
 * - { status: "confirm_email", message } → check your inbox, no session yet
 */
export type SignUpOutcome =
  | { status: "signed_in"; session: NonNullable<Session> }
  | { status: "confirm_email"; message: string };

export async function signUp(params: {
  name: string;
  email: string;
  password: string;
  role: SessionRole;
}): Promise<SignUpOutcome> {
  const result: SignUpResult = await signUpRequest(params);

  if (result.status === "confirm_email") {
    return { status: "confirm_email", message: result.message };
  }

  const session: NonNullable<Session> = {
    email: result.profile.email,
    name: result.profile.full_name,
    role: result.profile.role,
  };
  setSession(session);
  return { status: "signed_in", session };
}

export async function signOut(): Promise<void> {
  try {
    await signOutRequest();
  } finally {
    clearSession();
  }
}