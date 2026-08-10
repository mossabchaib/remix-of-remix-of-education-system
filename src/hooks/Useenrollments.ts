import { useCallback } from "react";
import { getEnrollments, storageKeys } from "@/lib/lms-storage";
import { lumenEnrollmentService } from "@/services/lumenEnrollmentService";
import type { Course } from "@/lib/mock-data";
import { useKeyedStorage } from "./useLmsStorage";

export function useEnrollments() {
  const ids = useKeyedStorage(storageKeys.enrollments, getEnrollments);
  const isEnrolled = useCallback((courseId: string) => ids.includes(courseId), [ids]);
  const enrollFree = useCallback((course: Pick<Course, "id" | "title" | "teacher">) => {
    return lumenEnrollmentService.enrollFree(course);
  }, []);
  const unenroll = useCallback((courseId: string) => {
    return lumenEnrollmentService.unenroll(courseId);
  }, []);
  return { ids, isEnrolled, enrollFree, unenroll };
}