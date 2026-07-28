import { Pencil, Trash2, ListChecks, CheckCircle2, Shuffle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Question } from "@/lib/lms-storage";

const TYPE_META = {
  qcm: { label: "اختيار من متعدد", icon: ListChecks },
  true_false: { label: "صح / خطأ", icon: CheckCircle2 },
  matching: { label: "مطابقة", icon: Shuffle },
} as const;

export function QuestionList({
  questions,
  onEdit,
  onDelete,
}: {
  questions: Question[];
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
}) {
  if (questions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">ماكاينش أسئلة بعد. زيد أول سؤال.</p>;
  }

  return (
    <div className="grid gap-3">
      {questions.map((q, i) => {
        const meta = TYPE_META[q.type];
        const Icon = meta.icon;
        return (
          <Card key={q.id} className="flex items-start gap-3 border-border/60 p-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{i + 1}. {q.text}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge variant="outline">{meta.label}</Badge>
                {q.type === "qcm" && <Badge variant="outline">{q.options?.length ?? 0} خيارات</Badge>}
                {q.type === "matching" && <Badge variant="outline">{q.pairs?.length ?? 0} أزواج</Badge>}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(q)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(q.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}