import { useKeyedStorage } from "./useKeyedStorage";
import { storageKeys, getAllCourses } from "@/lib/lms-storage";

export function useAdminCourses() {
  return useKeyedStorage(storageKeys.adminCourses, getAllCourses);
}