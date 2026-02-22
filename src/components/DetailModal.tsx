'use client';

import { useState, useCallback, useEffect } from 'react';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';

// ============ 类型定义 ============
export interface DetailData {
  id: number | string;
  type: 'task' | 'pipeline' | 'event' | 'memory' | 'agent' | 'health';
  title: string;
  status?: string;
  priority?: string;
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
  dueAt?: string;
  startsAt?: string;
  endsAt?: string;
  happenedAt?: string;
  lastSeenAt?: string;
  category?: string;
  description?: string;
  nextAction?: string;
  source?: string;
  notes?: string;
  extra?: Record<string, any>;
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DetailData | null;
}

// ============ 工具函数 ============
function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function copyToClipboard(text: string): boolean {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
    return true;
  }
  // Fallback for older browsers
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch {
    document.body.removeChild(textArea);
    return false;
  }
}

// ============ 详情浮窗组件 ============
export function DetailModal({ isOpen, onClose, data }: DetailModalProps) {
  const [copied, setCopied] = useState(false);

  // 键盘事件处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      onClose();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // 重置 copied 状态
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopyId = () => {
    if (data && copyToClipboard(String(data.id))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || !data) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal 主体 */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-[var(--border-medium)] animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-start justify-between p-5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)]">
            <div className="flex-1 min-w-0">
              <h2 id="modal-title" className="text-lg font-semibold text-[var(--text-primary)] truncate">
                {data.title}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 capitalize">
                {getTypeLabel(data.type)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] transition-colors"
              aria-label="关闭"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* 内容区 */}
          <div className="p-5 overflow-y-auto max-h-[60vh]">
            {/* ID + 复制按钮 */}
            <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <Icon name="id" size={16} className="text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">ID</span>
              </div>
              <div className="flex items-center space-x-3">
                <code className="text-sm font-mono text-[var(--text-primary)]">{data.id}</code>
                <button
                  onClick={handleCopyId}
                  className={`text-xs px-2 py-1 rounded-md transition-all ${
                    copied
                      ? 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]'
                      : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {copied ? '✓ 已复制' : '复制'}
                </button>
              </div>
            </div>

            {/* 状态字段 */}
            <DetailField label="状态" icon="status">
              {data.status ? (
                <StatusBadge status={data.status} size="sm" />
              ) : (
                <span className="text-[var(--text-muted)]">—</span>
              )}
            </DetailField>

            {/* 优先级 */}
            {data.priority && (
              <DetailField label="优先级" icon="priority">
                <span className={`text-sm font-medium ${
                  data.priority === 'high' ? 'text-[var(--badge-error-text)]' :
                  data.priority === 'medium' ? 'text-[var(--badge-warning-text)]' :
                  'text-[var(--text-secondary)]'
                }`}>
                  {getPriorityLabel(data.priority)}
                </span>
              </DetailField>
            )}

            {/* Owner */}
            {data.owner && (
              <DetailField label="负责人" icon="owner">
                <span className="text-sm text-[var(--text-primary)]">{data.owner}</span>
              </DetailField>
            )}

            {/* 分类/类型 */}
            {data.category && (
              <DetailField label="分类" icon="category">
                <span className="text-sm text-[var(--text-primary)]">{data.category}</span>
              </DetailField>
            )}

            {/* 时间字段 - 根据类型显示 */}
            {data.dueAt && (
              <DetailField label="截止时间" icon="calendar">
                <span className="text-sm text-[var(--text-primary)]">{formatDate(data.dueAt)}</span>
              </DetailField>
            )}

            {data.startsAt && (
              <DetailField label="开始时间" icon="calendar">
                <span className="text-sm text-[var(--text-primary)]">{formatDateTime(data.startsAt)}</span>
              </DetailField>
            )}

            {data.endsAt && (
              <DetailField label="结束时间" icon="calendar">
                <span className="text-sm text-[var(--text-primary)]">{formatDateTime(data.endsAt)}</span>
              </DetailField>
            )}

            {data.happenedAt && (
              <DetailField label="发生时间" icon="calendar">
                <span className="text-sm text-[var(--text-primary)]">{formatDateTime(data.happenedAt)}</span>
              </DetailField>
            )}

            {data.lastSeenAt && (
              <DetailField label="最后活跃" icon="clock">
                <span className="text-sm text-[var(--text-primary)]">{formatDateTime(data.lastSeenAt)}</span>
              </DetailField>
            )}

            {data.createdAt && (
              <DetailField label="创建时间" icon="clock">
                <span className="text-sm text-[var(--text-primary)]">{formatDateTime(data.createdAt)}</span>
              </DetailField>
            )}

            {data.updatedAt && (
              <DetailField label="更新时间" icon="clock">
                <span className="text-sm text-[var(--text-primary)]">{formatDateTime(data.updatedAt)}</span>
              </DetailField>
            )}

            {/* 下一步行动 */}
            {data.nextAction && (
              <DetailField label="下一步行动" icon="action">
                <p className="text-sm text-[var(--text-primary)]">{data.nextAction}</p>
              </DetailField>
            )}

            {/* 描述/备注 */}
            {data.description && (
              <DetailField label="描述" icon="note">
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{data.description}</p>
              </DetailField>
            )}

            {data.notes && (
              <DetailField label="备注" icon="note">
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{data.notes}</p>
              </DetailField>
            )}

            {/* 来源 */}
            {data.source && (
              <DetailField label="来源" icon="source">
                <span className="text-sm text-[var(--text-primary)]">{data.source}</span>
              </DetailField>
            )}

            {/* 额外字段 */}
            {data.extra && Object.keys(data.extra).length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border-light)] dark:border-[var(--border-medium)]">
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                  其他信息
                </h4>
                {Object.entries(data.extra).map(([key, value]) => (
                  <DetailField key={key} label={formatFieldLabel(key)} icon="info">
                    <span className="text-sm text-[var(--text-primary)]">
                      {typeof value === 'boolean' ? (value ? '是' : '否') : String(value)}
                    </span>
                  </DetailField>
                ))}
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="p-4 border-t border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)]">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============ 辅助组件 ============
interface DetailFieldProps {
  label: string;
  icon: string;
  children: React.ReactNode;
}

function DetailField({ label, icon, children }: DetailFieldProps) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0">
      <div className="flex items-center space-x-2 min-w-[100px]">
        <Icon name={icon as any} size={16} className="text-[var(--text-muted)]" />
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
      </div>
      <div className="flex-1 text-right">{children}</div>
    </div>
  );
}

// ============ 辅助函数 ============
function getTypeLabel(type: DetailData['type']): string {
  const labels: Record<DetailData['type'], string> = {
    task: '任务',
    pipeline: '流程项目',
    event: '日程',
    memory: '记忆',
    agent: '智能体',
    health: '健康检测',
  };
  return labels[type] || type;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[priority] || priority;
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
}

// ============ 可点击列表项包装器 ============
interface ClickableItemProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  isBlocked?: boolean;
}

export function ClickableItem({ children, onClick, className = '', isBlocked = false }: ClickableItemProps) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
      className={`
        cursor-pointer transition-all duration-200 outline-none
        focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] dark:focus:ring-offset-[var(--bg-tertiary)]
        ${isBlocked 
          ? 'bg-[var(--badge-error-bg)]/30 border-l-4 border-l-[var(--color-danger)]' 
          : 'hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)]'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}
