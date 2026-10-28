const statusStyles: Record<string, string> = {
  Fit: "bg-success/15 text-success border-success/30",
  "Held up": "bg-warning/20 text-warning-foreground border-warning/40",
  Pending: "bg-warning/20 text-warning-foreground border-warning/40",
  Unfit: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ label }: { label?: string | null }) {
  const value = label || "Pending";
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${statusStyles[value] || statusStyles.Pending}`}>
      {value}
    </span>
  );
}
