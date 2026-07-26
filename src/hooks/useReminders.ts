import { useEffect } from "react";
import { runReminderSweep } from "@/lib/notification-events";

/**
 * Runs the reminder sweep once on mount and every minute after. Called from
 * the dashboard layout so it runs while a user is active.
 */
export function useReminders() {
  useEffect(() => {
    runReminderSweep();
    const id = window.setInterval(runReminderSweep, 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
}
