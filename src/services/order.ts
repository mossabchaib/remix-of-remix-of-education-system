import {
  getOrders,
  getOrder,
  addOrder,
  generateOrderId,
  generateInvoice,
  generateTxId,
  type Order,
} from "@/lib/lms-storage";

/**
 * OrderService — الطبقة الوحيدة المسموح لها بالكتابة على lms.orders.
 * الطلبات سجلات غير قابلة للتعديل (Immutable Ledger):
 * لا توجد دالة "update" أو "delete" هنا عن قصد.
 * "إعادة المحاولة" لا تُعدّل الطلب الفاشل، بل تُنشئ سجل طلب جديد
 * بمعرّفات جديدة (ord_/INV-/txn_) يمثّل محاولة الدفع الجديدة.
 */
export const OrderService = {
  list(): Order[] {
    return getOrders();
  },
  get(id: string): Order | undefined {
    return getOrder(id);
  },
  /** يُعيد محاولة الدفع لطلب فاشل بإنشاء طلب جديد مرتبط بنفس الكورس والمبلغ. */
  retryPayment(failedOrder: Order): Order {
    const retried: Order = {
      ...failedOrder,
      id: generateOrderId(),
      invoice: generateInvoice(),
      txId: generateTxId(),
      status: "paid", // محاكاة نجاح إعادة المحاولة (frontend-only، بلا بوابة دفع حقيقية)
      date: new Date().toISOString(),
    };
    addOrder(retried); // يمر عبر writeJSON + emit(K.orders) + الإشعارات الموجودة أصلاً
    return retried;
  },
};