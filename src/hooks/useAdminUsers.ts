// src/hooks/useAdminUsers.ts
import { useKeyedStorage } from "./useKeyedStorage";
import { storageKeys, getAdminUsers } from "@/lib/lms-storage";
import type { ProfileData } from "@/lib/lms-storage";

export function useAdminUsers() {
  return useKeyedStorage<ProfileData[]>(storageKeys.adminUsers, getAdminUsers, []);
}