import { Button } from "@/components/ui/button";
import type { DateRangeKey } from "@/hooks/useReportsData";

const OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeKey;
  onChange: (value: DateRangeKey) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.key}
          size="sm"
          variant={value === opt.key ? "default" : "ghost"}
          className="h-7 px-3 text-xs"
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}