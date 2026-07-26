import { useKeyedStorage } from "./useKeyedStorage";
import { storageKeys, notificationsFor } from "@/lib/lms-storage";
import { useSession } from "./useSession";
import { useEnrollmentIds } from "./useStudentData";

export function useNotifications() {
  const session = useSession();
  const enrollments = useEnrollmentIds();
  // subscribe to changes on the underlying notifications key; ignore returned value
  useKeyedStorage(storageKeys.notifications, () => 0);
  const list = notificationsFor({
    role: session?.role ?? null,
    userId: session?.email ?? null,
    enrollments,
  });
  const unread = list.filter((n) => !n.read).length;
  return { list, unread };
}
