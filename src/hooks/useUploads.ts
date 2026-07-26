import { useKeyedStorage } from "./useKeyedStorage";
import { storageKeys, getUploads } from "@/lib/lms-storage";

export function useUploads() {
  return useKeyedStorage(storageKeys.teacherUploads, getUploads);
}
