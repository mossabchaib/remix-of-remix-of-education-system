import { useEffect, useState } from "react";
import { getEnrollments, STORAGE_EVENT, storageKeys } from "@/lib/lms-storage";

export function useEnrollments(): string[] {
  const [ids, setIds] = useState<string[]>(() => getEnrollments());

  useEffect(() => {
    const sync = () => setIds(getEnrollments());
    const onCustom = (e: Event) => {
      const key = (e as CustomEvent).detail?.key;
      if (!key || key === storageKeys.enrollments) sync();
    };
    window.addEventListener(STORAGE_EVENT, onCustom);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORAGE_EVENT, onCustom);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return ids;
}