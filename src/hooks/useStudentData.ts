import { useKeyedStorage } from "./useKeyedStorage";
import {
  storageKeys,
  getOrders,
  getProgress,
  getEnrollments,
  getWishlist,
  getIssuedCertificates,
  getActivity,
  getLastAccessedMap,
  getSubmissions,
  getTeacherCourses,
  getNotesMap,
  resolvedModules,
  getProfile, // جديد
} from "@/lib/lms-storage";

export function useOrders() {
  return useKeyedStorage(storageKeys.orders, getOrders);
}
export function useProgress() {
  return useKeyedStorage(storageKeys.progress, getProgress);
}
export function useEnrollmentIds() {
  return useKeyedStorage(storageKeys.enrollments, getEnrollments);
}
export function useWishlistIds() {
  return useKeyedStorage(storageKeys.wishlist, getWishlist);
}
export function useIssuedCertificates() {
  return useKeyedStorage(storageKeys.certificates, getIssuedCertificates);
}
export function useActivity() {
  return useKeyedStorage(storageKeys.activity, getActivity);
}
export function useLastAccessed() {
  return useKeyedStorage(storageKeys.lastAccessed, getLastAccessedMap);
}
export function useSubmissions() {
  return useKeyedStorage(storageKeys.submissions, getSubmissions);
}

// مصدر الحقيقة الوحيد لكورسات المعلم — تُستخدم بدل الاستيراد المباشر لـ mock-data
export function useTeacherCourses() {
  return useKeyedStorage(storageKeys.teacherCourses, getTeacherCourses);
}

// نسبة تقدم كورس معيّن — تشترك تلقائياً في تحديثات lms.progress
export function useCourseProgress(courseId: string, total: number) {
  const progress = useProgress();
  const done = Object.values(progress[courseId] ?? {}).filter(Boolean).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

// خريطة التقدم الكاملة لكورس (للتحقق من كل lesson id)
export function useLessonProgressMap(courseId: string) {
  const progress = useProgress();
  return progress[courseId] ?? {};
}

// ملاحظة درس واحد
export function useLessonNote(courseId: string, lessonId: string) {
  const notes = useKeyedStorage(storageKeys.notes, getNotesMap);
  return notes[courseId]?.[lessonId] ?? "";
}

// محتوى الكورس مع احترام تعديلات المعلم (lms.teacher.modules)
export function useCourseModules(courseId: string) {
  return useKeyedStorage(storageKeys.teacherModules, () => resolvedModules(courseId));
}

// بيانات ملف الطالب الشخصي (lms.profile) — يستبدل أي استدعاء مباشر لـ getProfile() في الصفحات
export function useProfile() {
  return useKeyedStorage(storageKeys.profile, getProfile);
}