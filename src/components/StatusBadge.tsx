'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'soft';
  label?: string;
}

// 状态文案中文化映射
const statusTextMap: Record<string, string> = {
  // 任务状态
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  draft: '草稿',
  planning: '规划中',
  recording: '录制中',
  editing: '编辑中',
  
  // Agent 状态
  active: '活跃',
  idle: '空闲',
  running: '运行中',
  working: '工作中',
  
  // 通用状态
  blocked: '阻塞',
  pending: '待决策',
  success: '成功',
  error: '错误',
  warning: '警告',
};

// 状态颜色映射 - 暗色模式修复（第二轮）- 降低饱和度，提高可读性
const statusColorMap: Record<string, { solid: string; soft: string }> = {
  todo: { 
    solid: 'bg-slate-500 text-white', 
    soft: 'bg-[var(--badge-slate-bg)] text-[var(--badge-slate-text)] dark:bg-[var(--badge-slate-bg)] dark:text-[var(--badge-slate-text)]' 
  },
  in_progress: { 
    solid: 'bg-blue-500 text-white', 
    soft: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
  },
  done: { 
    solid: 'bg-emerald-500 text-white', 
    soft: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] dark:bg-[var(--badge-success-bg)] dark:text-[var(--badge-success-text)]' 
  },
  draft: { 
    solid: 'bg-slate-400 text-white', 
    soft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
  },
  planning: { 
    solid: 'bg-amber-500 text-white', 
    soft: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] dark:bg-[var(--badge-warning-bg)] dark:text-[var(--badge-warning-text)]' 
  },
  recording: { 
    solid: 'bg-violet-500 text-white', 
    soft: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' 
  },
  editing: { 
    solid: 'bg-cyan-500 text-white', 
    soft: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' 
  },
  active: { 
    solid: 'bg-emerald-500 text-white', 
    soft: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] dark:bg-[var(--badge-success-bg)] dark:text-[var(--badge-success-text)]' 
  },
  running: { 
    solid: 'bg-violet-500 text-white', 
    soft: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' 
  },
  working: { 
    solid: 'bg-amber-500 text-white', 
    soft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' 
  },
  idle: { 
    solid: 'bg-slate-400 text-white', 
    soft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' 
  },
  blocked: { 
    solid: 'bg-rose-500 text-white', 
    soft: 'bg-[var(--badge-error-bg)] text-[var(--badge-error-text)] dark:bg-[var(--badge-error-bg)] dark:text-[var(--badge-error-text)]' 
  },
  pending: { 
    solid: 'bg-amber-500 text-white', 
    soft: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] dark:bg-[var(--badge-warning-bg)] dark:text-[var(--badge-warning-text)]' 
  },
  success: { 
    solid: 'bg-emerald-500 text-white', 
    soft: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] dark:bg-[var(--badge-success-bg)] dark:text-[var(--badge-success-text)]' 
  },
  error: { 
    solid: 'bg-rose-500 text-white', 
    soft: 'bg-[var(--badge-error-bg)] text-[var(--badge-error-text)] dark:bg-[var(--badge-error-bg)] dark:text-[var(--badge-error-text)]' 
  },
  warning: { 
    solid: 'bg-amber-500 text-white', 
    soft: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] dark:bg-[var(--badge-warning-bg)] dark:text-[var(--badge-warning-text)]' 
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function StatusBadge({ status, size = 'sm', variant = 'soft' }: StatusBadgeProps) {
  const displayText = statusTextMap[status] || status;
  const colors = statusColorMap[status] || statusColorMap.todo;
  const colorClass = variant === 'solid' ? colors.solid : colors.soft;
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClass} ${colorClass}`}
      style={{ whiteSpace: 'nowrap' }}
    >
      {displayText}
    </span>
  );
}

// 优先级组件
interface PriorityBadgeProps {
  priority: string;
  showLabel?: boolean;
}

const priorityTextMap: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const priorityColorMap: Record<string, string> = {
  high: 'text-rose-600 dark:text-rose-400 font-semibold',
  medium: 'text-amber-600 dark:text-amber-400 font-medium',
  low: 'text-slate-500 dark:text-slate-400',
};

export function PriorityBadge({ priority, showLabel = false }: PriorityBadgeProps) {
  const displayText = priorityTextMap[priority] || priority;
  const colorClass = priorityColorMap[priority] || priorityColorMap.low;

  if (showLabel) {
    return (
      <span className={`inline-flex items-center ${colorClass}`}>
        <span className="w-2 h-2 rounded-full bg-current mr-1.5" />
        {displayText}优先级
      </span>
    );
  }

  return <span className={`inline-flex items-center ${colorClass}`}>{displayText}</span>;
}
