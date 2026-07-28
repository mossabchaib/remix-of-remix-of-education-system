import { useCallback, useEffect, useState } from "react";
import { STORAGE_EVENT, storageKeys } from "@/lib/lms-storage";
import {
  computeKpis,
  computeMonthlySeries,
  recentPayments,
  recentUsers,
  type AdminKpis,
  type RevenuePoint,
  type RecentPayment,
} from "@/lib/analytics";

// Only recompute when a key that actually affects this page changes.
const WATCHED_KEYS: string[] = [
  storageKeys.orders,
  storageKeys.adminUsers,
  storageKeys.teacherCourses,
  storageKeys.progress,
  storageKeys.enrollments,
];

export type AdminOverviewData = {
  kpis: AdminKpis;
  revenueSeries: RevenuePoint[];
  payments: RecentPayment[];
  users: ReturnType<typeof recentUsers>;
};

function readAll(): AdminOverviewData {
  return {
    kpis: computeKpis(),
    revenueSeries: computeMonthlySeries(12),
    payments: recentPayments(6),
    users: recentUsers(6),
  };
}

/**
 * Read-only hook for the Admin Overview page (`/admin`).
 * Recomputes automatically whenever a relevant lms-storage key changes,
 * via the shared `lms:storage-change` CustomEvent that every write
 * helper in `lms-storage.ts` already emits.
 *
 * NOTE for maintainers: if the project settles on a shared generic
 * `useKeyedStorage(keys, read)` hook, this can be rewritten to call it
 * directly. It's implemented standalone here so it has zero dependency
 * on a hook signature I haven't seen in this codebase yet — swap the
 * effect body below once that hook exists, keeping the return shape
 * (`AdminOverviewData`) identical so the page component doesn't change.
 */
export function useAdminOverview(): AdminOverviewData {
  const [data, setData] = useState<AdminOverviewData>(readAll);

  const refresh = useCallback(() => setData(readAll()), []);

  useEffect(() => {
    function handler(e: Event) {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      if (!key || WATCHED_KEYS.includes(key)) refresh();
    }
    window.addEventListener(STORAGE_EVENT, handler);
    return () => window.removeEventListener(STORAGE_EVENT, handler);
  }, [refresh]);

  return data;
}