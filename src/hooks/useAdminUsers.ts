import { useKeyedStorage } from "./useKeyedStorage";
import { storageKeys, getAdminUsers } from "@/lib/lms-storage";

export function useAdminUsers() {
  return useKeyedStorage(storageKeys.adminUsers, getAdminUsers);
}
