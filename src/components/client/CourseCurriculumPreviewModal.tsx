import { BookOpen, FileText, HelpCircle, Lock, PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Lesson } from "@/lib/lms-storage";

const kindMeta: Record<Lesson["kind"], { icon: typeof PlayCircle; label: string }> = {
  video: { icon: PlayCircle, label: "Video" },
  reading: { icon: FileText, label: "Reading" },
  quiz: { icon: HelpCircle, label: "Quiz" },
};

type PreviewLesson = Lesson & { moduleTitle?: string };

type Props = {
  lesson: PreviewLesson | null;
  isEnrolled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** enrolled → الذهاب للدرس داخل لوحة الطالب. غير enrolled → بدء التسجيل/الشراء. */
  onGoToCourse?: () => void;
};

/**
 * معاينة سريعة لدرس ضمن تبويب Curriculum. لا تقرأ ولا تكتب في التخزين
 * مباشرة — تستقبل بياناتها بالكامل عبر props من الصفحة المستدعية.
 */
export function CourseCurriculumPreviewModal({ lesson, isEnrolled, open, onOpenChange, onGoToCourse }: Props) {
  if (!lesson) return null;
  const meta = kindMeta[lesson.kind];
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base leading-snug">{lesson.title}</DialogTitle>
              {lesson.moduleTitle && (
                <p className="truncate text-xs text-muted-foreground">{lesson.moduleTitle}</p>
              )}
            </div>
          </div>
          <DialogDescription asChild>
            <span className="flex items-center gap-2 pt-2">
              <Badge variant="outline">{meta.label}</Badge>
              <span className="text-xs text-muted-foreground">{lesson.duration}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-8 text-center">
          {isEnrolled ? (
            <>
              <Icon className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                This lesson is available in your student dashboard.
              </p>
            </>
          ) : (
            <>
              <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Enroll in this course to unlock this lesson and track your progress.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={onGoToCourse}>
            {isEnrolled ? (
              <>
                <BookOpen className="mr-1.5 h-4 w-4" /> Open lesson in my course
              </>
            ) : (
              "Enroll to unlock"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}