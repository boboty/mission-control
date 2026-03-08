'use client';

import { useState, useCallback, useEffect } from 'react';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';

// ============ 类型定义 ============

// 时间线事件
export interface TimelineEvent {
  timestamp: string;
  type: 'created' | 'updated' | 'status_changed' | 'completed' | 'comment' | 'custom';
  title: string;
  description?: string;
  icon?: string;
  metadata?: Record<string, any>;
}

// 关联对象
export interface RelatedObject {
  id: string | number;
  type: 'task' | 'pipeline' | 'event' | 'memory' | 'agent';
  title: string;
  status?: string;
  link?: string;
}

// 操作按钮
export interface ActionEntry {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  tooltip?: string;
}

// 详情数据 - 增强版（向后兼容）
export interface DetailData {
  // 基础字段（原有）
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
  
  // 新增字段（可选，向后兼容）
  // 元信息
  metadata?: {
    createdUser?: string;
    updatedUser?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  };
  
  // 关联对象
  relatedObjects?: RelatedObject[];
  
  // 时间线
  timeline?: TimelineEvent[];
  
  // 操作入口
  actions?: ActionEntry[];
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DetailData | null;
  onTaskUpdated?: () => void; // 任务更新后的回调，用于刷新列表
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

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
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

// ============ 子组件：时间线 ============
interface TimelineProps {
  events: TimelineEvent[];
}

function Timeline({ events }: TimelineProps) {
  if (!events || events.length === 0) return null;
  
  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
        时间线
      </h4>
      <div className="space-y-3">
        {events.map((event, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/10" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--text-primary)]">{event.title}</p>
                <span className="text-xs text-[var(--text-muted)]">{formatTime(event.timestamp)}</span>
              </div>
              {event.description && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{event.description}</p>
              )}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(event.metadata).map(([key, value]) => (
                    <span key={key} className="text-xs bg-[var(--bg-tertiary)] px-2 py-0.5 rounded text-[var(--text-muted)]">
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 子组件：关联对象 ============
interface RelatedObjectsProps {
  objects: RelatedObject[];
  onObjectClick?: (obj: RelatedObject) => void;
}

function RelatedObjects({ objects, onObjectClick }: RelatedObjectsProps) {
  if (!objects || objects.length === 0) return null;
  
  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
        关联对象
      </h4>
      <div className="space-y-2">
        {objects.map((obj, index) => (
          <div
            key={index}
            onClick={() => onObjectClick?.(obj)}
            className={`flex items-center justify-between p-2.5 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded-lg ${
              onObjectClick ? 'cursor-pointer hover:bg-[var(--bg-elevated)] dark:hover:bg-[var(--bg-secondary)]' : ''
            } transition-colors`}
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Icon name={obj.type === 'task' ? 'tasks' : obj.type === 'event' ? 'calendar' : 'info'} size={16} className="text-[var(--color-primary)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{obj.title}</p>
                <p className="text-xs text-[var(--text-muted)] capitalize">{obj.type}</p>
              </div>
            </div>
            {obj.status && (
              <StatusBadge status={obj.status} size="sm" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 子组件：操作按钮 ============
interface ActionsProps {
  actions: ActionEntry[];
}

function Actions({ actions }: ActionsProps) {
  if (!actions || actions.length === 0) return null;
  
  const getVariantClasses = (variant?: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]';
      case 'danger':
        return 'bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-hover)]';
      case 'secondary':
        return 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)]';
      case 'ghost':
      default:
        return 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)]';
    }
  };
  
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          disabled={action.disabled}
          title={action.tooltip}
          className={`
            inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
            ${getVariantClasses(action.variant)}
            ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Icon name={action.icon} size={16} />
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============ 详情浮窗组件（增强版） ============
export function DetailModal({ isOpen, onClose, data, onTaskUpdated }: DetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'related'>('details');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<Partial<DetailData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setActiveTab('details');
      setIsEditMode(false);
      setEditedData({});
      setSaveError(null);
    }
  }, [isOpen]);

  // 进入编辑模式
  const handleEnterEditMode = () => {
    if (data) {
      setEditedData({
        status: data.status,
        priority: data.priority,
        owner: data.owner,
        nextAction: data.nextAction,
        dueAt: data.dueAt,
      });
      setIsEditMode(true);
      setSaveError(null);
    }
  };

  // 退出编辑模式
  const handleExitEditMode = () => {
    setIsEditMode(false);
    setEditedData({});
    setSaveError(null);
  };

  // 保存修改
  const handleSave = async () => {
    if (!data || data.type !== 'task') return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: data.id,
          status: editedData.status,
          priority: editedData.priority,
          owner: editedData.owner,
          nextAction: editedData.nextAction,
          dueAt: editedData.dueAt,
          actor: 'user',
          meta: { reason: 'inline_edit' },
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '保存失败');
      }
      
      // 保存成功，通知父组件刷新列表
      onTaskUpdated?.();
      setIsEditMode(false);
      setSaveError(null);
      
      // 更新本地显示的数据（乐观更新）
      if (data) {
        data.status = editedData.status;
        data.priority = editedData.priority;
        data.owner = editedData.owner;
        data.nextAction = editedData.nextAction;
        data.dueAt = editedData.dueAt;
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 更新编辑字段
  const handleFieldChange = (field: keyof DetailData, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyId = () => {
    if (data && copyToClipboard(String(data.id))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (data && copyToClipboard(`${window.location.origin}/items/${data.type}/${data.id}`)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || !data) return null;

  const hasTimeline = data.timeline && data.timeline.length > 0;
  const hasRelated = data.relatedObjects && data.relatedObjects.length > 0;
  const hasActions = data.actions && data.actions.length > 0;
  const hasCustomActions = hasActions || data.type === 'task';

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
          className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[var(--border-medium)] animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-start justify-between p-5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h2 id="modal-title" className="text-lg font-semibold text-[var(--text-primary)] truncate">
                  {data.title}
                </h2>
                {data.status && <StatusBadge status={isEditMode ? (editedData.status || data.status) : data.status} size="sm" />}
              </div>
              <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
                <span className="capitalize">{getTypeLabel(data.type)}</span>
                {data.category && (
                  <>
                    <span>·</span>
                    <span>{data.category}</span>
                  </>
                )}
                {data.priority && (
                  <>
                    <span>·</span>
                    <span className={data.priority === 'high' ? 'text-[var(--badge-error-text)]' : ''}>
                      {getPriorityLabel(isEditMode ? (editedData.priority || data.priority) : data.priority)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* 编辑模式按钮（仅任务类型） */}
              {data.type === 'task' && !isEditMode && (
                <button
                  onClick={handleEnterEditMode}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary)] hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
                  aria-label="进入编辑模式"
                  title="编辑任务"
                >
                  <Icon name="edit" size={14} />
                  <span>编辑</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
                aria-label="关闭详情"
                title="关闭 (Esc)"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>

          {/* 标签页导航 */}
          {(hasTimeline || hasRelated) && (
            <div className="flex border-b border-[var(--border-light)] dark:border-[var(--border-medium)]" role="tablist" aria-label="详情选项卡">
              <button
                onClick={() => setActiveTab('details')}
                role="tab"
                aria-selected={activeTab === 'details'}
                aria-controls="details-panel"
                id="details-tab"
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] ${
                  activeTab === 'details'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-soft)]/50'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)]'
                }`}
              >
                详情
              </button>
              {hasTimeline && (
                <button
                  onClick={() => setActiveTab('timeline')}
                  role="tab"
                  aria-selected={activeTab === 'timeline'}
                  aria-controls="timeline-panel"
                  id="timeline-tab"
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] ${
                    activeTab === 'timeline'
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-soft)]/50'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  时间线 {data.timeline?.length ? `(${data.timeline.length})` : ''}
                </button>
              )}
              {hasRelated && (
                <button
                  onClick={() => setActiveTab('related')}
                  role="tab"
                  aria-selected={activeTab === 'related'}
                  aria-controls="related-panel"
                  id="related-tab"
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] ${
                    activeTab === 'related'
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-soft)]/50'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  关联对象 {data.relatedObjects?.length ? `(${data.relatedObjects.length})` : ''}
                </button>
              )}
            </div>
          )}

