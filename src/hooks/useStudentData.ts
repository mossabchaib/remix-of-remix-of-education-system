import { useKeyedStorage } from "./useKeyedStorage";
import {
  storageKeys,
  getOrders,
  getProgress,
  getEnrollments,
  getWishlist,
  getIssuedCertificates,
  getActivity,
  getLastAccessedMap,
  getSubmissions,
} from "@/lib/lms-storage";

export function useOrders() {
  return useKeyedStorage(storageKeys.orders, getOrders);
}
export function useProgress() {
  return useKeyedStorage(storageKeys.progress, getProgress);
}
export function useEnrollmentIds() {
  return useKeyedStorage(storageKeys.enrollments, getEnrollments);
}
export function useWishlistIds() {
  return useKeyedStorage(storageKeys.wishlist, getWishlist);
}
export function useIssuedCertificates() {
  return useKeyedStorage(storageKeys.certificates, getIssuedCertificates);
}
export function useActivity() {
  return useKeyedStorage(storageKeys.activity, getActivity);
}
export function useLastAccessed() {
  return useKeyedStorage(storageKeys.lastAccessed, getLastAccessedMap);
}
export function useSubmissions() {
  return useKeyedStorage(storageKeys.submissions, getSubmissions);
}
