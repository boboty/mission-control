'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  active?: boolean;
  onClick?: () => void;
}

interface LeftNavProps {
  activeModule?: string;
  onModuleChange?: (module: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: '仪表盘', icon: 'dashboard' },
  { key: 'tasks', label: '任务看板', icon: 'tasks' },
  { key: 'pipelines', label: '业务管线', icon: 'pipelines' },
  { key: 'events', label: '日历', icon: 'events' },
  { key: 'memory_topics', label: '记忆主题', icon: 'book' },
  { key: 'agents', label: '团队概览', icon: 'agents' },
  { key: 'health', label: '运行健康', icon: 'health' },
];

export function LeftNav({ activeModule = 'dashboard', onModuleChange, collapsed = false, onToggle }: LeftNavProps) {
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [clientTime, setClientTime] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function fetchBlockedCount() {
      try {
        const res = await fetch('/api/tasks?page=1&pageSize=1&status=blocked');
        const data = await res.json();
        const count = data?.pagination?.total ?? (Array.isArray(data?.tasks) ? data.tasks.length : 0);
        if (!cancelled) setBlockedCount(Number(count) || 0);
      } catch {
        // ignore
      }
    }

    function updateClientTime() {
      if (cancelled) return;
      setClientTime(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    }

    fetchBlockedCount();
    updateClientTime();

    const t1 = setInterval(fetchBlockedCount, 60_000);
    const t2 = setInterval(updateClientTime, 60_000);

    return () => {
      cancelled = true;
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] 
        border-r border-[var(--border-light)] dark:border-[var(--border-medium)]
        transition-all duration-300 z-50
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* 顶部：Logo + 折叠按钮 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-light)] dark:border-[var(--border-medium)]">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/logo.png" alt="Mission Claw" className="w-8 h-8 object-contain" />
            </div>
            <span className="font-semibold text-[var(--text-primary)] text-sm">Mission Claw</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
          title={collapsed ? '展开导航' : '折叠导航'}
          aria-label={collapsed ? '展开导航菜单' : '折叠导航菜单'}
          aria-expanded={!collapsed}
        >
          <Icon 
            name={collapsed ? 'chevron-right' : 'chevron-left'} 
            size={18} 
            color="var(--text-secondary)" 
            className="transition-transform duration-200"
          />
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="py-4 px-3" role="navigation" aria-label="主导航">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onModuleChange?.(item.key)}
            className={`
              w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl mb-1
              transition-all duration-200 ease-out group
              ${
                activeModule === item.key
                  ? 'bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm'
              }
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset
            `}
            title={collapsed ? item.label : undefined}
            aria-current={activeModule === item.key ? 'page' : undefined}
          >
            <Icon 
              name={item.icon} 
              size={20} 
              color={activeModule === item.key ? 'var(--color-primary)' : 'var(--text-secondary)'}
              className="transition-transform duration-200 group-hover:scale-110 flex-shrink-0"
            />
            {!collapsed && (
              <span className={`text-sm font-medium transition-colors duration-200 ${activeModule === item.key ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            )}
            {item.key === 'tasks' && blockedCount > 0 && !collapsed && (
              <span className="ml-auto text-xs bg-[var(--badge-error-bg)] text-[var(--badge-error-text)] px-2 py-0.5 rounded-full animate-pulse-soft" title={`阻塞任务：${blockedCount}`}>
                {blockedCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* 底部：系统状态 */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border-light)] dark:border-[var(--border-medium)] p-4">
        {!collapsed && (
          <>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
              <span>本地时间</span>
              <span className="font-mono">{clientTime}</span>
            </div>
            {blockedCount > 0 && (
              <div className="flex items-center gap-2 text-xs bg-[var(--badge-error-bg)] text-[var(--badge-error-text)] px-2 py-1.5 rounded-lg" role="status">
                <Icon name="alert" size={14} color="currentColor" />
                <span>{blockedCount} 个阻塞任务</span>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
