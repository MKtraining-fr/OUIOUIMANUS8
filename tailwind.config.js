/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx,js,jsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
    './contexts/**/*.{ts,tsx,js,jsx}',
    './services/**/*.{ts,tsx,js,jsx}',
    './types/**/*.{ts,tsx,js,jsx}',
    './constants/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        'brand-background': '#f2f4f8',
        'brand-background-muted': '#e6eaf3',
        'brand-surface': '#ffffff',
        'brand-surface-elevated': '#f9fafc',
        'brand-border': '#d1d7e3',
        'brand-border-strong': '#9aa5b8',
        'brand-text': '#1f2933',
        'brand-text-muted': '#52616f',
        'brand-heading': '#111827',
        'brand-accent': '#2563eb',
        'brand-accent-hover': '#1d4ed8',
        'brand-accent-soft': '#eff4ff',
        'status-success': '#059669',
        'status-success-hover': '#047857',
        'status-info': '#0ea5e9',
        'status-info-hover': '#0284c7',
        'status-warning': '#f59e0b',
        'status-danger': '#dc2626',
        'status-danger-hover': '#b91c1c',
        'brand-dark': '#0f172a'
      }
    }
  },
  plugins: []
};
