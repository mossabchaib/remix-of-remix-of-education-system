import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/hooks/useWishlist";

type Props = {
  courseId: string;
  courseTitle?: string;
  /** icon: زر دائري صغير فوق غلاف البطاقة. full: زر كامل العرض بنص، مثل صفحة التفاصيل. */
  variant?: "icon" | "full";
  className?: string;
};

/**
 * زر المفضلة الموحّد. يُستعمل داخل بطاقة الدورة في الكتالوج وفي صفحة
 * التفاصيل، ويعتمد حصراً على useWishlist()/wishlistService للقراءة
 * والكتابة — لا يلمس lms-storage أو localStorage مباشرة.
 */
export function CourseWishlistButton({ courseId, courseTitle, variant = "icon", className }: Props) {
  const { isWishlisted, toggle } = useWishlist();
  const wished = isWishlisted(courseId);

  function handleClick(e: React.MouseEvent) {
    // البطاقة نفسها Link قابل للنقر — نمنع فتح صفحة التفاصيل عند الضغط على القلب.
    e.preventDefault();
    e.stopPropagation();
    toggle(courseId, courseTitle);
  }

  if (variant === "full") {
    return (
      <Button variant="outline" size="lg" className={cn("w-full", className)} onClick={handleClick}>
        <Heart className={cn("mr-1.5 h-4 w-4", wished && "fill-primary text-primary")} />
        {wished ? "In wishlist" : "Add to wishlist"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wished}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition hover:bg-background",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", wished && "fill-primary text-primary")} />
    </button>
  );
}