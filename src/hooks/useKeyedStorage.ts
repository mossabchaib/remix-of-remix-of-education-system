import { useEffect, useState } from "react";
import { STORAGE_EVENT } from "@/lib/lms-storage";

/**
 * Subscribe a React component to a storage key. Re-runs `read` on any
 * lms:storage-change event whose detail.key matches (or storage events).
 */
export function useKeyedStorage<T>(key: string, read: () => T): T {
  const [value, setValue] = useState<T>(() => read());
  useEffect(() => {
    setValue(read());
    const sync = () => setValue(read());
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
      window.removeEventListener(STORAGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}
