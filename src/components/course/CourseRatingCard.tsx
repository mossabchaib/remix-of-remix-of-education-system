import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Star, Loader2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCourseRatings, getMyRating, rateCourse, type CourseRatingSummary } from "@/lib/lms-storage";

export function CourseRatingCard({ courseId }: { courseId: string }) {
  const { t } = useTranslation();

  const [summary, setSummary] = useState<CourseRatingSummary>({
    course_id: courseId,
    average_rating: 0,
    total_ratings: 0,
  });
  const [myRating, setMyRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const refresh = useCallback(async () => {
    const [s, mine] = await Promise.all([getCourseRatings(courseId), getMyRating(courseId)]);
    setSummary(s);
    setMyRating(mine?.rating ?? 0);
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const handleRate = async (value: number) => {
    if (submitting) return;
    const previous = myRating;
    setMyRating(value); // optimistic update فورية
    setSubmitting(true);
    try {
      await rateCourse(courseId, value);
      await refresh(); // نحدث المعدل العام بعد الحفظ
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
    } catch {
      setMyRating(previous); // rollback عند الفشل
    } finally {
      setSubmitting(false);
    }
  };

  const displayValue = hoverRating || myRating;

  return (
    <Card className="border-border/60 p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t("courseRating.title", "قيّم هذا الكورس")}</p>
        {loaded && summary.total_ratings > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">{summary.average_rating}</span>
            <span>({t("courseRating.count", "{{count}} تقييم", { count: summary.total_ratings })})</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
        {!loaded ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("courseRating.loading", "جارٍ التحميل...")}
          </div>
        ) : (
          [1, 2, 3, 4, 5].map((value) => {
            const filled = value <= displayValue;
            return (
              <button
                key={value}
                type="button"
                disabled={submitting}
                onMouseEnter={() => setHoverRating(value)}
                onFocus={() => setHoverRating(value)}
                onBlur={() => setHoverRating(0)}
                onClick={() => handleRate(value)}
                aria-label={t("courseRating.star", "{{value}} نجوم", { value })}
                className={cn(
                  "group relative rounded-md p-0.5 transition-transform duration-150",
                  "hover:scale-110 active:scale-95",
                  submitting && "cursor-wait opacity-70",
                )}
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition-all duration-150",
                    filled
                      ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]"
                      : "fill-transparent text-muted-foreground/40 group-hover:text-amber-300",
                  )}
                />
              </button>
            );
          })
        )}

        {submitting && <Loader2 className="ms-2 h-4 w-4 animate-spin text-muted-foreground" />}
        {justSaved && !submitting && (
          <span className="ms-2 inline-flex items-center gap-1 text-xs font-medium text-success">
            <Check className="h-3.5 w-3.5" />
            {t("courseRating.saved", "تم الحفظ")}
          </span>
        )}
      </div>

      {loaded && myRating > 0 && !submitting && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("courseRating.yourRating", "تقييمك: {{value}} من 5", { value: myRating })}
        </p>
      )}
      {loaded && myRating === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("courseRating.prompt", "شاركنا رأيك، تقييمك يساعد الطلاب الآخرين")}
        </p>
      )}
    </Card>
  );
}