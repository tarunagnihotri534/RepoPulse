import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // All tokens used in utility classes must live here so
        // bg-* / text-* / border-* / ring-* variants resolve.
        base:     '#0d1117',
        surface:  '#161b22',
        border:   '#30363d',
        text:     '#c9d1d9',
        muted:    '#8b949e',
        accent:   '#58a6ff',
        success:  '#3fb950',
        warning:  '#d29922',
        danger:   '#f85149',
        purple:   '#bc8cff',
        'purple-cta': '#a371f7',
      },
      fontFamily: {
        sans:     ['system-ui', '-apple-system', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        mono:     ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
        boogaloo:  ['Boogaloo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
