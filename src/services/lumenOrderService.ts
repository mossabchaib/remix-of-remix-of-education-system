import {
  addOrder,
  clearCheckout,
  generateInvoice,
  generateOrderId,
  generateTxId,
  getCheckout,
  setCheckout,
  type CheckoutDraft,
  type Order,
} from "@/lib/lms-storage";
import type { Course } from "@/lib/mock-data";

/**
 * lumenOrderService — طبقة الكتابة الوحيدة لعملية الشراء لهذا الملف.
 * مستقلة تمامًا، لا تعتمد على أي خدمة أخرى في المشروع.
 */
export const lumenOrderService = {
  beginCheckout(course: Pick<Course, "id">, method: CheckoutDraft["method"] = "Card") {
    const draft: CheckoutDraft = { courseId: course.id, method };
    setCheckout(draft);
    return draft;
  },
  /** يضبط مسودة الدفع كاملة (بما فيها بيانات البطاقة) — تُستعمل في صفحة الدفع الفعلية. */
  setDraft(draft: CheckoutDraft): CheckoutDraft {
    setCheckout(draft);
    return draft;
  },
  getDraft(): CheckoutDraft | null {
    return getCheckout();
  },
  clearDraft() {
    clearCheckout();
  },
  /** يُنشئ طلباً مؤكداً (ناجح أو فاشل) ويمسح مسودة الـ checkout تلقائياً. */
  complete(order: Omit<Order, "id" | "invoice" | "txId" | "date">): Order {
    const full: Order = {
      ...order,
      id: generateOrderId(),
      invoice: generateInvoice(),
      txId: generateTxId(),
      date: new Date().toISOString().slice(0, 10),
    };
    addOrder(full);
    clearCheckout();
    return full;
  },
};