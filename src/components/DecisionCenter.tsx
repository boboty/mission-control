'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, DetailModal, ClickableItem, type DetailData } from '.';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';

interface Decision {
  id: number;
  title: string;
  status: string;
  priority: string;
  owner: string;
  blocker: boolean;
  next_action: string;
  due_at: string;
  updated_at?: string;
  source?: string;
}

interface DecisionSummary {
  total: number;
  highPriority: number;
  overdue: number;
  blocked: number;
}

interface DecisionCenterProps {
  decisions: Decision[];
  summary: DecisionSummary;
  loading?: boolean;
  onRefresh?: () => void;
}

// 格式化相对时间
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

// 格式化日期
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 生成决策项的详情数据
function decisionToDetail(decision: Decision): DetailData {
  const timeline: any[] = [];
  
  if (decision.due_at) {
    timeline.push({
      timestamp: decision.due_at,
      type: 'custom' as const,
      title: '截止时间',
      description: '需要在此时间前做出决策',
      icon: 'calendar',
    });
  }
  
  if (decision.updated_at) {
    timeline.push({
      timestamp: decision.updated_at,
      type: 'updated' as const,
      title: '最近更新',
      description: `状态：${decision.status}`,
      icon: 'clock',
    });
  }
  
  const relatedObjects: any[] = [];
  if (decision.blocker) {
    relatedObjects.push({
      id: decision.id,
      type: 'task' as const,
      title: '阻塞任务',
      status: 'blocked',
      link: `/tasks/${decision.id}`,
    });
  }
  
  return {
    id: decision.id,
    type: 'task',
    title: decision.title,
    status: decision.status,
    priority: decision.priority,
    owner: decision.owner,
    dueAt: decision.due_at,
    nextAction: decision.next_action,
    createdAt: decision.due_at ? new Date(new Date(decision.due_at).getTime() - 86400000 * 3).toISOString() : undefined,
    updatedAt: decision.updated_at,
    extra: {
      blocker: decision.blocker,
      source: decision.source,
    },
    metadata: {
      createdUser: decision.owner || '系统',
      updatedUser: decision.owner || '系统',
      tags: [
        decision.priority === 'high' ? '高优' : '',
        decision.blocker ? '阻塞' : '',
        '待决策',
      ].filter(Boolean),
    },
    timeline: timeline.length > 0 ? timeline : undefined,
    relatedObjects: relatedObjects.length > 0 ? relatedObjects : undefined,
  };
}

// 生成一键复制的上下文文本
function generateContextText(decision: Decision): string {
  const lines = [
    `【待决策项 #${decision.id}】`,
    `标题：${decision.title}`,
    `状态：${decision.status}`,
    `优先级：${decision.priority}`,
    `负责人：${decision.owner || '未分配'}`,
    `下一步行动：${decision.next_action || '暂无'}`,
    `截止时间：${formatDate(decision.due_at)}`,
    `更新时间：${formatRelativeTime(decision.updated_at || null)}`,
  ];
  
  if (decision.blocker) {
    lines.push(`⚠️ 阻塞状态：是`);
  }
  
  if (decision.source) {
    lines.push(`来源：${decision.source}`);
  }
  
  return lines.join('\n');
}

// 一键复制函数
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

