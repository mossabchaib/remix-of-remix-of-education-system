import { useEffect, useState } from "react";
import { getSession, SESSION_EVENT, type Session } from "@/lib/auth";

/**
 * Session hook synced across tabs and components.
 * - Reads from localStorage lazily (SSR-safe).
 * - Updates on: same-tab set/clear (custom event) and cross-tab storage events.
 */
export function useSession(): Session {
  const [session, setSessionState] = useState<Session>(() => getSession());

  useEffect(() => {
    // Hydrate on mount (in case SSR returned null)
    setSessionState(getSession());

    const sync = () => setSessionState(getSession());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "lms.session") sync();
    };
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return session;
}
