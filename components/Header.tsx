'use client';

import { useState, useEffect, useRef } from 'react';

const REPO_URL = 'https://github.com/tarunagnihotri534/RepoPulse';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNavClick = (id: string) => {
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 70;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <header className="nav-header sticky top-0 z-50 border-b border-border">
      <div className="mx-auto max-w-6xl px-4 md:px-8 h-14 flex items-center justify-between relative">
        {/* Logo */}
        <a href="/" className="nav-logo flex items-center gap-2 font-semibold text-text no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/artificial-heart.png"
            alt="RepoPulse Logo"
            className="h-7 w-7 object-contain"
            style={{ filter: 'drop-shadow(0 0 8px rgba(188, 140, 255, 0.55))' }}
          />
          <span className="font-boogaloo tracking-wide text-lg">RepoPulse</span>
        </a>

        {/* Navigation & Menu Button */}
        <div className="flex items-center gap-4" ref={menuRef}>
          {/* Horizontal links - visible on md and above */}
          <nav className="hidden md:flex items-center gap-6 mr-2">
            <button
              onClick={() => handleNavClick('system-design')}
              className="text-xs font-semibold text-muted hover:text-[#bc8cff] hover:opacity-100 transition-colors duration-150 bg-transparent border-none cursor-pointer focus:outline-none"
            >
              3D Architecture
            </button>
            <button
              onClick={() => handleNavClick('how-it-works')}
              className="text-xs font-semibold text-muted hover:text-[#bc8cff] hover:opacity-100 transition-colors duration-150 bg-transparent border-none cursor-pointer focus:outline-none"
            >
              Console Demo
            </button>
            <button
              onClick={() => handleNavClick('features')}
              className="text-xs font-semibold text-muted hover:text-[#bc8cff] hover:opacity-100 transition-colors duration-150 bg-transparent border-none cursor-pointer focus:outline-none"
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick('docs')}
              className="text-xs font-semibold text-muted hover:text-[#bc8cff] hover:opacity-100 transition-colors duration-150 bg-transparent border-none cursor-pointer focus:outline-none"
            >
              Documentation
            </button>
          </nav>

          {/* GitHub link icon (keeps existing layout) */}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="github-icon-btn no-underline hidden xs:flex"
            aria-label="View source on GitHub"
            title="View RepoPulse on GitHub"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/github.png" alt="GitHub" />
          </a>

          {/* Menu Button with 3 vertical sticks - hidden on md and above */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex md:hidden items-center justify-center p-2 rounded-lg text-muted hover:text-white transition-colors duration-200 border border-transparent hover:border-[#30363d] focus:outline-none"
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
            style={{ backgroundColor: isOpen ? 'rgba(48, 54, 61, 0.2)' : 'transparent' }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="6" y1="4" x2="6" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="18" y1="4" x2="18" y2="20" />
            </svg>
          </button>

          {/* Dropdown Menu Option List */}
          {isOpen && (
            <div
              className="absolute right-4 top-12 w-48 rounded-xl border z-50 flex flex-col py-2"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'rgba(22, 27, 34, 0.95)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.7), 0 1px 0 rgba(255,255,255,0.02) inset',
              }}
            >
              <button
                onClick={() => handleNavClick('system-design')}
                className="text-left px-4 py-2 text-xs font-semibold hover:text-[#bc8cff] transition-colors duration-150 w-full"
                style={{ color: 'var(--text)', backgroundColor: 'transparent', border: 'none' }}
              >
                3D Architecture
              </button>
              <button
                onClick={() => handleNavClick('how-it-works')}
                className="text-left px-4 py-2 text-xs font-semibold hover:text-[#bc8cff] transition-colors duration-150 w-full"
                style={{ color: 'var(--text)', backgroundColor: 'transparent', border: 'none' }}
              >
                Console Demo
              </button>
              <button
                onClick={() => handleNavClick('features')}
                className="text-left px-4 py-2 text-xs font-semibold hover:text-[#bc8cff] transition-colors duration-150 w-full"
                style={{ color: 'var(--text)', backgroundColor: 'transparent', border: 'none' }}
              >
                Features
              </button>
              <button
                onClick={() => handleNavClick('docs')}
                className="text-left px-4 py-2 text-xs font-semibold hover:text-[#bc8cff] transition-colors duration-150 w-full"
                style={{ color: 'var(--text)', backgroundColor: 'transparent', border: 'none' }}
              >
                Documentation
              </button>
              <div className="h-[1px] my-1" style={{ backgroundColor: 'var(--border)' }} />
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-semibold hover:text-[#bc8cff] transition-colors duration-150 no-underline flex items-center justify-between"
                style={{ color: 'var(--text)' }}
              >
                <span>GitHub Repo</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
