import { useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useEnrollments } from "@/hooks/Useenrollments";

type Props = {
  courseId: string;
  courseTitle: string;
  onUnenrolled?: () => void;
  trigger?: ReactNode;
};

/**
 * تأكيد إلغاء التسجيل من دورة. الكتابة الفعلية تمر عبر
 * EnrollmentService.toggle (استدعاءً من useEnrollments) وليس مباشرة.
 */
export function CourseUnenrollDialog({ courseId, courseTitle, onUnenrolled, trigger }: Props) {
  const { unenroll } = useEnrollments();
  const [open, setOpen] = useState(false);

  function confirm() {
    unenroll(courseId);
    setOpen(false);
    onUnenrolled?.();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            Unenroll
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Unenroll from this course?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You'll lose access to your current progress in "{courseTitle}". You can re-enroll at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, unenroll
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}