// 决策项列表项组件
function DecisionItem({ 
  decision, 
  onClick, 
  onCopy 
}: { 
  decision: Decision; 
  onClick: () => void;
  onCopy: (e: React.MouseEvent) => void;
}) {
  const isHighPriority = decision.priority === 'high';
  const isBlocked = decision.blocker;
  const isOverdue = decision.due_at && new Date(decision.due_at) < new Date();
  
  return (
    <div
      className={`
        group flex items-start justify-between py-3 px-3 rounded-lg
        border border-transparent
        transition-all duration-200
        ${isBlocked 
          ? 'bg-[var(--badge-error-bg)]/20 border-[var(--color-danger)]/30' 
          : isOverdue
            ? 'bg-[var(--badge-warning-bg)]/20 border-[var(--color-warning)]/30'
            : 'hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)]'
        }
      `}
    >
      <ClickableItem onClick={onClick} className="flex-1 min-w-0">
        <div className="flex items-start gap-3">
          {/* 状态指示器 */}
          <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
            isBlocked 
              ? 'bg-[var(--color-danger)]' 
              : isHighPriority 
                ? 'bg-[var(--color-warning)]' 
                : 'bg-[var(--color-primary)]'
          }`} />
          
          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium truncate ${
                isBlocked 
                  ? 'text-[var(--badge-error-text)]' 
                  : isHighPriority 
                    ? 'text-[var(--badge-warning-text)]' 
                    : 'text-[var(--text-primary)]'
              }`}>
                {decision.title}
              </span>
              
              {isBlocked && (
                <span className="flex-shrink-0 text-xs bg-[var(--color-danger)] text-white px-2 py-0.5 rounded-full font-medium">
                  🚫 阻塞
                </span>
              )}
              
              {isHighPriority && !isBlocked && (
                <span className="flex-shrink-0 text-xs bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] px-2 py-0.5 rounded-full font-medium">
                  高优
                </span>
              )}
              
              {isOverdue && !isBlocked && (
                <span className="flex-shrink-0 text-xs bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] px-2 py-0.5 rounded-full font-medium">
                  已逾期
                </span>
              )}
            </div>
            
            {decision.next_action && (
              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                📋 {decision.next_action}
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
              {decision.owner && (
                <span className="flex items-center gap-1">
                  <Icon name="owner" size={12} />
                  {decision.owner}
                </span>
              )}
              {decision.due_at && (
                <span className="flex items-center gap-1">
                  <Icon name="calendar" size={12} />
                  {formatDate(decision.due_at)}
                </span>
              )}
              {decision.updated_at && (
                <span>· {formatRelativeTime(decision.updated_at)}</span>
              )}
            </div>
          </div>
        </div>
      </ClickableItem>
      
      {/* 操作按钮 */}
      <div className="flex-shrink-0 ml-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onCopy}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          title="复制上下文"
        >
          <Icon name="copy" size={14} />
        </button>
        <StatusBadge status={decision.status} size="sm" />
      </div>
    </div>
  );
}

// 统计卡片组件
function StatBadge({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: 'blue' | 'violet' | 'rose' | 'amber' 
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };
  
  return (
    <div className={`px-3 py-1.5 rounded-lg ${colorClasses[color]}`}>
      <span className="text-xs font-semibold">{label}</span>
      <span className="ml-2 text-lg font-bold">{value}</span>
    </div>
  );
}

// 决策中心主组件
export function DecisionCenter({ 
  decisions, 
  summary, 
  loading = false,
  onRefresh 
}: DecisionCenterProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<DetailData | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // 打开详情浮窗
  const handleOpenDetail = useCallback((decision: Decision) => {
    setSelectedDecision(decisionToDetail(decision));
    setDetailOpen(true);
  }, []);
  
  // 复制上下文
  const handleCopyContext = useCallback((e: React.MouseEvent, decision: Decision) => {
    e.stopPropagation();
    const text = generateContextText(decision);
    const success = copyToClipboard(text);
    
    if (success) {
      setCopiedId(decision.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);
  
  // 关闭详情浮窗
  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedDecision(null);
  }, []);
  
  if (loading) {
    return (
      <Card hover={false} padding="none">
        <div className="p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-[var(--bg-tertiary)] rounded w-32" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-[var(--bg-tertiary)] rounded" />
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }
  
  if (!decisions || decisions.length === 0) {
    return (
      <Card hover={false} padding="none">
        <div className="p-5 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Icon name="check" size={32} color="white" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">无需决策</h3>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            所有任务都在正常推进，没有待决策项
          </p>
        </div>
      </Card>
    );
  }
  
  return (
    <>
      <Card hover={false} padding="none">
        <div className="p-5">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <CardHeader
              icon="pending"
              iconColor="from-amber-500 to-amber-600"
              title="决策中心"
              subtitle={`共 ${summary.total} 项待决策`}
            />
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                title="刷新"
              >
                <Icon name="refresh" size={18} />
              </button>
            )}
          </div>
          
          {/* 统计信息 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <StatBadge label="总数" value={summary.total} color="blue" />
            <StatBadge label="高优" value={summary.highPriority} color="amber" />
            <StatBadge label="阻塞" value={summary.blocked} color="rose" />
            <StatBadge label="逾期" value={summary.overdue} color="violet" />
          </div>
          
          {/* 决策项列表 */}
          <div className="space-y-2 max-h-96 overflow-y-auto -mx-2 px-2">
            {decisions.map((decision) => (
              <DecisionItem
                key={decision.id}
                decision={decision}
                onClick={() => handleOpenDetail(decision)}
                onCopy={(e) => handleCopyContext(e, decision)}
              />
            ))}
          </div>
          
          {/* 底部提示 */}
          <div className="mt-4 pt-3 border-t border-[var(--border-light)] dark:border-[var(--border-medium)]">
            <p className="text-xs text-[var(--text-muted)] text-center">
              点击条目查看详情 · 悬停显示复制按钮
            </p>
          </div>
        </div>
      </Card>
      
      {/* 详情浮窗 */}
      <DetailModal
        isOpen={detailOpen}
        onClose={handleCloseDetail}
        data={selectedDecision}
      />
    </>
  );
}
