import { useState, useEffect, useMemo } from "react";
import { getAdminCategories, getTeacherCourses } from "@/lib/lms-storage";

export function useCourseCatalog() {
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);
        const [coursesRes, categoriesRes]:any = await Promise.all([
          getTeacherCourses(),
          getAdminCategories(),
        ]);

        if (isMounted) {
          setAllCourses(Array.isArray(coursesRes) ? coursesRes : coursesRes?.data || []);
          setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes?.data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading course catalog:", err);
          setError(err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // تصفية الكورسات المستبعد منها المأرشفة (مع مراعاة حالة الأحرف draft/published/archived)
  const courses = useMemo(() => {
    return allCourses.filter(
      (c) => c.status?.toLowerCase() !== "archived"
    );
  }, [allCourses]);

  return { courses, categories, isLoading, error };
}