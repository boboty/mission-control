import { useState } from 'react';

export interface FilterState {
  status: string;
  owner: string;
  priority: string;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'todo', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'done', label: '已完成' },
];

const OWNER_OPTIONS = [
  { value: '', label: '全部负责人' },
  { value: 'main', label: 'main' },
  { value: 'agent_code', label: 'agent_code' },
  { value: 'feishu_main', label: 'feishu_main' },
  { value: 'baotedu', label: 'baotedu' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: '全部优先级' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const handleChange = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="筛选选项">
      <select
        value={filters.status}
        onChange={(e) => handleChange('status', e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--border-medium)] dark:hover:border-[var(--border-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] dark:focus:ring-offset-[var(--bg-tertiary)] cursor-pointer"
        aria-label="按状态筛选"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filters.owner}
        onChange={(e) => handleChange('owner', e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--border-medium)] dark:hover:border-[var(--border-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] dark:focus:ring-offset-[var(--bg-tertiary)] cursor-pointer"
        aria-label="按负责人筛选"
      >
        {OWNER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filters.priority}
        onChange={(e) => handleChange('priority', e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--border-medium)] dark:hover:border-[var(--border-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] dark:focus:ring-offset-[var(--bg-tertiary)] cursor-pointer"
        aria-label="按优先级筛选"
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export type { FilterBarProps };
