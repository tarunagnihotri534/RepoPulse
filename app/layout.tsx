import type { Metadata } from 'next';
import FloatingBlocks from '@/components/FloatingBlocks';
import FlickeringGrid from '@/components/FlickeringGrid';
import Header from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'RepoPulse — Repository Health Checker',
  description: 'On-demand GitHub repository health dashboard',
  icons: {
    icon: '/artificial-heart.png',
  },
};

const REPO_URL = 'https://github.com/tarunagnihotri534/RepoPulse';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-base text-text">
        <div className="grid-overlay" aria-hidden="true" />
        <div className="radial-wash" aria-hidden="true" />
        <FlickeringGrid />
        <FloatingBlocks />

        <Header />

        <main className="relative z-10 max-w-5xl mx-auto px-4 py-10">
          {children}
        </main>

        <footer className="relative z-10 border-t border-border text-center text-sm text-muted py-8 mt-10 flex flex-col items-center gap-3">
          <div>Author-Tarun kumar Agnihotri</div>
          <div className="flex items-center justify-center gap-6">
            <a
              href="https://github.com/tarunagnihotri534"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted hover:text-[#58a6ff] transition-all duration-200 no-underline font-medium"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/tarun-agnihotri69"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted hover:text-[#0a66c2] transition-all duration-200 no-underline font-medium"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              LinkedIn
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
