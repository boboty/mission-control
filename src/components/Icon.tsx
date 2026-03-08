'use client';

import React from 'react';
import { 
  LayoutDashboard, ListTodo, GitBranch, Calendar, Archive, 
  Users, Heart, CheckCircle, XCircle, AlertTriangle, 
  Info, Search, Plus, X, RefreshCw, Copy, ChevronLeft, 
  ChevronRight, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  Loader2, Edit3, Trash2, Clock, Link, Tag, FileText,
  Check, Inbox, Zap, AlertCircle, Sun, Moon, Monitor
} from 'lucide-react';

// 图标名称映射 (name -> lucide-react 组件)
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  // 顶部和模块图标
  'dashboard': LayoutDashboard,
  'tasks': ListTodo,
  'pipelines': GitBranch,
  'events': Calendar,
  'memories': Archive,
  'agents': Users,
  'health': Heart,
  
  // 指标卡图标
  'metrics': Zap,
  'in-progress': RefreshCw,
  'blocked': AlertCircle,
  'pending': AlertTriangle,
  
  // 状态图标
  'success': CheckCircle,
  'error': XCircle,
  'warning': AlertTriangle,
  'info': Info,
  
  // 空态图标
  'empty-tasks': ListTodo,
  'empty-pipeline': GitBranch,
  'empty-calendar': Calendar,
  'empty-archive': Archive,
  'empty-team': Users,
  'empty-heart': Heart,
  'empty-inbox': Inbox,
  
  // 通用图标
  'loading': Loader2,
  'close': X,
  'edit': Edit3,
  'delete': Trash2,
  'search': Search,
  'plus': Plus,
  'check': Check,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'refresh': RefreshCw,
  'copy': Copy,
  
  // 详情浮窗图标
  'id': Tag,
  'status': ListTodo,
  'priority': Zap,
  'owner': Users,
  'category': Tag,
  'calendar': Calendar,
  'clock': Clock,
  'action': ArrowRight,
  'note': FileText,
  'source': Link,
  'tag': Tag,
  'link': Link,
  
  // 主题切换图标
  'sun': Sun,
  'moon': Moon,
  'monitor': Monitor,
};

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

/**
 * 统一 Icon 组件 - 基于 Lucide React
 */
export function Icon({ 
  name, 
  size = 24, 
  color = 'currentColor', 
  className = ''
}: IconProps) {
  const IconComponent = ICON_MAP[name];
  
  if (!IconComponent) {
    // 如果找不到图标，返回一个占位符
    return <span className={className} style={{ width: size, height: size, display: 'inline-flex' }} />;
  }
  
  // 加载图标自动添加旋转动画
  const isSpinner = name === 'loading' || name === 'refresh';
  
  return (
    <IconComponent 
      size={size} 
      color={color} 
      className={`${className} ${isSpinner ? 'animate-spin' : ''}`}
      strokeWidth={2}
    />
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
