import {
  toggleEnrollment as _toggleEnrollment,
  getEnrollments,
} from "@/lib/lms-storage";

/**
 * EnrollmentService — الطبقة الوحيدة المسموح لها بالكتابة على lms.enrollments.
 * إن كان لديك بالفعل src/services/enrollment.ts بعقد مختلف، أرسله لي لأدمج
 * بدل الاستبدال — هذا الملف افتراضي بناءً على نمط WishlistService أعلاه.
 */
export const EnrollmentService = {
  list(): string[] {
    return getEnrollments();
  },
  has(courseId: string): boolean {
    return getEnrollments().includes(courseId);
  },
  toggle(courseId: string): string[] {
    return _toggleEnrollment(courseId);
  },
  /** تسجيل مباشر وآمن (idempotent) — يُستخدم في تدفق "Enroll" للكورسات المجانية. */
  enroll(courseId: string): string[] {
    if (!this.has(courseId)) return this.toggle(courseId);
    return getEnrollments();
  },
};