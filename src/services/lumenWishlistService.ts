import { toast } from "sonner";
import { getWishlist, toggleWishlist as toggleWishlistInStorage } from "@/lib/lms-storage";

/**
 * lumenWishlistService — طبقة الكتابة الوحيدة على المفضلة لهذا الملف.
 * مستقلة تمامًا، لا تعتمد على أي خدمة أخرى في المشروع.
 */
export const lumenWishlistService = {
  getIds(): string[] {
    return getWishlist();
  },
  isWishlisted(courseId: string): boolean {
    return getWishlist().includes(courseId);
  },
  toggle(courseId: string, courseTitle?: string) {
    const next = toggleWishlistInStorage(courseId);
    const added = next.includes(courseId);
    toast.success(
      added
        ? courseTitle
          ? `Added "${courseTitle}" to wishlist`
          : "Added to wishlist"
        : courseTitle
          ? `Removed "${courseTitle}" from wishlist`
          : "Removed from wishlist",
    );
    return { ids: next, added };
  },
};