import { Link } from "@tanstack/react-router";
import { BookOpen, PlayCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { flatLessons } from "@/lib/lms-storage";
import type { Course } from "@/lib/mock-data";

type Props = {
  course: Course | null;
  progressPct: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuickResumeDialog({ course, progressPct, open, onOpenChange }: Props) {
  if (!course) return null;

  const lessons = flatLessons(course.id);
  const doneCount = Math.round((progressPct / 100) * lessons.length);
  const nextLesson = lessons[doneCount] ?? lessons[lessons.length - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            {course.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {course.teacher} · {course.category}
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Overall progress</span>
              <span className="font-medium text-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>

          {nextLesson && (
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Up next</p>
              <p className="text-sm font-medium">{nextLesson.title}</p>
              <p className="text-xs text-muted-foreground">{nextLesson.duration}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-1.5 h-4 w-4" /> Close
          </Button>
          <Button asChild>
            <Link to="/dashboard/student/courses/$id" params={{ id: course.id }}>
              <PlayCircle className="mr-1.5 h-4 w-4" /> Resume learning
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}