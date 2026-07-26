interface LabelRow {
  name: string;
  count: number;
  color: string;
}

interface LabelTableProps {
  labels: LabelRow[];
  totalOpen: number;
}

export default function LabelTable({ labels, totalOpen }: LabelTableProps) {
  if (labels.length === 0) {
    return <p className="text-muted italic">No label data available.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Top issue labels">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <th className="pb-2 pr-4">Label</th>
            <th className="pb-2 pr-4">Count</th>
            <th className="pb-2">Share</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((l) => (
            <tr key={l.name} className="border-b border-border/50 hover:bg-white/[.02]">
              <td className="py-2 pr-4">
                <span
                  className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: `#${l.color}22`,
                    borderColor: `#${l.color}`,
                    color: `#${l.color}`,
                  }}
                >
                  {l.name}
                </span>
              </td>
              <td className="py-2 pr-4 tabular-nums">{l.count}</td>
              <td className="py-2 tabular-nums">
                {totalOpen > 0 ? `${Math.round((l.count / totalOpen) * 100)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
