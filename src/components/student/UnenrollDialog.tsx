import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as EnrollmentService from "@/services/enrollmentService";
import { toast } from "sonner";

type UnenrollDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
};

export function UnenrollDialog({ open, onOpenChange, courseId, courseTitle }: UnenrollDialogProps) {
  const handleConfirm = () => {
    // الكتابة تمر حصرياً عبر الـ Service → toggleEnrollment → emit("lms:storage-change")
    EnrollmentService.toggle(courseId);
    toast.success(`Unenrolled from "${courseTitle}"`);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unenroll from this course?</AlertDialogTitle>
          <AlertDialogDescription>
            You'll lose quick access to <span className="font-medium text-foreground">{courseTitle}</span> from
            My Courses. Your progress and notes stay saved — re-enrolling will restore them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Unenroll
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}