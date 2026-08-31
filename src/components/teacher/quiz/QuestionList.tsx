import { Pencil, Trash2, ListChecks, CheckCircle2, Shuffle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/lms-storage";

export function QuestionList({
  questions,
  onEdit,
  onDelete,
  disabled = false,
  deletingId = null,
}: {
  questions: Question[];
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  deletingId?: string | null;
}) {
  const { t } = useTranslation();

  const TYPE_META = {
    qcm: { label: t("teacherQuizEditorCard.questionList.types.qcm"), icon: ListChecks },
    true_false: { label: t("teacherQuizEditorCard.questionList.types.trueFalse"), icon: CheckCircle2 },
    matching: { label: t("teacherQuizEditorCard.questionList.types.matching"), icon: Shuffle },
  } as const;

  if (questions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("teacherQuizEditorCard.questionList.empty")}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {questions.map((q, i) => {
        const meta = TYPE_META[q.type];
        const Icon = meta.icon;
        const isDeletingThis = deletingId === q.id;
        const rowDisabled = disabled || isDeletingThis;
        return (
          <Card
            key={q.id}
            className={cn(
              "flex items-start gap-3 border-border/60 p-4 transition-opacity",
              isDeletingThis && "opacity-60"
            )}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{i + 1}. {q.text}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge variant="outline">{meta.label}</Badge>
                {q.type === "qcm" && (
                  <Badge variant="outline">
                    {t("teacherQuizEditorCard.questionList.optionsCount", { count: q.options?.length ?? 0 })}
                  </Badge>
                )}
                {q.type === "matching" && (
                  <Badge variant="outline">
                    {t("teacherQuizEditorCard.questionList.pairsCount", { count: q.pairs?.length ?? 0 })}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(q)}
                disabled={rowDisabled}
                aria-label={t("teacherQuizEditorCard.questionList.editAria")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(q.id)}
                disabled={rowDisabled}
                aria-label={t("teacherQuizEditorCard.questionList.deleteAria")}
                className="hover:bg-destructive/10"
              >
                {isDeletingThis ? (
                  <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                )}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}