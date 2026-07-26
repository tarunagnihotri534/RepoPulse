import Image from 'next/image';

interface Contributor {
  login: string;
  contributions: number;
  avatarUrl: string;
}

interface ContributorListProps {
  contributors: Contributor[];
}

export default function ContributorList({ contributors }: ContributorListProps) {
  if (contributors.length === 0) {
    return <p className="text-muted italic">No contributor data available.</p>;
  }
  return (
    <ol className="flex flex-col gap-2" aria-label="Top contributors">
      {contributors.map((c, i) => (
        <li
          key={c.login}
          className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
        >
          <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
          <Image
            src={c.avatarUrl}
            alt={`${c.login} avatar`}
            width={36}
            height={36}
            className="rounded-full"
          />
          <a
            href={`https://github.com/${c.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
          >
            {c.login}
          </a>
          <span className="ml-auto text-sm text-muted">{c.contributions} commits</span>
        </li>
      ))}
    </ol>
  );
}
