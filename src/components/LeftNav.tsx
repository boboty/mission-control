'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useTheme, type ThemeMode } from '@/lib/useTheme';

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
  mobileOpen?: boolean;
  onMobileClose?: () => void;
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

export function LeftNav({ 
  activeModule = 'dashboard', 
  onModuleChange, 
  collapsed = false, 
  onToggle,
  mobileOpen = false,
  onMobileClose
}: LeftNavProps) {
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [clientTime, setClientTime] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 检测是否为移动设备
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleModuleClick = (key: string) => {
    onModuleChange?.(key);
    // 移动端点击后自动关闭侧边栏
    if (isMobile) {
      onMobileClose?.();
    }
  };

  // 导航内容（复用）
  const navContent = (
    <>
      {/* 顶部：Logo + 折叠/关闭按钮 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-light)] dark:border-[var(--border-medium)]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/logo.png" alt="Mission Claw" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-semibold text-[var(--text-primary)] text-sm">Mission Claw</span>
        </div>
        <button
          onClick={isMobile ? onMobileClose : onToggle}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset min-w-[44px] min-h-[44px]"
          title={isMobile ? '关闭菜单' : collapsed ? '展开导航' : '折叠导航'}
          aria-label={isMobile ? '关闭导航菜单' : collapsed ? '展开导航菜单' : '折叠导航菜单'}
          aria-expanded={!collapsed && !isMobile}
        >
          <Icon 
            name={isMobile ? 'x' : collapsed ? 'chevron-right' : 'chevron-left'} 
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
            onClick={() => handleModuleClick(item.key)}
            className={`
              w-full flex items-center space-x-3 px-3 py-3 rounded-xl mb-1
              transition-all duration-200 ease-out group
              min-h-[48px] touch-target
              ${
                activeModule === item.key
                  ? 'bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:shadow-sm'
              }
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset
            `}
            title={collapsed && !isMobile ? item.label : undefined}
            aria-current={activeModule === item.key ? 'page' : undefined}
            aria-label={item.label}
          >
            <Icon 
              name={item.icon} 
              size={22} 
              color={activeModule === item.key ? 'var(--color-primary)' : 'var(--text-secondary)'}
              className="transition-transform duration-200 group-hover:scale-110 flex-shrink-0"
            />
            <span className={`text-sm font-medium transition-colors duration-200 ${activeModule === item.key ? 'font-semibold' : ''}`}>
              {item.label}
            </span>
            {item.key === 'tasks' && blockedCount > 0 && (
              <span className="ml-auto text-xs bg-[var(--badge-error-bg)] text-[var(--badge-error-text)] px-2 py-0.5 rounded-full animate-pulse-soft flex-shrink-0" title={`阻塞任务：${blockedCount}`} role="status" aria-label={`${blockedCount}个阻塞任务`}>
                {blockedCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* 底部：主题切换 + 系统状态 */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border-light)] dark:border-[var(--border-medium)]">
        {/* 主题切换按钮 */}
        <div className="p-3">
          <div className="flex items-center justify-between bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded-xl p-1">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center py-2 px-2 rounded-lg transition-all duration-200 ${
                theme === 'light'
                  ? 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              title="浅色模式"
              aria-label="切换到浅色模式"
            >
              <Icon name="sun" size={18} />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex-1 flex items-center justify-center py-2 px-2 rounded-lg transition-all duration-200 ${
                theme === 'system'
                  ? 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              title="跟随系统"
              aria-label="跟随系统主题"
            >
              <Icon name="monitor" size={18} />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center py-2 px-2 rounded-lg transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              title="深色模式"
              aria-label="切换到深色模式"
            >
              <Icon name="moon" size={18} />
            </button>
          </div>
          {/* 主题提示文字 */}
          <p className="text-[10px] text-[var(--text-muted)] text-center mt-1.5">
            {theme === 'system' 
              ? `跟随系统 (${resolvedTheme === 'dark' ? '深色' : '浅色'})` 
              : theme === 'dark' 
                ? '深色模式' 
                : '浅色模式'}
          </p>
        </div>
        
        {/* 系统状态 */}
        <div className="px-4 pb-4">
          <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
            <span className="w-2 h-2 bg-[var(--color-success)] rounded-full" />
            <span>系统正常</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            更新于 {clientTime || '—'}
          </p>
        </div>
      </div>
    </>
  );

  // 移动端：抽屉式侧边栏
  if (isMobile) {
    return (
      <>
        {/* 遮罩层 */}
        <div
          className={`mobile-nav-overlay ${mobileOpen ? 'open' : ''}`}
          onClick={onMobileClose}
          aria-hidden="true"
        />
        {/* 侧边栏 */}
        <aside
          className={`
            mobile-sidebar
            fixed left-0 top-0 h-full w-72 max-w-[85vw]
            bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)]
            border-r border-[var(--border-light)] dark:border-[var(--border-medium)]
            shadow-2xl z-50
          `}
          style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          {navContent}
        </aside>
      </>
    );
  }

  // 桌面端：固定侧边栏
  return (
    <aside
      className={`
        fixed left-0 top-0 h-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] 
        border-r border-[var(--border-light)] dark:border-[var(--border-medium)]
        transition-all duration-300 z-50
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {navContent}
    </aside>
  );
}
