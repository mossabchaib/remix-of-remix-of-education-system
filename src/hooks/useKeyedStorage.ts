import { useEffect, useState } from "react";
import { STORAGE_EVENT } from "@/lib/lms-storage";

/**
 * Subscribe a React component to a storage key. Supports async/sync read functions.
 */
export function useKeyedStorage<T>(key: string, read: () => T | Promise<T>, initialValue: T = [] as unknown as T): T {
  // ضمان أن القيمة الأولية مصفوفة فارغة وليست undefined أبداً لمنع أخطاء reduce
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const result = await read();
         console.log(`📦 [useKeyedStorage] Raw result for "${key}":`, result);
        if (isMounted) {
          // التأكد دائماً من أن النتيجة مصفوفة أو إرجاع مصفوفة فارغة
          setValue(Array.isArray(result) ? result : (result as any)?.data || (result as any)?.courses || initialValue);
        }
      } catch (err) {
        console.error(`Error loading storage key ${key}:`, err);
        if (isMounted) {
          setValue(initialValue); // عند حدوث خطأ 500 نرجع مصفوفة فارغة لتجنب الانهيار
        }
      }
    }

    load();

    const sync = () => load();
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (!detail || detail.key === key) sync();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === key) sync();
    };

    window.addEventListener(STORAGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);

    return () => {
      isMounted = false;
      window.removeEventListener(STORAGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  return value;
}