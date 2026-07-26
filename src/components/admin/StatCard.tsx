import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden border-border/60 p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {delta !== undefined && (
        <div className={cn("mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} {Math.abs(delta)}%
          <span className="text-muted-foreground font-normal ml-1">vs last mo.</span>
        </div>
      )}
    </Card>
  );
}
