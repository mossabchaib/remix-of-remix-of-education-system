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
import type { ProfileData } from "@/lib/lms-storage";

const WATCHED_KEYS: string[] = [
  storageKeys.orders,
  storageKeys.adminUsers,
  storageKeys.teacherCourses,
  storageKeys.progress,
  storageKeys.enrollments,
];

const EMPTY_KPIS: AdminKpis = {
  totalRevenue: 0,
  revenueDelta: 0,
  activeLearners: 0,
  learnersDelta: 0,
  publishedCourses: 0,
  coursesDelta: 0,
  completionRate: 0,
};

export type AdminOverviewData = {
  kpis: AdminKpis;
  revenueSeries: RevenuePoint[];
  payments: RecentPayment[];
  users: ProfileData[];
  loading: boolean;
};

async function readAll(): Promise<Omit<AdminOverviewData, "loading">> {
  const [kpis, revenueSeries, users] = await Promise.all([
    computeKpis(),
    computeMonthlySeries(12),
    recentUsers(6),
  ]);
  return {
    kpis,
    revenueSeries,
    payments: recentPayments(6), // sync — يقرا غير من orders/localStorage
    users,
  };
}

export function useAdminOverview(): AdminOverviewData {
  const [data, setData] = useState<AdminOverviewData>({
    kpis: EMPTY_KPIS,
    revenueSeries: [],
    payments: [],
    users: [],
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const result = await readAll();
      setData({ ...result, loading: false });
    } catch (err) {
      console.error("Failed to load admin overview:", err);
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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