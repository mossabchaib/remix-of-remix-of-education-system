import { getTeacherCourses, upsertTeacherCourse, deleteTeacherCourse, getTeacherCourse, resolvedModules, setStoredModules } from "@/lib/lms-storage";
import type { Course } from "@/lib/mock-data";
import type { Module } from "@/lib/lms-storage";

export const list = getTeacherCourses;
export const get = getTeacherCourse;
export const remove = deleteTeacherCourse;
export function save(c: Course) { upsertTeacherCourse(c); }
export function create(c: Omit<Course, "id">): Course {
  const withId: Course = { ...c, id: `co${Date.now()}` };
  upsertTeacherCourse(withId);
  return withId;
}
export function publish(id: string) {
  const c = getTeacherCourse(id);
  if (c) upsertTeacherCourse({ ...c, status: "Published" });
}
export function archive(id: string) {
  const c = getTeacherCourse(id);
  if (c) upsertTeacherCourse({ ...c, status: "Archived" });
}
export const modules = resolvedModules;
export const setModules = setStoredModules;
