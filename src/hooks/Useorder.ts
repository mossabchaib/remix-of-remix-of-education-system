import { useCallback } from "react";
import { getOrder, storageKeys, type Order } from "@/lib/lms-storage";
import { useKeyedStorage } from "./useLmsStorage";

/**
 * قراءة تفاعلية لطلب واحد (Order) عبر id — لصفحات
 * /orders/$id/confirmation, /failed, /receipt, /success.
 * تُعيد undefined إن لم يوجد الطلب بعد (مثلاً أول تصيير على السيرفر).
 */
export function useOrder(orderId: string): Order | undefined {
  const getSnapshot = useCallback(() => getOrder(orderId), [orderId]);
  return useKeyedStorage(storageKeys.orders, getSnapshot);
}