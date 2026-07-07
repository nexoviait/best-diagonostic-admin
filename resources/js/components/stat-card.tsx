import { ReactNode } from "react";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "muted";
  children?: ReactNode;
}

const tones: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function StatCard({ label, value, delta, icon: Icon, tone = "primary", children }: StatCardProps) {
  return (
    <div className="card-surface p-5 transition-shadow hover:shadow-[var(--shadow-elevated)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {delta && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-success">
          <ArrowUpRight className="h-3.5 w-3.5" />
          {delta}
        </div>
      )}
      {children}
    </div>
  );
}
