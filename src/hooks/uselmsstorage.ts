import { useEffect, useRef, useState } from "react";
import { STORAGE_EVENT } from "@/lib/lms-storage";

type KeyFilter = string | string[];

function toKeyList(keys: KeyFilter): string[] {
  return Array.isArray(keys) ? keys : [keys];
}
export function useKeyedStorage<T>(keys: KeyFilter, getSnapshot: () => T): T {
  const watched = toKeyList(keys);
  const watchedKey = watched.join("|");

  // نحتفظ بآخر نسخة من getSnapshot عبر ref حتى لا نُجبر المستهلك على
  // تمرير دالة مُحصّنة بـ useCallback في كل استدعاء.
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;

  const [value, setValue] = useState<T>(() => getSnapshotRef.current());

  useEffect(() => {
    // إعادة القراءة عند التركيب (يغطي أي تغيير حصل بين الـ render الأول
    // على السيرفر/التصيير الأولي وبين وصول المستخدم فعلياً للصفحة).
    setValue(getSnapshotRef.current());

    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string }>).detail;
      if (!detail || watched.includes(detail.key)) {
        setValue(getSnapshotRef.current());
      }
    };

    window.addEventListener(STORAGE_EVENT, handler as EventListener);
    return () => window.removeEventListener(STORAGE_EVENT, handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedKey]);

  return value;
}