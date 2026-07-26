import { useKeyedStorage } from "./useKeyedStorage";
import { storageKeys, getNotifications } from "@/lib/lms-storage";

export function useNotifications() {
  const list = useKeyedStorage(storageKeys.notifications, getNotifications);
  const unread = list.filter((n) => !n.read).length;
  return { list, unread };
}
