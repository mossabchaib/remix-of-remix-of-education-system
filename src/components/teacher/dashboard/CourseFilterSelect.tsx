import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CourseOption = { id: string; title: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: CourseOption[];
};

export function CourseFilterSelect({ value, onChange, options }: Props) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="All courses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All courses</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}