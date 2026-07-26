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
        // Match the dark GitHub-style palette from the original CSS tokens
        surface:  '#161b22',
        border:   '#30363d',
        muted:    '#8b949e',
        accent:   '#58a6ff',
        success:  '#3fb950',
        warning:  '#d29922',
        danger:   '#f85149',
        purple:   '#bc8cff',
      },
      backgroundColor: {
        base: '#0d1117',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
