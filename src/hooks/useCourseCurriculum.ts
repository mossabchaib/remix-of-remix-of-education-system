import { useCallback, useEffect, useState } from "react";
import { resolvedModules, STORAGE_EVENT, storageKeys, type Module } from "@/lib/lms-storage";

export function useCourseCurriculum(courseId?: string): Module[] {
  const [modules, setModules] = useState<Module[]>([]);

  const load = useCallback(async () => {
    if (!courseId) {
      setModules([]);
      return;
    }
    try {
      const mods = await resolvedModules(courseId);
      setModules(mods);
    } catch (err) {
      console.error("Failed to load curriculum:", err);
      setModules([]);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string }>).detail;
      if (!detail || detail.key === storageKeys.teacherModules) {
        load();
      }
    };
    window.addEventListener(STORAGE_EVENT, handler as EventListener);
    return () => window.removeEventListener(STORAGE_EVENT, handler as EventListener);
  }, [load]);

  return modules;
}