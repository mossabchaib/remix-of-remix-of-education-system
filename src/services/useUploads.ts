import { useEffect, useState } from "react";
import { getUploads, STORAGE_EVENT, storageKeys, type Upload } from "@/lib/lms-storage";

export function useUploads(): Upload[] {
  const [uploads, setUploadsState] = useState<Upload[]>(() => getUploads());

  useEffect(() => {
    const sync = () => setUploadsState(getUploads());
    const onCustom = (e: Event) => {
      const key = (e as CustomEvent).detail?.key;
      if (!key || key === storageKeys.teacherUploads) sync();
    };
    window.addEventListener(STORAGE_EVENT, onCustom);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORAGE_EVENT, onCustom);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return uploads;
}