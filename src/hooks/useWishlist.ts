import { useCallback } from "react";
import { getWishlist, storageKeys } from "@/lib/lms-storage";
import { lumenWishlistService } from "@/services/lumenWishlistService";
import { useKeyedStorage } from "./useLmsStorage";

export function useWishlist() {
  const ids = useKeyedStorage(storageKeys.wishlist, getWishlist);
  const isWishlisted = useCallback((courseId: string) => ids.includes(courseId), [ids]);
  const toggle = useCallback((courseId: string, courseTitle?: string) => {
    return lumenWishlistService.toggle(courseId, courseTitle);
  }, []);
  return { ids, isWishlisted, toggle };
}