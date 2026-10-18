import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {typeof delta === "number" ? <DeltaBadge delta={delta} /> : null}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (!Number.isFinite(delta) || delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
        <Minus className="size-3" />
        no change
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={
        positive
          ? "inline-flex items-center gap-0.5 font-medium text-green-600 dark:text-green-400"
          : "inline-flex items-center gap-0.5 font-medium text-red-600 dark:text-red-400"
      }
    >
      {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}
