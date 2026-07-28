import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateRangeValue } from "@/hooks/useRevenueAnalytics";

const OPTIONS: { value: DateRangeValue; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

type Props = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
};

export function DateRangeSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRangeValue)}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="All time" />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}