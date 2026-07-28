import { useState } from "react";
import { Plus, Trash2, CircleCheck } from "lucide-react";
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

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "qcm", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "matching", label: "Matching" },
];

function genId() {
  return Math.random().toString(36).slice(2, 8);
}

export function QuestionForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Question;
  onSubmit: (q: Omit<Question, "id"> & { id?: string }) => void;
  onCancel: () => void;
}) {
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
    setCorrectOptionIndexes((cur) =>
      cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!text.trim()) {
      setError("Question text is required.");
      return;
    }

    if (type === "qcm") {
      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
      if (cleanOptions.length < 2) {
        setError("Add at least 2 options.");
        return;
      }
      if (correctOptionIndexes.length === 0) {
        setError("Mark at least one option as correct.");
        return;
      }
      onSubmit({ id: initial?.id, type, text: text.trim(), options: cleanOptions, correctOptionIndexes });
    } else if (type === "true_false") {
      onSubmit({ id: initial?.id, type, text: text.trim(), correctBoolean });
    } else {
      const cleanPairs = pairs.filter((p) => p.left.trim() && p.right.trim());
      if (cleanPairs.length < 2) {
        setError("Add at least 2 complete pairs.");
        return;
      }
      onSubmit({ id: initial?.id, type, text: text.trim(), pairs: cleanPairs });
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Question type</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Question text</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Type the question…"
          className="resize-none"
        />
      </div>

      {type === "qcm" && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label>Options</Label>
            <span className="text-xs text-muted-foreground">Check the correct answer(s)</span>
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
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors",
                      isCorrect ? "border-success bg-success text-white" : "border-border text-transparent"
                    )}
                    aria-label="Mark as correct"
                  >
                    <CircleCheck className="h-4 w-4" />
                  </button>
                  <Input
                    value={opt}
                    placeholder={`Option ${idx + 1}`}
                    onChange={(e) => {
                      const next = [...options];
                      next[idx] = e.target.value;
                      setOptions(next);
                    }}
                    className="border-none bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
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
          <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ""])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add option
          </Button>
        </div>
      )}

      {type === "true_false" && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
          <div>
            <Label>Correct answer</Label>
            <p className="text-xs text-muted-foreground">Toggle the correct value for this statement.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm", !correctBoolean ? "font-semibold text-foreground" : "text-muted-foreground")}>False</span>
            <Switch checked={correctBoolean} onCheckedChange={setCorrectBoolean} />
            <span className={cn("text-sm", correctBoolean ? "font-semibold text-foreground" : "text-muted-foreground")}>True</span>
          </div>
        </div>
      )}

      {type === "matching" && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label>Pairs</Label>
            <span className="text-xs text-muted-foreground">Left column ↔ correct right match</span>
          </div>
          <div className="space-y-2">
            {pairs.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-2">
                <Input
                  value={p.left}
                  placeholder="Left item"
                  onChange={(e) => {
                    const next = [...pairs];
                    next[idx] = { ...p, left: e.target.value };
                    setPairs(next);
                  }}
                />
                <span className="shrink-0 text-muted-foreground">↔</span>
                <Input
                  value={p.right}
                  placeholder="Correct match"
                  onChange={(e) => {
                    const next = [...pairs];
                    next[idx] = { ...p, right: e.target.value };
                    setPairs(next);
                  }}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => setPairs(pairs.filter((x) => x.id !== p.id))}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPairs([...pairs, { id: genId(), left: "", right: "" }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add pair
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initial ? "Save changes" : "Add question"}</Button>
      </div>
    </form>
  );
}