// src/service/auth.service.ts
//
// Raw calls to /api/auth/* and /api/users/me.
//
// ASSUMPTIONS that need to be confirmed against your actual
// src/utils/response.js — adjust the `ApiEnvelope` type below if wrong:
//   { success: boolean, message: string, data: {...} }
//
// KNOWN GAP: auth.controller.js's signUp currently only reads
// { email, password, fullName } from req.body — it does NOT read `role`.
// We still send `role` below (harmless, backend just ignores it today),
// but until the controller + authService.signUp are updated to accept and
// persist it, every signup will end up with whatever the DB default is
// (per your doc: "student"), regardless of what the user picked in the UI.

import { api, storeTokens } from "./api-client";

import { REFRESH_TOKEN_KEY } from "./api-client";
export type BackendRole = "admin" | "teacher" | "student";

export interface BackendProfile {
  id: string;
  full_name: string;
  email: string;
  role: BackendRole;
  avatar_url: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface SignUpData {
  user: { id: string; email: string };
  // null when Supabase email confirmation is enabled — no tokens yet.
  session: { access_token: string; refresh_token: string } | null;
}

interface SignInData {
  user: { id: string; email: string };
  session: { access_token: string; refresh_token: string };
}

export type SignUpResult =
  | { status: "confirm_email"; message: string }
  | { status: "signed_in"; profile: BackendProfile };

export async function signUpRequest(params: {
  name: string;
  email: string;
  password: string;
  role: BackendRole;
}): Promise<SignUpResult> {
  console.log("signUpRequest params:", params);
  const res = await api.post<ApiEnvelope<SignUpData>>("/api/auth/signup", {
    email: params.email,
    password: params.password,
    fullName: params.name,
    role: params.role, // currently ignored by the backend — see note above
  });

  if (!res.data.session) {
    // Email confirmation required: no access token yet, can't call /me.
    return { status: "confirm_email", message: res.message };
  }

  storeTokens(res.data.session.access_token, res.data.session.refresh_token);
  const profile = await fetchProfileRequest();
  return { status: "signed_in", profile };
}

export async function signInRequest(params: {
  email: string;
  password: string;
}): Promise<BackendProfile> {
  const res = await api.post<ApiEnvelope<SignInData>>("/api/auth/signin", params);
  storeTokens(res.data.session.access_token, res.data.session.refresh_token);
  return fetchProfileRequest();
}


export async function signOutRequest(): Promise<void> {
  const refreshToken =
    typeof window !== "undefined" ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  await api.post("/api/auth/signout", { refreshToken });
}

export async function resetPasswordRequest(params: {
  accessToken: string;
  refreshToken: string;
  newPassword: string;
}): Promise<void> {
  await api.post("/api/auth/reset-password", params);
}
export async function forgotPasswordRequest(params: {
  email: string;
  redirectTo?: string;
}): Promise<{ message: string }> {
  const res = await api.post<ApiEnvelope<null>>("/api/auth/forgot-password", params);
  return { message: res.message };
}
export async function fetchProfileRequest(): Promise<BackendProfile> {
  const res = await api.get<ApiEnvelope<BackendProfile>>("/api/users/me");
  return res.data;
}