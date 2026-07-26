interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number | null;
  deltaLabel?: string;
}

export default function StatCard({ label, value, delta, deltaLabel }: StatCardProps) {
  const hasDelta = delta !== undefined && delta !== null;
  const up = hasDelta && delta! > 0;
  const down = hasDelta && delta! < 0;

  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface p-5 text-center">
      <span className="text-3xl font-bold leading-none">{value}</span>
      <span className="text-xs uppercase tracking-wider text-muted">
        {label}
        {hasDelta && (
          <span
            className={`ml-2 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              up   ? 'bg-success/10 text-success' :
              down ? 'bg-danger/10  text-danger'  :
                     'bg-muted/10   text-muted'
            }`}
            title={deltaLabel}
          >
            {up ? '+' : ''}{delta}
          </span>
        )}
      </span>
    </div>
  );
}
