'use client';

import React from 'react';
import { Icon, IconProps } from './Icon';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', hover = true, padding = 'md' }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={`
        bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] rounded-2xl 
        border border-[var(--border-light)] dark:border-[var(--border-medium)] 
        shadow-[var(--shadow-sm)] dark:shadow-[var(--shadow-md)]
        ${hover ? 'hover:shadow-[var(--shadow-md)] dark:hover:shadow-[var(--shadow-lg)] hover:border-[var(--border-medium)] dark:hover:border-[var(--border-dark)] transition-all duration-200' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// 卡片头部组件
interface CardHeaderProps {
  icon?: string | React.ReactNode;
  iconColor?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  iconSize?: number;
}

export function CardHeader({ 
  icon, 
  iconColor = 'from-blue-500 to-blue-600', 
  title, 
  subtitle, 
  action,
  iconSize = 24
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        {icon && (
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center shadow-sm`}>
            {typeof icon === 'string' ? (
              // 如果是字符串，检查是否是 emoji 或图标名称
              icon.length <= 2 ? (
                // emoji
                <span className="text-lg">{icon}</span>
              ) : (
                // 图标名称，使用 Icon 组件
                <Icon name={icon} size={iconSize} color="white" useEmoji={false} />
              )
            ) : (
              icon
            )}
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// 骨架屏卡片
interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <div className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] rounded-2xl p-5 border border-[var(--border-light)] dark:border-[var(--border-medium)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-11 h-11 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
        <div className="flex-1">
          <div className="h-5 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded w-32 animate-pulse mb-2" />
          <div className="h-4 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded w-24 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] rounded animate-pulse" 
            style={{ 
              width: `${100 - i * 10}%`, 
              animationDelay: `${i * 100}ms` 
            }} 
          />
        ))}
      </div>
    </div>
  );
}

// 空状态组件 - 增强版（带建议操作）
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  iconSize?: number;
  suggestions?: string[]; // 建议操作列表
  moduleType?: 'tasks' | 'pipelines' | 'events' | 'memories' | 'agents' | 'health'; // 模块类型，用于自动生成建议
}

// 各模块的默认建议操作
const emptyStateSuggestions: Record<string, string[]> = {
  tasks: [
    '在飞书任务板中创建新任务',
    '检查任务同步器是否正常运行',
    '确认 DATABASE_URL 配置正确',
  ],
  pipelines: [
    '在飞书多维表格中添加流程项目',
    '检查管线同步状态',
    '确认数据源连接正常',
  ],
  events: [
    '在日历中添加新日程',
    '检查日历同步配置',
    '确认时区设置正确',
  ],
  memories: [
    '创建新的记忆归档',
    '导入历史日志文件',
    '检查记忆存储路径',
  ],
  agents: [
    '注册新的智能体',
    '检查智能体心跳配置',
    '确认智能体状态上报正常',
  ],
  health: [
    '等待首次健康检测生成',
    '检查健康检测 cron 任务',
    '查看系统日志确认无异常',
  ],
};

export function EmptyState({ 
  icon = 'empty-inbox', 
  title, 
  description, 
  action,
  iconSize = 64,
  suggestions,
  moduleType,
}: EmptyStateProps) {
  // 如果没有提供建议但有模块类型，使用默认建议
  const defaultSuggestions = moduleType ? emptyStateSuggestions[moduleType] : [];
  const displaySuggestions = suggestions || defaultSuggestions;
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">
        {typeof icon === 'string' && icon.length <= 2 ? (
          // emoji
          <span className="text-5xl">{icon}</span>
        ) : (
          // 使用 Icon 组件
          <Icon 
            name={typeof icon === 'string' ? icon : 'empty-inbox'} 
            size={iconSize} 
            color="var(--text-muted)"
          />
        )}
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">{title}</h3>
      {description && (
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] text-sm mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mb-4">{action}</div>}
      
      {/* 建议操作列表 */}
      {displaySuggestions && displaySuggestions.length > 0 && (
        <div className="bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded-xl p-4 max-w-sm w-full text-left">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
            💡 建议操作
          </p>
          <ul className="space-y-1.5">
            {displaySuggestions.map((suggestion, index) => (
              <li key={index} className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] flex items-start">
                <span className="text-[var(--color-primary)] mr-2 mt-0.5">·</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
