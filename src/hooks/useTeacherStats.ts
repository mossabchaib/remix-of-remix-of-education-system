import { useEffect, useState } from "react";
import { STORAGE_EVENT } from "@/lib/lms-storage";
import { computeTeacherStats, derivedStudents, courseProgressRollup, type TeacherStats } from "@/lib/teacher-stats";
import { getTeacherCourses } from "@/lib/lms-storage";

function useDerived<T>(read: () => T): T {
  const [v, setV] = useState<T>(() => read());
  useEffect(() => {
    setV(read());
    const on = () => setV(read());
    window.addEventListener(STORAGE_EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(STORAGE_EVENT, on);
      window.removeEventListener("storage", on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

export function useTeacherStats(): TeacherStats {
  return useDerived(computeTeacherStats);
}
export function useDerivedStudents() {
  return useDerived(derivedStudents);
}
export function useCourseProgressRollup() {
  return useDerived(() => courseProgressRollup(getTeacherCourses()));
}
