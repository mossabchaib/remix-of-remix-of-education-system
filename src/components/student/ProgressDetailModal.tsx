import { useMemo } from "react";
import { CheckCircle2, Circle, FileText, ListChecks, PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { useCourseModules, useLessonProgressMap, useSubmissions } from "@/hooks/useStudentData";
import type { Quiz, Assignment } from "@/lib/lms-storage";
import type { CourseRow } from "@/services/progressReport";

interface ProgressDetailModalProps {
  course: CourseRow | null;
  quizzes: Quiz[];
  assignments: Assignment[];
  attempts: Record<string, { score: number; total: number; at: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProgressDetailModal({
  course,
  quizzes,
  assignments,
  attempts,
  open,
  onOpenChange,
}: ProgressDetailModalProps) {
  // الـ Hooks تُستدعى دائماً بلا شرط — نستعمل "" كقيمة احتياطية عند إغلاق المودال
  const modules = useCourseModules(course?.id ?? "");
  const lessonProgress = useLessonProgressMap(course?.id ?? "");
  const submissionsByAssignment = useSubmissions();

  const courseQuizzes = useMemo(
    () => (course ? quizzes.filter((q) => q.course === course.title) : []),
    [quizzes, course]
  );
  const courseAssignments = useMemo(
    () => (course ? assignments.filter((a) => a.course === course.title) : []),
    [assignments, course]
  );

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course.title}</DialogTitle>
          <DialogDescription>{course.teacher} · {course.level}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall progress</span>
              <span className="text-muted-foreground">{course.done}/{course.total} lessons</span>
            </div>
            <ProgressBar value={course.pct} className="mt-2 h-1.5" />
          </div>

          {/* الوحدات والدروس */}
          <div>
            <p className="mb-2 text-sm font-semibold">Modules & lessons</p>
            <div className="space-y-3">
              {modules.map((m) => {
                const doneInModule = m.lessons.filter((l) => lessonProgress[l.id]).length;
                return (
                  <div key={m.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>{m.title}</span>
                      <span>{doneInModule}/{m.lessons.length}</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {m.lessons.map((l) => {
                        const done = !!lessonProgress[l.id];
                        return (
                          <div key={l.id} className="flex items-center gap-2 text-sm">
                            {done ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span className={done ? "text-foreground" : "text-muted-foreground"}>{l.title}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">{l.kind}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* الاختبارات */}
          {courseQuizzes.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <ListChecks className="h-4 w-4" /> Quizzes
              </p>
              <div className="space-y-2">
                {courseQuizzes.map((q) => {
                  const at = attempts[q.id];
                  return (
                    <div key={q.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                      <span>{q.title}</span>
                      {at ? (
                        <Badge variant="secondary">{Math.round((at.score / at.total) * 100)}%</Badge>
                      ) : (
                        <Badge variant="outline">Not taken</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* الواجبات */}
          {courseAssignments.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <FileText className="h-4 w-4" /> Assignments
              </p>
              <div className="space-y-2">
                {courseAssignments.map((a) => {
                  const subs = submissionsByAssignment[a.id] ?? [];
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                      <div>
                        <p>{a.title}</p>
                        {subs[0] && (
                          <p className="text-xs text-muted-foreground">
                            Last submitted {new Date(subs[0].at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant={a.status === "Graded" ? "secondary" : a.status === "Submitted" ? "outline" : "outline"}>
                        {a.grade ? `${a.status} · ${a.grade}` : a.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {modules.length === 0 && courseQuizzes.length === 0 && courseAssignments.length === 0 && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <PlayCircle className="h-4 w-4" /> No detailed data available for this course yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}