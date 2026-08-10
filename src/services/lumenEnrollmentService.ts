import { toast } from "sonner";
import {
  addOrder,
  generateInvoice,
  generateOrderId,
  generateTxId,
  getEnrollments,
  setEnrollments,
} from "@/lib/lms-storage";
import type { Course } from "@/lib/mock-data";

/**
 * lumenEnrollmentService — طبقة الكتابة الوحيدة على التسجيل لهذا الملف.
 * مستقلة تمامًا، لا تعتمد على أي خدمة أخرى في المشروع.
 */
export const lumenEnrollmentService = {
  getIds(): string[] {
    return getEnrollments();
  },
  isEnrolled(courseId: string): boolean {
    return getEnrollments().includes(courseId);
  },
  /** إضافة idempotent للتسجيل فقط — بدون إنشاء Order وبدون toast. تُستعمل بعد إتمام الدفع (orderService.complete) أو من enrollFree أدناه. */
  enroll(courseId: string): string[] {
    const cur = getEnrollments();
    if (cur.includes(courseId)) return cur;
    const next = [...cur, courseId];
    setEnrollments(next);
    return next;
  },
  /** تسجيل فوري في دورة مجانية: طلب بقيمة 0 ثم تفعيل التسجيل + toast. */
  enrollFree(course: Pick<Course, "id" | "title" | "teacher">) {
    const orderId = generateOrderId();
    addOrder({
      id: orderId,
      invoice: generateInvoice(),
      courseId: course.id,
      courseTitle: course.title,
      teacher: course.teacher,
      amount: 0,
      status: "paid",
      method: "Free enrollment",
      txId: generateTxId(),
      date: new Date().toISOString().slice(0, 10),
      buyerName: "Learner",
      buyerEmail: "learner@example.com",
    });
    const cur = getEnrollments();
    if (!cur.includes(course.id)) setEnrollments([...cur, course.id]);
    toast.success("Enrolled — welcome aboard!");
    return { orderId };
  },
  unenroll(courseId: string) {
    const cur = getEnrollments();
    if (!cur.includes(courseId)) return { ids: cur };
    const next = cur.filter((id) => id !== courseId);
    setEnrollments(next);
    toast.success("Unenrolled from the course");
    return { ids: next };
  },
};