          {/* 内容区 */}
          <div 
            className="p-5 overflow-y-auto max-h-[60vh]"
            id={`${activeTab}-panel`}
            role="tabpanel"
            aria-labelledby={`${activeTab}-tab`}
          >
            {activeTab === 'details' && (
              <>
                {/* ID + 复制按钮 */}
                <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded-lg mb-4">
                  <div className="flex items-center space-x-2">
                    <Icon name="id" size={16} className="text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-secondary)]">ID</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <code className="text-sm font-mono text-[var(--text-primary)]">{data.id}</code>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={handleCopyId}
                        className={`text-xs px-2 py-1 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset ${
                          copied
                            ? 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] scale-105'
                            : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95'
                        }`}
                        aria-label="复制 ID"
                        title={copied ? '已复制！' : '复制 ID'}
                      >
                        {copied ? '✓ 已复制' : '📋 复制'}
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="text-xs px-2 py-1 rounded-md bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
                        title="复制链接"
                        aria-label="复制链接"
                      >
                        🔗
                      </button>
                    </div>
                  </div>
                </div>

                {/* 主要信息字段 */}
                <div className="space-y-1">
                  {/* 状态字段（可编辑） */}
                  {isEditMode ? (
                    <DetailField label="状态" icon="status">
                      <select
                        value={editedData.status || data.status || 'todo'}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                        className="text-sm text-[var(--text-primary)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="todo">待办 (todo)</option>
                        <option value="in_progress">进行中 (in_progress)</option>
                        <option value="blocked">已阻塞 (blocked)</option>
                        <option value="done">已完成 (done)</option>
                      </select>
                    </DetailField>
                  ) : (
                    data.status && (
                      <DetailField label="状态" icon="status">
                        <StatusBadge status={data.status} size="sm" />
                      </DetailField>
                    )
                  )}

                  {/* 负责人字段（可编辑） */}
                  {isEditMode ? (
                    <DetailField label="负责人" icon="owner">
                      <input
                        type="text"
                        value={editedData.owner ?? data.owner ?? ''}
                        onChange={(e) => handleFieldChange('owner', e.target.value)}
                        placeholder="输入负责人姓名"
                        className="text-sm text-[var(--text-primary)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded px-2 py-1 w-full max-w-[200px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </DetailField>
                  ) : (
                    data.owner && (
                      <DetailField label="负责人" icon="owner">
                        <span className="text-sm text-[var(--text-primary)]">{data.owner}</span>
                      </DetailField>
                    )
                  )}

                  {/* 优先级字段（可编辑） */}
                  {isEditMode ? (
                    <DetailField label="优先级" icon="priority">
                      <select
                        value={editedData.priority ?? data.priority ?? 'none'}
                        onChange={(e) => handleFieldChange('priority', e.target.value)}
                        className="text-sm text-[var(--text-primary)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="P0">P0 - 紧急</option>
                        <option value="P1">P1 - 高</option>
                        <option value="P2">P2 - 中</option>
                        <option value="none">无优先级</option>
                      </select>
                    </DetailField>
                  ) : (
                    data.priority && (
                      <DetailField label="优先级" icon="priority">
                        <span className={`text-sm ${data.priority === 'high' || data.priority === 'P0' ? 'text-[var(--badge-error-text)] font-medium' : data.priority === 'P1' ? 'text-[var(--badge-warning-text)]' : 'text-[var(--text-primary)]'}`}>
                          {getPriorityLabel(data.priority)}
                        </span>
                      </DetailField>
                    )
                  )}

                  {/* 下一步行动字段（可编辑） */}
                  {isEditMode ? (
                    <div className="py-3 border-b border-[var(--border-light)] dark:border-[var(--border-medium)]">
                      <div className="flex items-center space-x-2 mb-2">
                        <Icon name="action" size={16} className="text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-muted)]">下一步行动</span>
                      </div>
                      <textarea
                        value={editedData.nextAction ?? data.nextAction ?? ''}
                        onChange={(e) => handleFieldChange('nextAction', e.target.value)}
                        placeholder="输入下一步行动"
                        rows={3}
                        className="text-sm text-[var(--text-primary)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                      />
                    </div>
                  ) : (
                    data.nextAction && (
                      <DetailField label="下一步行动" icon="action">
                        <p className="text-sm text-[var(--text-primary)]">{data.nextAction}</p>
                      </DetailField>
                    )
                  )}

                  {/* 截止日期字段（可编辑） */}
                  {isEditMode ? (
                    <DetailField label="截止日期" icon="calendar">
                      <input
                        type="date"
                        value={editedData.dueAt ? new Date(editedData.dueAt).toISOString().split('T')[0] : (data.dueAt ? new Date(data.dueAt).toISOString().split('T')[0] : '')}
                        onChange={(e) => handleFieldChange('dueAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className="text-sm text-[var(--text-primary)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </DetailField>
                  ) : (
                    data.dueAt && (
                      <DetailField label="截止时间" icon="calendar">
                        <span className="text-sm text-[var(--text-primary)]">{formatDate(data.dueAt)}</span>
                      </DetailField>
                    )
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

                  {!isEditMode && data.description && (
                    <div className="py-3 border-b border-[var(--border-light)] dark:border-[var(--border-medium)]">
                      <div className="flex items-center space-x-2 mb-2">
                        <Icon name="note" size={16} className="text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-muted)]">描述</span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap ml-6">{data.description}</p>
                    </div>
                  )}

                  {!isEditMode && data.notes && (
                    <div className="py-3 border-b border-[var(--border-light)] dark:border-[var(--border-medium)]">
                      <div className="flex items-center space-x-2 mb-2">
                        <Icon name="note" size={16} className="text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-muted)]">备注</span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap ml-6">{data.notes}</p>
                    </div>
                  )}

                  {!isEditMode && data.source && (
                    <DetailField label="来源" icon="source">
                      <span className="text-sm text-[var(--text-primary)]">{data.source}</span>
                    </DetailField>
                  )}

                  {/* 元信息标签 */}
                  {!isEditMode && data.metadata?.tags && data.metadata.tags.length > 0 && (
                    <div className="py-3 border-b border-[var(--border-light)] dark:border-[var(--border-medium)]">
                      <div className="flex items-center space-x-2 mb-2 ml-6">
                        <Icon name="tag" size={16} className="text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-muted)]">标签</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 ml-6">
                        {data.metadata.tags.map((tag, index) => (
                          <span key={index} className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2.5 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 内联时间线预览（如果没有标签页） */}
                {hasTimeline && !hasRelated && (
                  <Timeline events={data.timeline!} />
                )}

                {/* 内联关联对象预览（如果没有标签页） */}
                {hasRelated && !hasTimeline && (
                  <RelatedObjects objects={data.relatedObjects!} />
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

                {/* 操作按钮 */}
                {hasCustomActions && (
                  <Actions actions={data.actions || getDefaultActions(data, handleCopyLink)} />
                )}
              </>
            )}

            {activeTab === 'timeline' && hasTimeline && (
              <Timeline events={data.timeline!} />
            )}

            {activeTab === 'related' && hasRelated && (
              <RelatedObjects objects={data.relatedObjects!} />
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="p-4 border-t border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] flex items-center justify-between">
            {isEditMode ? (
              <>
                <div className="flex items-center space-x-3">
                  {saveError && (
                    <span className="text-xs text-[var(--badge-error-text)]">{saveError}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExitEditMode}
                    disabled={isSaving}
                    className="py-2.5 px-5 bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="py-2.5 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSaving ? (
                      <>
                        <Icon name="refresh" size={16} className="animate-spin" />
                        <span>保存中...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={16} />
                        <span>保存</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-[var(--text-muted)]">
                  {data.metadata?.createdUser && (
                    <span>创建：{data.metadata.createdUser} · </span>
                  )}
                  {data.metadata?.updatedUser && (
                    <span>更新：{data.metadata.updatedUser}</span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="py-2.5 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-colors"
                >
                  关闭
                </button>
              </>
            )}
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

// 默认操作按钮
function getDefaultActions(data: DetailData, onCopyLink: () => void): ActionEntry[] {
  const actions: ActionEntry[] = [];
  
  // 所有类型都有复制链接
  actions.push({
    id: 'copy-link',
    label: '复制链接',
    icon: 'link',
    onClick: onCopyLink,
    variant: 'ghost',
  });
  
  // 任务类型添加特殊操作
  if (data.type === 'task') {
    actions.push({
      id: 'complete',
      label: '标记完成',
      icon: 'check',
      onClick: () => console.log('Mark as complete', data.id),
      variant: 'primary',
      disabled: data.status === 'done',
    });
  }
  
  return actions;
}

// ============ 可点击列表项包装器 ============
interface ClickableItemProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  isBlocked?: boolean;
}

export function ClickableItem({ children, onClick, className = '', isBlocked = false }: ClickableItemProps) {
  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    // 添加点击反馈
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(0.98)';
    setTimeout(() => {
      target.style.transform = '';
    }, 100);
    onClick();
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
      className={`
        cursor-pointer transition-all duration-150 ease-out outline-none
        hover:shadow-md hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)]
        focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)] dark:focus:ring-offset-[var(--bg-tertiary)]
        active:scale-[0.98]
        ${isBlocked 
          ? 'bg-[var(--badge-error-bg)]/30 border-l-4 border-l-[var(--color-danger)]' 
          : ''
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}
