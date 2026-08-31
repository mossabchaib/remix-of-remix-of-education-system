import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, CircleCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Question, QuestionType, MatchingPair } from "@/lib/lms-storage";

function genId() {
  return Math.random().toString(36).slice(2, 8);
}

export function QuestionForm({
  initial,
  onSubmit,
  onCancel,
  submitting = false,
}: {
  initial?: Question;
  onSubmit: (q: Omit<Question, "id"> & { id?: string }) => void;
  onCancel: () => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();

  const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
    { value: "qcm", label: t("teacherQuizEditorCard.questionForm.types.qcm") },
    { value: "true_false", label: t("teacherQuizEditorCard.questionForm.types.trueFalse") },
    { value: "matching", label: t("teacherQuizEditorCard.questionForm.types.matching") },
  ];

  const [type, setType] = useState<QuestionType>(initial?.type ?? "qcm");
  const [text, setText] = useState(initial?.text ?? "");
  const [error, setError] = useState<string | null>(null);

  const [options, setOptions] = useState<string[]>(initial?.options ?? ["", ""]);
  const [correctOptionIndexes, setCorrectOptionIndexes] = useState<number[]>(
    initial?.correctOptionIndexes ?? []
  );

  const [correctBoolean, setCorrectBoolean] = useState<boolean>(initial?.correctBoolean ?? true);

  const [pairs, setPairs] = useState<MatchingPair[]>(
    initial?.pairs ?? [
      { id: genId(), left: "", right: "" },
      { id: genId(), left: "", right: "" },
    ]
  );

  function toggleCorrectOption(idx: number) {
    if (submitting) return;
    setCorrectOptionIndexes((cur) =>
      cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!text.trim()) {
      setError(t("teacherQuizEditorCard.questionForm.errors.textRequired"));
      return;
    }

    if (type === "qcm") {
      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
      if (cleanOptions.length < 2) {
        setError(t("teacherQuizEditorCard.questionForm.errors.minOptions"));
        return;
      }
      if (correctOptionIndexes.length === 0) {
        setError(t("teacherQuizEditorCard.questionForm.errors.needCorrectOption"));
        return;
      }
      onSubmit({ id: initial?.id, type, text: text.trim(), options: cleanOptions, correctOptionIndexes });
    } else if (type === "true_false") {
      onSubmit({ id: initial?.id, type, text: text.trim(), correctBoolean });
    } else {
      const cleanPairs = pairs.filter((p) => p.left.trim() && p.right.trim());
      if (cleanPairs.length < 2) {
        setError(t("teacherQuizEditorCard.questionForm.errors.minPairs"));
        return;
      }
      onSubmit({ id: initial?.id, type, text: text.trim(), pairs: cleanPairs });
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("teacherQuizEditorCard.questionForm.fields.type")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuestionType)} disabled={submitting}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("teacherQuizEditorCard.questionForm.fields.text")}</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={t("teacherQuizEditorCard.questionForm.fields.textPlaceholder")}
          className="resize-none"
          disabled={submitting}
        />
      </div>

      {type === "qcm" && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label>{t("teacherQuizEditorCard.questionForm.options.label")}</Label>
            <span className="text-xs text-muted-foreground">{t("teacherQuizEditorCard.questionForm.options.hint")}</span>
          </div>
          <div className="space-y-2">
            {options.map((opt, idx) => {
              const isCorrect = correctOptionIndexes.includes(idx);
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                    isCorrect ? "border-success/40 bg-success/5" : "border-border/60"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleCorrectOption(idx)}
                    disabled={submitting}
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      isCorrect ? "border-success bg-success text-white" : "border-border text-transparent"
                    )}
                    aria-label={t("teacherQuizEditorCard.questionForm.options.markCorrect")}
                  >
                    <CircleCheck className="h-4 w-4" />
                  </button>
                  <Input
                    value={opt}
                    placeholder={t("teacherQuizEditorCard.questionForm.options.placeholder", { index: idx + 1 })}
                    onChange={(e) => {
                      const next = [...options];
                      next[idx] = e.target.value;
                      setOptions(next);
                    }}
                    disabled={submitting}
                    className="border-none bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={submitting}
                    onClick={() => {
                      setOptions(options.filter((_, i) => i !== idx));
                      setCorrectOptionIndexes(
                        correctOptionIndexes.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i))
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => setOptions([...options, ""])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> {t("teacherQuizEditorCard.questionForm.options.add")}
          </Button>
        </div>
      )}

      {type === "true_false" && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
          <div>
            <Label>{t("teacherQuizEditorCard.questionForm.trueFalse.label")}</Label>
            <p className="text-xs text-muted-foreground">{t("teacherQuizEditorCard.questionForm.trueFalse.hint")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm", !correctBoolean ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {t("teacherQuizEditorCard.questionForm.trueFalse.false")}
            </span>
            <Switch checked={correctBoolean} onCheckedChange={setCorrectBoolean} disabled={submitting} />
            <span className={cn("text-sm", correctBoolean ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {t("teacherQuizEditorCard.questionForm.trueFalse.true")}
            </span>
          </div>
        </div>
      )}

      {type === "matching" && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label>{t("teacherQuizEditorCard.questionForm.matching.label")}</Label>
            <span className="text-xs text-muted-foreground">{t("teacherQuizEditorCard.questionForm.matching.hint")}</span>
          </div>
          <div className="space-y-2">
            {pairs.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-2">
                <Input
                  value={p.left}
                  placeholder={t("teacherQuizEditorCard.questionForm.matching.leftPlaceholder")}
                  onChange={(e) => {
                    const next = [...pairs];
                    next[idx] = { ...p, left: e.target.value };
                    setPairs(next);
                  }}
                  disabled={submitting}
                />
                <span className="shrink-0 text-muted-foreground">↔</span>
                <Input
                  value={p.right}
                  placeholder={t("teacherQuizEditorCard.questionForm.matching.rightPlaceholder")}
                  onChange={(e) => {
                    const next = [...pairs];
                    next[idx] = { ...p, right: e.target.value };
                    setPairs(next);
                  }}
                  disabled={submitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={submitting}
                  onClick={() => setPairs(pairs.filter((x) => x.id !== p.id))}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => setPairs([...pairs, { id: genId(), left: "", right: "" }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> {t("teacherQuizEditorCard.questionForm.matching.add")}
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {t("teacherQuizEditorCard.questionForm.actions.cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              {t("teacherQuizEditorCard.questionForm.actions.saving")}
            </>
          ) : initial ? (
            t("teacherQuizEditorCard.questionForm.actions.save")
          ) : (
            t("teacherQuizEditorCard.questionForm.actions.add")
          )}
        </Button>
      </div>
    </form>
  );
}