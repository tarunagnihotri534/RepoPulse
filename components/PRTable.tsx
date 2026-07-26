import type { GitHubPullRequest } from '@/lib/types';

interface PRTableProps {
  prs: GitHubPullRequest[];
  owner: string;
  repo: string;
}

const stateStyles: Record<string, string> = {
  OPEN:   'bg-success/10 text-success',
  CLOSED: 'bg-muted/10   text-muted',
  MERGED: 'bg-purple/10  text-purple',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PRTable({ prs, owner, repo }: PRTableProps) {
  if (prs.length === 0) {
    return <p className="text-muted italic">No pull request data available.</p>;
  }
  const shown = prs.slice(0, 25);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Recent pull requests">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <th className="pb-2 pr-3">#</th>
            <th className="pb-2 pr-3">Title</th>
            <th className="pb-2 pr-3">State</th>
            <th className="pb-2 pr-3">Author</th>
            <th className="pb-2 pr-3">Opened</th>
            <th className="pb-2">Reviews</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((pr) => (
            <tr key={pr.number} className="border-b border-border/50 hover:bg-white/[.02]">
              <td className="py-2 pr-3 tabular-nums">
                <a
                  href={`https://github.com/${owner}/${repo}/pull/${pr.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  #{pr.number}
                </a>
              </td>
              <td className="py-2 pr-3 max-w-xs truncate" title={pr.title}>
                {pr.title}
              </td>
              <td className="py-2 pr-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    stateStyles[pr.state] ?? stateStyles['CLOSED']
                  }`}
                >
                  {pr.state.toLowerCase()}
                </span>
              </td>
              <td className="py-2 pr-3">{pr.author?.login ?? '—'}</td>
              <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{fmt(pr.createdAt)}</td>
              <td className="py-2 tabular-nums">{pr.reviews.totalCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {prs.length > 25 && (
        <p className="mt-2 text-xs text-muted">Showing 25 of {prs.length} pull requests.</p>
      )}
    </div>
  );
}
