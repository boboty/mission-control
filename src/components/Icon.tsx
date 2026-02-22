'use client';

import React from 'react';

/**
 * Icon 组件 - 基于 Iconfont symbol 方式
 * 
 * 接入方式：
 * 1. Iconfont JS 已在 app/layout.tsx 的 <head> 中引入
 * 2. 收藏集地址：https://www.iconfont.cn/collections/detail?cid=53496
 * 3. 如果图标不显示，请检查 layout.tsx 中的 script src 是否正确
 * 
 * 降级方案：
 * - 如果 Iconfont 未加载，自动降级到 emoji
 * - 可通过 useEmoji 属性强制使用 emoji
 */

// ============ 配置区域 ============
// Iconfont JS 已在 layout.tsx 中全局引入，此处无需配置
// 如果需要动态加载，可在此填入 URL
const ICONFONT_SYMBOL_URL = 'loaded'; // 已在 layout.tsx 中引入

// 图标名称映射 (根据 Iconfont 收藏集中的实际图标名调整)
const ICON_MAP: Record<string, string> = {
  // 顶部和模块图标
  'dashboard': 'icon-dashboard',
  'tasks': 'icon-tasks',
  'pipelines': 'icon-pipeline',
  'events': 'icon-calendar',
  'memories': 'icon-archive',
  'agents': 'icon-team',
  'health': 'icon-heart',
  
  // 指标卡图标
  'metrics': 'icon-metrics',
  'in-progress': 'icon-sync',
  'blocked': 'icon-warning',
  'pending': 'icon-think',
  
  // 状态图标
  'success': 'icon-check',
  'error': 'icon-error',
  'warning': 'icon-alert',
  'info': 'icon-info',
  
  // 空态图标
  'empty-tasks': 'icon-empty-tasks',
  'empty-pipeline': 'icon-empty-pipeline',
  'empty-calendar': 'icon-empty-calendar',
  'empty-archive': 'icon-empty-archive',
  'empty-team': 'icon-empty-team',
  'empty-heart': 'icon-empty-heart',
  'empty-inbox': 'icon-inbox',
  
  // 通用图标
  'loading': 'icon-loading',
  'close': 'icon-close',
  'edit': 'icon-edit',
  'delete': 'icon-delete',
  'search': 'icon-search',
  'plus': 'icon-plus',
  'check': 'icon-check-circle',
  'arrow-up': 'icon-arrow-up',
  'arrow-down': 'icon-arrow-down',
  'arrow-right': 'icon-arrow-right',
  'arrow-left': 'icon-arrow-left',
  'chevron-left': 'icon-chevron-left',
  'chevron-right': 'icon-chevron-right',
  'refresh': 'icon-refresh',
  'copy': 'icon-copy',
  
  // 详情浮窗图标
  'id': 'icon-info',
  'status': 'icon-status',
  'priority': 'icon-priority',
  'owner': 'icon-owner',
  'category': 'icon-category',
  'calendar': 'icon-calendar',
  'clock': 'icon-clock',
  'action': 'icon-action',
  'note': 'icon-note',
  'source': 'icon-source',
  'tag': 'icon-tag',
  'link': 'icon-link',
};

// 备选 emoji 映射 (当 Iconfont 未加载时使用)
const EMOJI_FALLBACK: Record<string, string> = {
  'dashboard': '📊',
  'tasks': '📋',
  'pipelines': '🔄',
  'events': '📅',
  'memories': '🗃️',
  'agents': '👥',
  'health': '💚',
  'metrics': '📊',
  'in-progress': '🔄',
  'blocked': '⚠️',
  'pending': '🤔',
  'success': '✅',
  'error': '❌',
  'warning': '⚠️',
  'info': 'ℹ️',
  'empty-tasks': '📋',
  'empty-pipeline': '🔄',
  'empty-calendar': '📅',
  'empty-archive': '🗃️',
  'empty-team': '👥',
  'empty-heart': '💚',
  'empty-inbox': '📭',
  'id': '🆔',
  'status': '📊',
  'priority': '🎯',
  'owner': '👤',
  'category': '🏷️',
  'calendar': '📅',
  'clock': '⏰',
  'action': '➡️',
  'note': '📝',
  'source': '🔗',
  'tag': '🏷️',
  'link': '🔗',
  'chevron-left': '◀',
  'chevron-right': '▶',
  'arrow-left': '⬅',
  'refresh': '🔄',
  'copy': '📋',
};

export interface IconProps {
  name: string;
  size?: number | string;
  color?: string;
  className?: string;
  useEmoji?: boolean; // 强制使用 emoji
}

/**
 * 统一 Icon 组件
 * 支持 Iconfont symbol 和 emoji 两种方式
 */
export function Icon({ 
  name, 
  size = 24, 
  color = 'currentColor', 
  className = '',
  useEmoji = false 
}: IconProps) {
  const iconName = ICON_MAP[name] || name;
  const emoji = EMOJI_FALLBACK[name] || name;
  
  // 如果强制使用 emoji 或 Iconfont URL 未配置，使用 emoji
  if (useEmoji || !ICONFONT_SYMBOL_URL) {
    const sizeValue = typeof size === 'number' ? size : 24;
    return (
      <span 
        className={className}
        style={{ 
          fontSize: sizeValue, 
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {emoji}
      </span>
    );
  }
  
  // 使用 Iconfont symbol 方式
  const sizeValue = typeof size === 'string' ? size : `${size}px`;
  
  return (
    <svg 
      className={`icon ${className}`}
      aria-hidden="true"
      width={sizeValue}
      height={sizeValue}
      style={{ color, fill: 'currentColor' }}
    >
      <use xlinkHref={`#${iconName}`} />
    </svg>
  );
}

/**
 * 预定义图标组件 (方便使用)
 */
export const Icons = {
  Dashboard: (props: Omit<IconProps, 'name'>) => <Icon name="dashboard" {...props} />,
  Tasks: (props: Omit<IconProps, 'name'>) => <Icon name="tasks" {...props} />,
  Pipelines: (props: Omit<IconProps, 'name'>) => <Icon name="pipelines" {...props} />,
  Events: (props: Omit<IconProps, 'name'>) => <Icon name="events" {...props} />,
  Memories: (props: Omit<IconProps, 'name'>) => <Icon name="memories" {...props} />,
  Agents: (props: Omit<IconProps, 'name'>) => <Icon name="agents" {...props} />,
  Health: (props: Omit<IconProps, 'name'>) => <Icon name="health" {...props} />,
  Metrics: (props: Omit<IconProps, 'name'>) => <Icon name="metrics" {...props} />,
  InProgress: (props: Omit<IconProps, 'name'>) => <Icon name="in-progress" {...props} />,
  Blocked: (props: Omit<IconProps, 'name'>) => <Icon name="blocked" {...props} />,
  Pending: (props: Omit<IconProps, 'name'>) => <Icon name="pending" {...props} />,
  Success: (props: Omit<IconProps, 'name'>) => <Icon name="success" {...props} />,
  Error: (props: Omit<IconProps, 'name'>) => <Icon name="error" {...props} />,
  Warning: (props: Omit<IconProps, 'name'>) => <Icon name="warning" {...props} />,
  Empty: (props: Omit<IconProps, 'name'>) => <Icon name="empty-inbox" {...props} />,
};

export default Icon;
