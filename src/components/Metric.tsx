'use client';

import React from 'react';
import { Icon } from './Icon';

interface MetricProps {
  label: string;
  value: number | string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
  loading?: boolean;
}

const colorMap = {
  blue: { 
    bg: 'bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)]', 
    icon: 'bg-blue-500', 
    text: 'text-[var(--color-primary)] dark:text-[var(--color-primary-hover)]' 
  },
  emerald: { 
    bg: 'bg-[var(--badge-success-bg)] dark:bg-[var(--badge-success-bg)]', 
    icon: 'bg-emerald-500', 
    text: 'text-[var(--badge-success-text)] dark:text-[var(--badge-success-text)]' 
  },
  amber: { 
    bg: 'bg-[var(--badge-warning-bg)] dark:bg-[var(--badge-warning-bg)]', 
    icon: 'bg-amber-500', 
    text: 'text-[var(--badge-warning-text)] dark:text-[var(--badge-warning-text)]' 
  },
  rose: { 
    bg: 'bg-[var(--badge-error-bg)] dark:bg-[var(--badge-error-bg)]', 
    icon: 'bg-rose-500', 
    text: 'text-[var(--badge-error-text)] dark:text-[var(--badge-error-text)]' 
  },
  violet: { 
    bg: 'bg-violet-100 dark:bg-violet-900/30', 
    icon: 'bg-violet-500', 
    text: 'text-violet-600 dark:text-violet-300' 
  },
  slate: { 
    bg: 'bg-[var(--badge-slate-bg)] dark:bg-[var(--badge-slate-bg)]', 
    icon: 'bg-slate-500', 
    text: 'text-[var(--badge-slate-text)] dark:text-[var(--badge-slate-text)]' 
  },
};

export function Metric({
  label,
  value,
  icon,
  trend,
  trendValue,
  color = 'blue',
  loading = false,
}: MetricProps) {
  const colors = colorMap[color];

  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] rounded-2xl p-6 border border-[var(--border-light)] dark:border-[var(--border-medium)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded w-24 animate-pulse mb-3" />
            <div className="h-8 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded w-16 animate-pulse" />
          </div>
          <div className="w-12 h-12 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] rounded-2xl p-6 border border-[var(--border-light)] dark:border-[var(--border-medium)] shadow-[var(--shadow-sm)] dark:shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-md)] dark:hover:shadow-[var(--shadow-lg)] transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] mb-2">{label}</p>
          <div className="flex items-baseline space-x-3">
            <p className="text-3xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{value}</p>
            {trend && trendValue && (
              <span
                className={`text-sm font-medium ${
                  trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 
                  trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 
                  'text-slate-500 dark:text-slate-400'
                }`}
              >
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center`}>
            {typeof icon === 'string' && icon.length <= 2 ? (
              // emoji
              <span className="text-xl">{icon}</span>
            ) : (
              // 使用 Icon 组件
              <Icon 
                name={typeof icon === 'string' ? icon : 'metrics'} 
                size={24} 
                color={colors.text.replace('text-', 'var(--color-')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 指标组容器
interface MetricGroupProps {
  children: React.ReactNode;
  title?: string;
}

export function MetricGroup({ children, title }: MetricGroupProps) {
  return (
    <div className="mb-8">
      {title && (
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {title}
        </h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {children}
      </div>
    </div>
  );
}
