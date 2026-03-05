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
  { key: 'memory_topics', label: '记忆主题', icon: 'memories' },
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
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] transition-colors"
          title={collapsed ? '展开导航' : '折叠导航'}
        >
          <Icon 
            name={collapsed ? 'chevron-right' : 'chevron-left'} 
            size={18} 
            color="var(--text-secondary)" 
          />
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="py-4 px-3">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onModuleChange?.(item.key)}
            className={`
              w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl mb-1
              transition-all duration-200 group
              ${
                activeModule === item.key
                  ? 'bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)]'
              }
            `}
            title={collapsed ? item.label : undefined}
          >
            <Icon 
              name={item.icon} 
              size={20} 
              color={activeModule === item.key ? 'var(--color-primary)' : 'var(--text-secondary)'}
            />
            {!collapsed && (
              <span className={`text-sm font-medium ${activeModule === item.key ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            )}
            {!collapsed && item.key === 'tasks' && blockedCount > 0 && (
              <span className="ml-auto text-xs bg-[var(--badge-error-bg)] text-[var(--badge-error-text)] px-2 py-0.5 rounded-full" title={`阻塞任务：${blockedCount}`}>
                {blockedCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* 底部：系统状态 */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border-light)] dark:border-[var(--border-medium)]">
          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
            <span className="w-2 h-2 bg-[var(--color-success)] rounded-full" />
            <span>系统正常</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            更新于 {clientTime || '—'}
          </p>
        </div>
      )}
    </aside>
  );
}
