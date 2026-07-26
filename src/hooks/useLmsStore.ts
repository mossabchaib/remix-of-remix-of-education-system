import { useCallback, useEffect, useState } from "react";
import { STORAGE_EVENT, storageKeys, getWishlist, toggleWishlist as toggleWl, getEnrollments } from "@/lib/lms-storage";

function useKeyedList(storageKey: string, read: () => string[]): string[] {
  const [list, setList] = useState<string[]>(() => (typeof window === "undefined" ? [] : read()));
  useEffect(() => {
    setList(read());
    const sync = () => setList(read());
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (!detail || detail.key === storageKey) sync();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === storageKey) sync();
    };
    window.addEventListener(STORAGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(STORAGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey, read]);
  return list;
}

export function useWishlist() {
  const ids = useKeyedList(storageKeys.wishlist, getWishlist);
  const toggle = useCallback((id: string) => toggleWl(id), []);
  return { ids, count: ids.length, has: (id: string) => ids.includes(id), toggle };
}

export function useEnrollments() {
  const ids = useKeyedList(storageKeys.enrollments, getEnrollments);
  return { ids, count: ids.length, has: (id: string) => ids.includes(id) };
}
