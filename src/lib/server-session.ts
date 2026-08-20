// src/lib/server-session.ts
// Server-only session read, wrapped in createServerFn so TanStack Start's
// import-protection strips the real `getCookie` call from the client
// bundle and calls it via RPC instead.

import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import type { Session } from "@/lib/auth";

export const getServerSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ session: Session; hasToken: boolean }> => {
    try {
      const rawSession = getCookie("lms.session");
      const token = getCookie("lms.access_token");
      return {
        session: rawSession ? (JSON.parse(rawSession) as Session) : null,
        hasToken: Boolean(token),
      };
    } catch {
      return { session: null, hasToken: false };
    }
  }
);