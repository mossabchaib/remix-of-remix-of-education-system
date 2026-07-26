export {
  getNotifications as list,
  setNotifications as replaceAll,
  addNotification as create,
  deleteNotification as remove,
  markNotificationRead as markRead,
  markAllNotificationsRead as markAllRead,
} from "@/lib/lms-storage";
