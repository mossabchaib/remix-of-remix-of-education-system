import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  Active: "bg-success/10 text-success border-success/20",
  Published: "bg-success/10 text-success border-success/20",
  Paid: "bg-success/10 text-success border-success/20",
  Trialing: "bg-primary/10 text-primary border-primary/20",
  Pending: "bg-warning/10 text-warning-foreground border-warning/30",
  Draft: "bg-muted text-muted-foreground border-border",
  Archived: "bg-muted text-muted-foreground border-border",
  Canceled: "bg-muted text-muted-foreground border-border",
  Suspended: "bg-destructive/10 text-destructive border-destructive/20",
  Failed: "bg-destructive/10 text-destructive border-destructive/20",
  Refunded: "bg-muted text-muted-foreground border-border",
  "Past due": "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusPill({ value }: { value: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", map[value] ?? "bg-muted text-muted-foreground")}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {value}
    </Badge>
  );
}
