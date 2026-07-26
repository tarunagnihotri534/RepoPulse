import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RepoPulse — Repository Health Checker',
  description: 'On-demand GitHub repository health dashboard',
};

const REPO_URL = 'https://github.com/tarunagnihotri534/RepoPulse';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-base text-text">
        <div className="grid-overlay" aria-hidden="true" />
        <div className="radial-wash" aria-hidden="true" />

        <header className="nav-header sticky top-0 z-50 border-b border-border">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
            <a href="/" className="nav-logo flex items-center gap-2 font-semibold text-text no-underline">
              <span aria-hidden="true" className="nav-logo-dot inline-block h-2.5 w-2.5 rounded-full bg-purple shadow-[0_0_12px_rgba(188,140,255,0.8)]" />
              <span className="font-boogaloo tracking-wide text-lg">RepoPulse</span>
            </a>
            <nav className="flex items-center gap-2">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="github-icon-btn no-underline"
                aria-label="View source on GitHub"
                title="View RepoPulse on GitHub"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/github.png" alt="GitHub" />
              </a>
            </nav>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl mx-auto px-4 py-10">
          {children}
        </main>

        <footer className="relative z-10 border-t border-border text-center text-sm text-muted py-6 mt-10">
          Open-source health metrics for public GitHub repositories
        </footer>
      </body>
    </html>
  );
}
