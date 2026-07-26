import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MCP Repo Health Tracker',
  description: 'On-demand GitHub repository health dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
        <header className="sticky top-0 z-50 border-b border-border bg-surface px-6 py-0 h-14 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 font-semibold text-[#c9d1d9] hover:text-accent no-underline">
            <span aria-hidden="true">📊</span>
            MCP Health Tracker
          </a>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-10">
          {children}
        </main>
        <footer className="border-t border-border text-center text-sm text-muted py-6 mt-10">
          Open-source health metrics for public GitHub repositories
        </footer>
      </body>
    </html>
  );
}
