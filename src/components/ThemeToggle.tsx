'use client';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/lib/useTheme';

function getThemeLabel(theme: 'light' | 'dark' | 'system') {
  switch (theme) {
    case 'light':
      return '浅色';
    case 'dark':
      return '深色';
    default:
      return '跟随系统';
  }
}

function getThemeIcon(theme: 'light' | 'dark' | 'system') {
  switch (theme) {
    case 'light':
      return 'sun';
    case 'dark':
      return 'moon';
    default:
      return 'monitor';
  }
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const label = getThemeLabel(theme);
  const icon = getThemeIcon(theme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] ${
        compact ? 'w-[44px] px-0' : 'px-3 py-2'
      }`}
      title={`切换主题（当前：${label}）`}
      aria-label={`切换主题，当前${label}`}
    >
      <Icon name={icon} size={18} />
      {!compact && <span className="ml-2 text-sm font-medium">{label}</span>}
    </button>
  );
}
