interface Metric {
  label: string;
  value: string;
}

interface MetricsGridProps {
  metrics: Metric[];
}

export default function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {metrics.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4"
        >
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-xs text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}
