import { useSyncExternalStore } from "react";
import { SESSION_EVENT, SESSION_KEY, type Session } from "@/lib/auth";

function subscribe(callback: () => void) {
  window.addEventListener(SESSION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SESSION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// كاش باش ما نرجعوش object جديد كل مرة (وإلا React كيدخل فـ infinite loop)
let cachedRaw: string | null = null;
let cachedSession: Session = null;

function getSnapshot(): Session {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSession = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cachedSession = null;
    }
  }
  return cachedSession;
}

function getServerSnapshot(): Session {
  return null; // SSR: بلا window، دايماً null
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}