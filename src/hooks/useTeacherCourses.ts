import { useKeyedStorage } from "./useKeyedStorage";
import { storageKeys, getTeacherCourses } from "@/lib/lms-storage";

export function useTeacherCourses() {
  return useKeyedStorage(storageKeys.teacherCourses, getTeacherCourses);
}
