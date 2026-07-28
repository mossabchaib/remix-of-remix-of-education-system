import {
  toggleWishlist as _toggleWishlist,
  getWishlist,
} from "@/lib/lms-storage";

/**
 * WishlistService — الطبقة الوحيدة المسموح لها بالكتابة على lms.wishlist.
 * كل الدوال هنا تمر عبر lms-storage.ts (writeJSON + emit) دون تكرار المنطق،
 * فقط توفّر عقداً (contract) ثابتاً (list/has/toggle/remove) يسهل استبداله
 * لاحقاً بـ API حقيقي دون تغيير أي صفحة تستدعيه.
 */
export const WishlistService = {
  list(): string[] {
    return getWishlist();
  },
  has(courseId: string): boolean {
    return getWishlist().includes(courseId);
  },
  /** يضيف أو يزيل الكورس من المفضلة، ويرجع القائمة المحدَّثة. */
  toggle(courseId: string): string[] {
    return _toggleWishlist(courseId);
  },
  /** إزالة صريحة وآمنة (idempotent) — لا تفعل شيئاً إن كان الكورس غير موجود أصلاً. */
  remove(courseId: string): string[] {
    if (this.has(courseId)) return this.toggle(courseId);
    return getWishlist();
  },
  /** إضافة صريحة وآمنة (idempotent). */
  add(courseId: string): string[] {
    if (!this.has(courseId)) return this.toggle(courseId);
    return getWishlist();
  },
};