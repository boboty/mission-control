'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, SkeletonCard, EmptyState, Metric, MetricGroup, StatusBadge, DetailModal, ClickableItem, LeftNav, DecisionCenter, AlertCard, aggregateAlerts, type DetailData, type Alert } from '../components';
import { Icon } from '../components/Icon';
import { TaskBoard, TaskItem, SortableTaskItem, Pagination } from '../components/dashboard/TaskBoard';
import { Pipeline as PipelineComponent, PipelineItem } from '../components/dashboard/Pipeline';
import { PipelineList } from '../components/dashboard/PipelineList';
import { CalendarList } from '../components/dashboard/CalendarList';
import type { Pipeline as PipelineType } from '@/lib/types';
import { TeamOverview } from '../components/dashboard/TeamOverview';
import { KANBAN_COLUMNS } from '../lib/types';
import { validateData, generateDataQualityReport } from '../lib/data-validation';
import { pipelineToDetail } from '@/lib/data-utils';
import { DndContext, DragEndEvent, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============ 类型定义 ============
interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  owner: string;
  blocker: boolean;
  next_action: string;
  due_at: string;
  updated_at?: string;
}

type TaskGroupProps = {
  title: string;
  tasks: Task[];
  compact?: boolean;
  onTaskClick: (task: Task) => void;
};

function TaskGroup({ title, tasks, onTaskClick }: TaskGroupProps) {
  return (
    <div className="mb-3">
      <div className="px-2 py-2 text-xs font-semibold text-[var(--text-muted)]">
        {title} · {tasks.length}
      </div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </div>
    </div>
  );
}

interface Event {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  type: string;
  source?: string;
}

interface Agent {
  id: number;
  agent_key: string;
  display_name: string;
  state: string;
  last_seen_at: string;
}

interface Memory {
  id: number;
  title: string;
  category: string;
  ref_path: string;
  summary: string;
  happened_at: string;
}

interface Health {
  id: number;
  blocked_count: number;
  pending_decisions: number;
  cron_ok: boolean;
  created_at: string;
  last_sync_at?: string;
}

interface MemoryTopic {
  slug: string;
  title: string;
  ref_path: string;
  summary?: string;
}

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

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// ============ 工具函数 ============
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatUpdateTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function formatRefreshTime(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (seconds < 10) return '刚刚';
  if (seconds < 60) return `${seconds}秒前`;
  if (minutes < 60) return `${minutes}分钟前`;
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// 按状态分组任务
function groupTasksByStatus(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce((groups, task) => {
    const status = task.status || 'todo';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(task);
    return groups;
  }, {} as Record<string, Task[]>);
}

// 状态组显示名称
const statusGroupNames: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  blocked: '已阻塞',
};

// 状态选项
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'todo', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'blocked', label: '已阻塞' },
  { value: 'done', label: '已完成' },
];

const EVENT_VIEW_OPTIONS = [
  { value: 'upcoming', label: '近期日程' },
  { value: 'all', label: '全部日程' },
];

// ============ 数据转换函数 ============
function taskToDetail(task: Task): DetailData {
  const timeline: any[] = [];
  if (task.due_at) {
    timeline.push({
      timestamp: task.due_at,
      type: 'custom' as const,
      title: '截止日期',
      description: `任务到期`,
      icon: 'calendar',
    });
  }
  timeline.push({
    timestamp: task.updated_at || new Date().toISOString(),
    type: 'updated' as const,
    title: '任务更新',
    description: `状态：${task.status}`,
    icon: 'clock',
  });
  
  const relatedObjects: any[] = [];
  if (task.blocker) {
    relatedObjects.push({
      id: 999,
      type: 'task' as const,
      title: '阻塞任务示例',
      status: 'in_progress',
      link: `/tasks/999`,
    });
  }
  
  return {
    id: task.id,
    type: 'task',
    title: task.title,
    status: task.status,
    priority: task.priority,
    owner: task.owner,
    dueAt: task.due_at,
    nextAction: task.next_action,
    createdAt: task.due_at ? new Date(new Date(task.due_at).getTime() - 86400000 * 3).toISOString() : undefined,
    updatedAt: task.updated_at,
    extra: {
      blocker: task.blocker,
    },
    metadata: {
      createdUser: task.owner || '系统',
      updatedUser: task.owner || '系统',
      tags: task.priority === 'high' ? ['高优', '重点关注'] : [],
    },
    timeline: timeline.length > 0 ? timeline : undefined,
    relatedObjects: relatedObjects.length > 0 ? relatedObjects : undefined,
  };
}

function eventToDetail(event: Event): DetailData {
  return {
    id: event.id,
    type: 'event',
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    category: event.type,
    createdAt: event.starts_at ? new Date(new Date(event.starts_at).getTime() - 86400000).toISOString() : undefined,
    metadata: {
      tags: [event.type || '日程'],
    },
    timeline: [
      {
        timestamp: event.starts_at,
        type: 'custom' as const,
        title: '日程开始',
        icon: 'calendar',
      },
      ...(event.ends_at ? [{
        timestamp: event.ends_at,
        type: 'custom' as const,
        title: '日程结束',
        icon: 'calendar',
      }] : []),
    ],
  };
}

function memoryToDetail(memory: Memory): DetailData {
  return {
    id: memory.id,
    type: 'memory',
    title: memory.title,
    category: memory.category,
    happenedAt: memory.happened_at,
    description: memory.summary,
    source: memory.ref_path,
    createdAt: memory.happened_at,
    metadata: {
      tags: memory.category ? [memory.category] : [],
    },
  };
}

function agentToDetail(agent: Agent): DetailData {
  return {
    id: agent.id,
    type: 'agent',
    title: agent.display_name,
    status: agent.state,
    lastSeenAt: agent.last_seen_at,
    extra: {
      agent_key: agent.agent_key,
    },
    metadata: {
      tags: ['智能体'],
    },
    timeline: agent.last_seen_at ? [{
      timestamp: agent.last_seen_at,
      type: 'updated' as const,
      title: '状态更新',
      description: `状态：${agent.state}`,
    }] : undefined,
  };
}

function healthToDetail(snapshot: Health): DetailData {
  return {
    id: snapshot.id,
    type: 'health',
    title: `健康检测 #${snapshot.id}`,
    status: snapshot.cron_ok ? 'success' : 'error',
    createdAt: snapshot.created_at,
    extra: {
      blocked_count: snapshot.blocked_count,
      pending_decisions: snapshot.pending_decisions,
      cron_ok: snapshot.cron_ok,
    },
    metadata: {
      tags: ['健康检测'],
    },
    timeline: snapshot.created_at ? [{
      timestamp: snapshot.created_at,
      type: 'created' as const,
      title: '健康检测执行',
      description: `阻塞：${snapshot.blocked_count}, 待决：${snapshot.pending_decisions}`,
    }] : undefined,
  };
}

// ============ 子组件 ============

// 系统状态指示器 - 优化视觉
function SystemStatus({ health }: { health: Health[] }) {
  const latest = health[0];
  const isHealthy = latest?.cron_ok && (!latest.blocked_count || latest.blocked_count === 0);

  return (
    <div className={`inline-flex items-center space-x-2.5 px-4 py-2.5 rounded-xl ${
      isHealthy ? 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]' :
      'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]'
    } shadow-sm border border-[var(--border-light)] dark:border-[var(--border-medium)]`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          isHealthy ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
        }`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
          isHealthy ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
        }`} />
      </span>
      <span className="text-sm font-semibold">
        {isHealthy ? '系统正常' : '需要关注'}
      </span>
    </div>
  );
}

function HealthOverviewCard({ health, lastUpdated, alerts }: { health: Health[]; lastUpdated: string | null; alerts: Alert[] }) {
  const latest = health[0];
  if (!latest) return null;

  const staleBase = latest.last_sync_at || latest.created_at || lastUpdated;
  const staleHours = staleBase ? (Date.now() - new Date(staleBase).getTime()) / (1000 * 60 * 60) : 0;
  const staleLevel = staleHours > 24 ? 'error' : staleHours > 2 ? 'warning' : 'success';

  return (
    <Card hover={false} padding="none" className="overflow-hidden">
      <div className="p-6">
        <CardHeader
          icon="health"
          iconColor="from-rose-500 to-rose-600"
          title="健康状态"
          subtitle={`最近检测：${formatUpdateTime(latest.created_at)}`}
        />

        <div className="border-t border-[var(--border-light)] dark:border-[var(--border-medium)] pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] p-4 transition-all duration-200 hover:shadow-md">
              <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">阻塞任务</div>
              <div className={`mt-2 text-2xl font-bold ${latest.blocked_count > 0 ? 'text-[var(--badge-error-text)]' : 'text-[var(--text-primary)]'}`}>
                {latest.blocked_count}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] p-4 transition-all duration-200 hover:shadow-md">
              <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">待决策</div>
              <div className={`mt-2 text-2xl font-bold ${latest.pending_decisions > 0 ? 'text-[var(--badge-warning-text)]' : 'text-[var(--text-primary)]'}`}>
                {latest.pending_decisions}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] p-4 transition-all duration-200 hover:shadow-md">
              <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Cron 心跳</div>
              <div className="mt-2">
                <StatusBadge status={latest.cron_ok ? 'success' : 'error'} size="sm" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)] font-medium">告警聚合</span>
              <span className="text-[var(--text-muted)]">{alerts.length} 条</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={latest.blocked_count > 0 ? 'error' : 'success'} size="sm" label={latest.blocked_count > 0 ? '阻塞>2h/阻塞中' : '阻塞正常'} />
              <StatusBadge status={staleLevel === 'error' ? 'error' : staleLevel === 'warning' ? 'warning' : 'success'} size="sm" label={staleLevel === 'error' ? '数据落后>24h' : staleLevel === 'warning' ? '数据落后>2h' : '数据新鲜'} />
              <StatusBadge status={latest.cron_ok ? 'success' : 'error'} size="sm" label={latest.cron_ok ? '心跳正常' : '失败心跳'} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// 日程项
function EventItem({ event, onClick }: { event: Event; onClick?: () => void }) {
  const content = (
    <div className="py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0 -mx-2 px-2 rounded-lg">
      <div className="text-sm font-medium text-[var(--text-primary)]">{event.title}</div>
      <div className="text-xs text-[var(--text-muted)] mt-1">
        {formatDate(event.starts_at)}
      </div>
    </div>
  );
  
  if (onClick) {
    return (
      <ClickableItem onClick={onClick} className="-mx-2 px-2 rounded-lg">
        {content}
      </ClickableItem>
    );
  }
  return content;
}

// 记忆项
function MemoryItem({ memory, onClick }: { memory: Memory; onClick?: () => void }) {
  const content = (
    <div className="py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0 -mx-2 px-2 rounded-lg">
      <div className="text-sm font-medium text-[var(--text-primary)]">{memory.title}</div>
      <div className="text-xs text-[var(--text-muted)] mt-1">
        {memory.category} · {formatDate(memory.happened_at)}
      </div>
    </div>
  );
  
  if (onClick) {
    return (
      <ClickableItem onClick={onClick} className="-mx-2 px-2 rounded-lg">
        {content}
      </ClickableItem>
    );
  }
  return content;
}

// 智能体项
function AgentItem({ agent, onClick }: { agent: Agent; onClick?: () => void }) {
  const content = (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0 -mx-2 px-2 rounded-lg">
      <div>
        <span className="text-sm text-[var(--text-secondary)]">{agent.display_name}</span>
        {agent.last_seen_at && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDate(agent.last_seen_at)}</p>
        )}
      </div>
      <StatusBadge status={agent.state} size="sm" />
    </div>
  );
  
  if (onClick) {
    return (
      <ClickableItem onClick={onClick} className="-mx-2 px-2 rounded-lg">
        {content}
      </ClickableItem>
    );
  }
  return content;
}

// 健康快照项
function HealthItem({ snapshot, onClick }: { snapshot: Health; onClick?: () => void }) {
  const content = (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0 -mx-2 px-2 rounded-lg">
      <div className="text-sm text-[var(--text-secondary)]">
        <span className={snapshot.blocked_count > 0 ? 'text-[var(--badge-error-text)] font-medium' : ''}>
          阻塞 {snapshot.blocked_count}
        </span>
        <span className="text-[var(--text-muted)] mx-2">·</span>
        <span className={snapshot.pending_decisions > 0 ? 'text-[var(--badge-warning-text)] font-medium' : ''}>
          待决 {snapshot.pending_decisions}
        </span>
      </div>
      <StatusBadge status={snapshot.cron_ok ? 'success' : 'error'} size="sm" />
    </div>
  );
  
  if (onClick) {
    return (
      <ClickableItem onClick={onClick} className="-mx-2 px-2 rounded-lg">
        {content}
      </ClickableItem>
    );
  }
  return content;
}

// 模块卡片配置
const MODULE_CONFIG = [
  { name: '任务看板', icon: 'tasks', color: 'from-blue-500 to-blue-600', key: 'tasks' },
  { name: '业务管线', icon: 'pipelines', color: 'from-violet-500 to-violet-600', key: 'pipelines' },
  { name: '日历', icon: 'events', color: 'from-emerald-500 to-emerald-600', key: 'events' },
  { name: '记忆主题', icon: 'memories', color: 'from-orange-500 to-orange-600', key: 'memory_topics' },
  { name: '团队概览', icon: 'agents', color: 'from-fuchsia-500 to-fuchsia-600', key: 'agents' },
  { name: '运行健康', icon: 'health', color: 'from-rose-500 to-rose-600', key: 'health' },
];

// ============ 主页面 ============
export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipelines, setPipelines] = useState<PipelineType[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  // memories (DB table) UI removed; keep API for potential future use.
  const [health, setHealth] = useState<Health[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [memoryTopics, setMemoryTopics] = useState<MemoryTopic[]>([]);
  const [memoryTopicsLoading, setMemoryTopicsLoading] = useState(false);
  const [decisionSummary, setDecisionSummary] = useState<DecisionSummary>({ total: 0, highPriority: 0, overdue: 0, blocked: 0 });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dataSource] = useState('Supabase');
  
  // 刷新控制状态
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [autoRefreshInterval] = useState(60000); // 60 秒
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  
  // 任务看板控制状态
  const [taskSortBy, setTaskSortBy] = useState<'default' | 'priority' | 'dueDate' | 'status'>('default');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'grouped' | 'kanban'>('list');
  
  // 任务筛选和分页状态
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');
  const [taskPage, setTaskPage] = useState(1);
  const [taskPagination, setTaskPagination] = useState<PaginationInfo | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [eventFrom, setEventFrom] = useState('');
  const [eventTo, setEventTo] = useState('');
  const [eventView, setEventView] = useState<'upcoming' | 'all'>('upcoming');
  const [eventPage, setEventPage] = useState(1);
  const [eventPagination, setEventPagination] = useState<PaginationInfo | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  
  // 拖拽状态
  const [activeId, setActiveId] = useState<number | null>(null);
  const taskSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;
    
    const taskId = Number(active.id);
    // 判断拖拽到哪一列
    let newStatus = '';
    for (const col of KANBAN_COLUMNS) {
      const colTasks = groupTasksByStatus(tasks)[col.id] || [];
      if (colTasks.some((t: Task) => t.id === Number(over.id))) {
        newStatus = col.id;
        break;
      }
    }
    
    if (!newStatus) {
      // 可能拖到了列标题，检查 over.id 是否是列 id
      if (KANBAN_COLUMNS.some(col => col.id === String(over.id))) {
        newStatus = String(over.id);
      }
    }
    
    if (!newStatus) return;
    
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;
    
    // 乐观更新
    const oldStatus = currentTask.status;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus, actor: 'user', meta: { reason: 'drag' } }),
      });
      
      if (!res.ok) {
        // 回滚
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
        alert('移动任务失败');
      }
    } catch (e) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
      alert('移动任务失败');
    }
  };
  
  // 详情浮窗状态
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DetailData | null>(null);
  
  // 导航状态
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 数据验证状态
  const [dataValidation, setDataValidation] = useState<Record<string, { valid: boolean; warnings: string[] }>>({});

  // 刷新所有数据
  const refreshAllData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    
    try {
      const eventsInitParams = new URLSearchParams({
        page: '1',
        pageSize: '20',
        view: 'upcoming',
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });

      const [tasksRes, pipelinesRes, eventsRes, agentsRes, memoryTopicsRes, healthRes, metricsRes, decisionsRes] = await Promise.all([
        fetch(`/api/tasks?page=1&pageSize=20`),
        fetch('/api/pipelines'),
        fetch(`/api/events?${eventsInitParams.toString()}`),
        fetch('/api/agents'),
        fetch('/api/memory-topics'),
        fetch('/api/health'),
        fetch('/api/metrics'),
        fetch('/api/decisions'),
      ]);

      const tasksData = await tasksRes.json();
      const pipelinesData = await pipelinesRes.json();
      const eventsData = await eventsRes.json();
      const agentsData = await agentsRes.json();
      const memoryTopicsData = await memoryTopicsRes.json();
      const healthData = await healthRes.json();
      const metricsData = await metricsRes.json();
      const decisionsData = await decisionsRes.json();

      if (tasksData.tasks) {
        setTasks(tasksData.tasks);
        setTaskPagination(tasksData.pagination);
        const validation = validateData('tasks', tasksData.tasks);
        setDataValidation(prev => ({ ...prev, tasks: { valid: validation.valid, warnings: validation.warnings } }));
      }
      if (pipelinesData.pipelines) setPipelines(pipelinesData.pipelines);
      if (eventsData.events) {
        setEvents(eventsData.events);
        setEventPagination(eventsData.pagination);
        setEventPage(eventsData.pagination?.page || 1);
      }
      if (agentsData.agents) setAgents(agentsData.agents);
      if (memoryTopicsData?.topics) {
        setMemoryTopics(memoryTopicsData.topics);
      }
      if (healthData.health) {
        setHealth(healthData.health);
        const validation = validateData('health', healthData.health);
        setDataValidation(prev => ({ ...prev, health: { valid: validation.valid, warnings: validation.warnings } }));
      }
      if (metricsData.metrics) setMetricsState(metricsData);
      if (decisionsData.decisions) {
        setDecisions(decisionsData.decisions);
        if (decisionsData.summary) {
          setDecisionSummary(decisionsData.summary);
        }
      }

      const syncCandidates = [
        tasksData?.last_sync_at,
        pipelinesData?.last_sync_at,
        eventsData?.last_sync_at,
        agentsData?.last_sync_at,
        healthData?.last_sync_at,
        metricsData?.last_sync_at,
        decisionsData?.last_sync_at,
      ].filter(Boolean);
      const lastUpdate = syncCandidates.length > 0
        ? syncCandidates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0]
        : new Date().toISOString();
      setLastUpdated(lastUpdate);
      setLastRefreshTime(new Date());
      
      // 生成告警
      const generatedAlerts = aggregateAlerts(healthData.health || [], tasksData.tasks || [], lastUpdate);
      setAlerts(generatedAlerts);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  }, []);

  // 自动刷新定时器
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      refreshAllData(false); // 静默刷新，不显示加载状态
    }, autoRefreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, autoRefreshInterval, refreshAllData]);

  // 获取任务数据（支持分页、筛选、搜索）
  const fetchTasks = useCallback(async (page = 1) => {
    setTaskLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        sortBy: taskSortBy,
      });
      if (taskStatusFilter) params.append('status', taskStatusFilter);
      if (taskSearch) params.append('search', taskSearch);
      
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      
      if (data.tasks) {
        setTasks(data.tasks);
        setTaskPagination(data.pagination);
        const validation = validateData('tasks', data.tasks);
        setDataValidation(prev => ({ ...prev, tasks: { valid: validation.valid, warnings: validation.warnings } }));
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setTaskLoading(false);
    }
  }, [taskSortBy, taskStatusFilter, taskSearch]);

  const fetchEvents = useCallback(async (page = 1) => {
    setEventLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        view: eventView,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });
      if (eventTypeFilter) params.append('type', eventTypeFilter);
      if (eventSearch) params.append('search', eventSearch);
      if (eventFrom) params.append('from', eventFrom);
      if (eventTo) params.append('to', eventTo);

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
        setEventPagination(data.pagination);
        setEventPage(page);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setEventLoading(false);
    }
  }, [eventFrom, eventSearch, eventTo, eventTypeFilter, eventView]);

  // 初始加载所有数据
  useEffect(() => {
    async function fetchData() {
      try {
        await refreshAllData(true);
        setLoading(false);
      } catch (err) {
        setError('无法从数据库加载数据，请检查网络连接');
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // 当筛选条件变化时重新获取任务
  useEffect(() => {
    if (!loading) {
      fetchTasks(1);
      setTaskPage(1);
    }
  }, [taskStatusFilter, taskSearch, taskSortBy]);

  useEffect(() => {
    if (!loading && activeModule === 'events') {
      fetchEvents(1);
    }
  }, [loading, activeModule, eventTypeFilter, eventSearch, eventFrom, eventTo, eventView, fetchEvents]);

  // 处理分页变化
  const handleTaskPageChange = (newPage: number) => {
    fetchTasks(newPage);
    setTaskPage(newPage);
  };

  const handleEventPageChange = (newPage: number) => {
    fetchEvents(newPage);
    setEventPage(newPage);
  };

  // 指标状态
  const [metricsState, setMetricsState] = useState({
    metrics: { total: 0, inProgress: 0, blocked: 0, pending: 0 },
    trends: { total: 0, inProgress: 0, blocked: 0, pending: 0 },
  });

  const metrics = metricsState.metrics;
  const trends = metricsState.trends;

  // 过滤掉已关闭的告警
  const filteredAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

  // 打开详情浮窗
  const openDetail = (data: DetailData) => {
    setSelectedItem(data);
    setDetailOpen(true);
  };
  const eventTypeOptions = Array.from(new Set(events.map(e => e.type).filter(Boolean)));
  
  // 渲染模块内容
  const renderModuleContent = (key: string, isSingleModule = false) => {
    switch (key) {
      case 'tasks':
        if (tasks.length === 0 && !taskLoading) {
          return <EmptyState moduleType="tasks" icon="empty-tasks" title="暂无任务" description="当前没有待办任务，一切正常！" />;
        }
        
        // 分组视图
        if (taskViewMode === 'grouped') {
          const groupedTasks = groupTasksByStatus(tasks);
          return (
            <div className={`${isSingleModule ? 'max-h-none' : 'max-h-[420px]'} overflow-y-auto -mx-2`}>
              {Object.entries(groupedTasks).map(([status, statusTasks]) => (
                <TaskGroup 
                  key={status} 
                  title={statusGroupNames[status] || status} 
                  tasks={statusTasks}
                  compact={true}
                  onTaskClick={(task) => openDetail(taskToDetail(task))}
                />
              ))}
              {taskPagination && <Pagination pagination={taskPagination} onPageChange={handleTaskPageChange} />}
            </div>
          );
        }
        
        // 看板视图 (Kanban)
        if (taskViewMode === 'kanban') {
          const groupedTasks = groupTasksByStatus(tasks);
          return (
            <DndContext 
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              sensors={taskSensors}
            >
              <div className="grid grid-cols-5 gap-3 overflow-x-auto">
                {KANBAN_COLUMNS.map(col => (
                  <div key={col.id} className="min-w-[200px]">
                    <div className={`${col.color} text-white text-xs font-medium px-3 py-2 rounded-t-lg flex items-center justify-between`}>
                      <span>{col.title}</span>
                      <span className="opacity-75">{groupedTasks[col.id]?.length || 0}</span>
                    </div>
                    <div className="bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded-b-lg p-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                      <SortableContext items={groupedTasks[col.id]?.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                        {groupedTasks[col.id]?.map(task => (
                          <SortableTaskItem 
                            key={task.id} 
                            task={task}
                            onClick={() => openDetail(taskToDetail(task))}
                          />
                        ))}
                      </SortableContext>
                      {(!groupedTasks[col.id] || groupedTasks[col.id].length === 0) && (
                        <div className="text-center text-xs text-[var(--text-muted)] py-4">暂无</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <DragOverlay>
                {activeId ? (
                  <div className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] p-3 rounded-lg shadow-lg border border-[var(--color-primary)] opacity-90">
                    <span className="text-sm text-[var(--text-primary)]">
                      {tasks.find(t => t.id === activeId)?.title?.substring(0, 30)}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          );
        }
        
        // 列表视图
        return (
          <div className={`${isSingleModule ? 'max-h-none' : 'max-h-[420px]'} overflow-y-auto -mx-2`}>
            {taskLoading ? (
              <div className="py-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>
            ) : (
              <>
                {tasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onClick={() => openDetail(taskToDetail(task))}
                  />
                ))}
                {taskPagination && <Pagination pagination={taskPagination} onPageChange={handleTaskPageChange} />}
              </>
            )}
          </div>
        );
      case 'pipelines':
        if (pipelines.length === 0) {
          return <EmptyState moduleType="pipelines" icon="empty-pipeline" title="暂无流程" description="当前没有进行中的流程项目" action={<button className="btn btn-primary">新建流程</button>} />;
        }
        return (
          <div className={`${isSingleModule ? '' : 'max-h-[420px]'} overflow-y-auto -mx-2`}>
            {pipelines.map(item => (
              <PipelineItem 
                key={item.id} 
                item={item} 
                onClick={() => openDetail(pipelineToDetail(item))}
              />
            ))}
          </div>
        );
      case 'events':
        if (eventLoading && events.length === 0) {
          return <div className="py-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>;
        }
        if (events.length === 0) {
          return <EmptyState moduleType="events" icon="empty-calendar" title="暂无日程" description="近期没有安排的日程" action={<button className="btn btn-primary">新建日程</button>} />;
        }
        return (
          <div className={`${isSingleModule ? '' : 'max-h-[420px]'} overflow-y-auto -mx-2`}>
            {(isSingleModule ? events : events.slice(0, 5)).map(event => (
              <EventItem 
                key={event.id} 
                event={event} 
                onClick={() => openDetail(eventToDetail(event))}
              />
            ))}
            {isSingleModule && eventPagination && <Pagination pagination={eventPagination} onPageChange={handleEventPageChange} />}
          </div>
        );
      case 'agents':
        return <TeamOverview agents={agents} openDetail={openDetail} />;
      case 'memory_topics':
        if (memoryTopicsLoading) {
          return <div className="py-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>;
        }
        if (memoryTopics.length === 0) {
          return <EmptyState moduleType="memories" icon="empty-archive" title="暂无主题" description="memory/topics 下还没有主题文件" />;
        }
        return (
          <div className={`${isSingleModule ? '' : 'max-h-[420px]'} overflow-y-auto -mx-2`}>
            {memoryTopics.map((t) => (
              <ClickableItem
                key={t.slug}
                onClick={async () => {
                  try {
                    setMemoryTopicsLoading(true);
                    const res = await fetch(`/api/memory-topics/${t.slug}`);
                    const data = await res.json();
                    openDetail({
                      id: 0,
                      type: 'memory',
                      title: t.title || t.slug,
                      category: 'topic',
                      description: data?.content || '',
                      source: data?.ref_path || t.ref_path,
                      createdAt: new Date().toISOString(),
                      metadata: { tags: ['memory/topics'] },
                    } as any);
                  } finally {
                    setMemoryTopicsLoading(false);
                  }
                }}
                className="-mx-2 px-2 rounded-lg"
              >
                <div className="py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0">
                  <div className="text-sm font-medium text-[var(--text-primary)]">{t.title || t.slug}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 truncate">
                    {t.summary || t.ref_path}
                  </div>
                </div>
              </ClickableItem>
            ))}
          </div>
        );
      case 'health':
        if (health.length === 0) {
          return <EmptyState moduleType="health" icon="empty-heart" title="暂无数据" description="健康检测数据尚未生成" />;
        }
        return (
          <HealthOverviewCard health={health} lastUpdated={lastUpdated} alerts={alerts} />
        );
      default:
        return null;
    }
  };

    return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-primary)] to-[var(--bg-secondary)] dark:from-[var(--bg-primary)] dark:via-[var(--bg-secondary)] dark:to-[var(--bg-primary)]">
      {/* 左侧导航 */}
      <LeftNav 
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        collapsed={navCollapsed}
        onToggle={() => setNavCollapsed(!navCollapsed)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      
      {/* 主内容区 */}
      <main className={`transition-all duration-300 ${isMobile ? 'ml-0' : navCollapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-7xl mx-auto">
          
          {/* 顶部标题区 - 优化布局 */}
          <header className="mb-6 sm:mb-10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {/* 移动端汉堡菜单 */}
                  {isMobile && (
                    <button
                      onClick={() => setMobileNavOpen(true)}
                      className="hamburger-btn flex-shrink-0"
                      aria-label="打开导航菜单"
                    >
                      <Icon name="menu" size={22} color="var(--text-secondary)" />
                    </button>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight truncate">
                    {activeModule === 'dashboard' ? '任务控制中心' : MODULE_CONFIG.find(m => m.key === activeModule)?.name || '模块'}
                  </h1>
                </div>
                <p className="text-[var(--text-secondary)] mt-2 text-xs sm:text-sm flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] font-medium text-xs">
                    数据源：{dataSource}
                  </span>
                  {lastUpdated && (
                    <span className="text-[var(--text-muted)] truncate">
                      · 最近同步：{formatUpdateTime(lastUpdated)}
                    </span>
                  )}
                  {activeModule !== 'dashboard' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-medium text-xs">
                      单模块视图
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {activeModule === 'dashboard' && !isMobile && <SystemStatus health={health} />}
                {/* 手动刷新按钮 - 移动端简化 */}
                <button
                  onClick={() => refreshAllData(true)}
                  disabled={isRefreshing}
                  className={`inline-flex items-center justify-center p-2 sm:px-4 sm:py-2 rounded-lg text-sm font-medium transition-all min-w-[44px] min-h-[44px] ${
                    isRefreshing
                      ? 'bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'
                      : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                  }`}
                  title="手动刷新所有数据"
                  aria-label="刷新数据"
                >
                  <Icon 
                    name="refresh" 
                    size={18} 
                    className={isRefreshing ? 'animate-spin' : ''}
                  />
                  {!isMobile && <span className="ml-1.5">{isRefreshing ? '刷新中...' : '刷新'}</span>}
                </button>
              </div>
            </div>
          </header>

          {/* 刷新状态指示器 - 非阻断式 */}
          {isRefreshing && (
            <div className="mb-6 p-3 rounded-xl bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="refresh" size={16} className="text-[var(--color-primary)]" />
                <span className="text-sm font-medium text-[var(--color-primary)]">正在刷新数据...</span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                自动刷新：{autoRefreshEnabled ? '已启用' : '已禁用'}
              </span>
            </div>
          )}

          {/* 错误提示 - 优化样式 */}
          {error && (
            <div className="mb-8 p-5 bg-[var(--badge-error-bg)] rounded-2xl border border-[var(--border-medium)] shadow-sm flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--badge-error-bg)] flex items-center justify-center flex-shrink-0">
                <Icon name="error" size={24} className="text-[var(--badge-error-text)]" />
              </div>
              <div className="flex-1">
                <p className="text-[var(--badge-error-text)] font-semibold text-sm">加载失败</p>
                <p className="text-[var(--badge-error-text)]/85 text-sm mt-1.5">{error}</p>
              </div>
            </div>
          )}

          {/* 数据质量警告 - 优化样式 */}
          {Object.entries(dataValidation).some(([_, v]) => v.warnings.length > 0) && (
            <div className="mb-8 p-5 bg-[var(--badge-warning-bg)] rounded-2xl border border-[var(--border-medium)] shadow-sm flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--badge-warning-bg)] flex items-center justify-center flex-shrink-0">
                <Icon name="warning" size={24} className="text-[var(--badge-warning-text)]" />
              </div>
              <div className="flex-1">
                <p className="text-[var(--badge-warning-text)] font-semibold text-sm">数据质量提醒</p>
                <ul className="text-[var(--badge-warning-text)]/85 text-sm mt-1.5 space-y-1">
                  {Object.entries(dataValidation).flatMap(([module, validation]) =>
                    validation.warnings.map((w, i) => (
                      <li key={`${module}-${i}`} className="flex items-start">
                        <span className="text-[var(--badge-warning-text)] mr-2 mt-0.5">·</span>
                        <span><span className="font-semibold capitalize">{module}:</span> {w}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* 单模块视图 */}
          {activeModule !== 'dashboard' ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveModule('dashboard')}
                  className="text-sm px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] border border-[var(--border-light)] dark:border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center space-x-2"
                >
                  <Icon name="arrow-left" size={16} />
                  <span>返回仪表盘</span>
                </button>
              </div>

              <Card hover={false} padding="none">
                <div className="p-5">
                  {activeModule === 'tasks' ? (
                    <>
                      {/* 视图切换按钮 */}
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold dark:text-[var(--text-primary)]">任务看板</h2>
                        <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                          {(['list', 'grouped', 'kanban'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setTaskViewMode(mode)}
                              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                taskViewMode === mode
                                  ? 'bg-[var(--color-primary)] text-white'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {mode === 'list' ? '列表' : mode === 'grouped' ? '分组' : '看板'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <TaskBoard 
                        tasks={tasks} 
                        setTasks={setTasks} 
                        loading={taskLoading} 
                        openDetail={openDetail}
                        taskViewMode={taskViewMode}
                        setTaskViewMode={setTaskViewMode}
                      />
                    </>
                  ) : activeModule === 'pipelines' ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold dark:text-[var(--text-primary)]">业务管线</h2>
                      </div>
                      <PipelineList
                        pipelines={pipelines}
                        setPipelines={setPipelines}
                        loading={loading}
                        openDetail={openDetail}
                      />
                    </>
                  ) : activeModule === 'events' ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold dark:text-[var(--text-primary)]">日历列表</h2>
                        {eventPagination && (
                          <span className="text-xs text-[var(--text-muted)]">
                            第 {eventPage} 页 · 共 {eventPagination.total} 项
                          </span>
                        )}
                      </div>
                      <CalendarList
                        events={events}
                        setEvents={setEvents}
                        loading={eventLoading}
                        openDetail={openDetail}
                      />
                    </>
                  ) : (
                    <>
                      <CardHeader
                        icon={MODULE_CONFIG.find(m => m.key === activeModule)?.icon || 'metrics'}
                        iconColor={MODULE_CONFIG.find(m => m.key === activeModule)?.color || 'from-slate-500 to-slate-600'}
                        title={MODULE_CONFIG.find(m => m.key === activeModule)?.name || activeModule}
                        subtitle="单模块视图"
                      />
                      <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                        {renderModuleContent(activeModule, true)}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <>
              {/* 仪表盘视图 - 关键指标区 */}
              <MetricGroup>
                {loading ? (
                  <>
                    <Metric label="任务总数" value={0} loading />
                    <Metric label="进行中" value={0} loading />
                    <Metric label="阻塞" value={0} loading />
                    <Metric label="待决策" value={0} loading />
                  </>
                ) : (
                  <>
                    <Metric 
                      label="任务总数" 
                      value={metrics.total} 
                      icon="metrics" 
                      color="blue"
                      trend={trends.total > 0 ? 'up' : trends.total < 0 ? 'down' : 'neutral'}
                      trendValue={trends.total !== 0 ? `${trends.total > 0 ? '+' : ''}${trends.total}` : undefined}
                    />
                    <Metric 
                      label="进行中" 
                      value={metrics.inProgress} 
                      icon="in-progress" 
                      color="violet"
                      trend={trends.inProgress > 0 ? 'up' : trends.inProgress < 0 ? 'down' : 'neutral'}
                      trendValue={trends.inProgress !== 0 ? `${trends.inProgress > 0 ? '+' : ''}${trends.inProgress}` : undefined}
                    />
                    <Metric 
                      label="阻塞" 
                      value={metrics.blocked} 
                      icon="blocked" 
                      color={metrics.blocked > 0 ? 'rose' : 'emerald'}
                      trend={trends.blocked > 0 ? 'up' : trends.blocked < 0 ? 'down' : 'neutral'}
                      trendValue={trends.blocked !== 0 ? `${trends.blocked > 0 ? '+' : ''}${trends.blocked}` : undefined}
                    />
                    <Metric 
                      label="待决策" 
                      value={metrics.pending} 
                      icon="pending" 
                      color={metrics.pending > 0 ? 'amber' : 'slate'}
                      trend={trends.pending > 0 ? 'up' : trends.pending < 0 ? 'down' : 'neutral'}
                      trendValue={trends.pending !== 0 ? `${trends.pending > 0 ? '+' : ''}${trends.pending}` : undefined}
                    />
                  </>
                )}
              </MetricGroup>

              {/* 告警卡片区域 - 增加间距 */}
              {!loading && filteredAlerts.length > 0 && (
                <div className="mb-6">
                  <AlertCard 
                    alerts={filteredAlerts} 
                    compact={true} 
                    onDismiss={(id) => setDismissedAlerts(prev => [...prev, id])} 
                  />
                </div>
              )}

              {/* 决策中心模块 - 增加间距 */}
              {!loading && (
                <div className="mb-8">
                  <DecisionCenter 
                    decisions={decisions} 
                    summary={decisionSummary}
                    loading={false}
                    onRefresh={() => {
                      fetch('/api/decisions').then(res => res.json()).then(data => {
                        if (data.decisions) {
                          setDecisions(data.decisions);
                          if (data.summary) setDecisionSummary(data.summary);
                          if (data.last_sync_at) setLastUpdated(data.last_sync_at);
                        }
                      });
                    }}
                    onResolve={async (decision) => {
                      // 标记为 done
                      try {
                        const res = await fetch('/api/tasks', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ taskId: decision.id, status: 'done', actor: 'user', meta: { reason: 'decision_resolved' } }),
                        });
                        if (res.ok) {
                          // 刷新决策列表
                          fetch('/api/decisions').then(r => r.json()).then(data => {
                            if (data.decisions) {
                              setDecisions(data.decisions);
                              if (data.summary) setDecisionSummary(data.summary);
                            }
                          });
                          // 刷新任务列表
                          fetchTasks();
                        }
                      } catch (e) {
                        console.error('Failed to resolve decision:', e);
                      }
                    }}
                  />
                </div>
              )}

              {/* 模块卡片网格 - 优化间距和视觉 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {loading ? (
                  MODULE_CONFIG.map((_, i) => <SkeletonCard key={i} lines={4} />)
                ) : (
                  MODULE_CONFIG.map((module) => (
                    module.key === 'health' ? (
                      <HealthOverviewCard key={module.name} health={health} lastUpdated={lastUpdated} alerts={alerts} />
                    ) : (
                      <Card key={module.name} hover padding="none" className="overflow-hidden">
                        <div className="p-6">
                          {module.key === 'tasks' ? (
                            <>
                              <div className="flex items-start justify-between mb-5">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-md ring-2 ring-white/20 dark:ring-white/10`}>
                                    <Icon name={module.icon} size={24} color="white" />
                                  </div>
                                  <div>
                                    <h2 className="text-lg font-bold dark:text-[var(--text-primary)] tracking-tight">{module.name}</h2>
                                    <p className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] text-sm mt-0.5">共 {taskPagination?.total || tasks.length} 项任务</p>
                                  </div>
                                </div>
                              </div>
                              <div className="-mt-3">
                                {renderModuleContent(module.key, false)}
                              </div>
                            </>
                          ) : (
                            <>
                              <CardHeader
                                icon={module.icon}
                                iconColor={module.color}
                                title={module.name}
                                subtitle={
                                  module.key === 'pipelines' ? `共 ${pipelines.length} 项流程` :
                                  module.key === 'events' ? `共 ${eventPagination?.total ?? events.length} 项日程` :
                                  module.key === 'memory_topics' ? `共 ${memoryTopics.length} 个主题` :
                                  module.key === 'agents' ? `共 ${agents.length} 个智能体` :
                                  `共 ${health.length} 次检测`
                                }
                              />
                              <div className="border-t border-[var(--border-light)] dark:border-[var(--border-medium)] pt-4">
                                {renderModuleContent(module.key, false)}
                              </div>
                            </>
                          )}
                        </div>
                      </Card>
                    )
                  ))
                )}
              </div>
            </>
          )}

          {/* 移动端底部导航 */}
          {isMobile && (
            <nav className="mobile-bottom-nav" role="navigation" aria-label="底部导航">
              {MODULE_CONFIG.slice(0, 5).map((module) => (
                <button
                  key={module.key}
                  onClick={() => setActiveModule(module.key)}
                  className={`flex-1 flex flex-col items-center justify-center py-2 min-w-[50px] transition-colors ${
                    activeModule === module.key
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                  aria-label={module.label}
                  aria-current={activeModule === module.key ? 'page' : undefined}
                >
                  <Icon 
                    name={module.icon} 
                    size={22} 
                    color={activeModule === module.key ? 'var(--color-primary)' : 'var(--text-muted)'}
                    className="mb-0.5"
                  />
                  <span className="text-[10px] font-medium truncate w-full text-center">
                    {module.label.slice(0, 2)}
                  </span>
                </button>
              ))}
              <button
                onClick={() => setActiveModule('health')}
                className={`flex-1 flex flex-col items-center justify-center py-2 min-w-[50px] transition-colors ${
                  activeModule === 'health'
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--text-muted)]'
                }`}
                aria-label="运行健康"
              >
                <Icon 
                  name="health" 
                  size={22} 
                  color={activeModule === 'health' ? 'var(--color-primary)' : 'var(--text-muted)'}
                  className="mb-0.5"
                />
                <span className="text-[10px] font-medium">健康</span>
              </button>
            </nav>
          )}

          {/* 底部状态栏 - 优化视觉（桌面端显示） */}
          <footer className="mt-12 mb-6 hide-mobile">
            <Card hover={false} padding="md">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white/20 dark:ring-white/10">
                    M
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">Mission Claw</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">MVP · 实时任务总览</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                    <span className="w-2 h-2 bg-[var(--color-success)] rounded-full mr-2" />
                    数据源：{dataSource}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                    <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full mr-2" />
                    {lastUpdated ? `最近同步：${formatUpdateTime(lastUpdated)}` : '等待首次同步'}
                  </span>
                </div>
              </div>
            </Card>
          </footer>

          {/* 详情浮窗 */}
          <DetailModal
            isOpen={detailOpen}
            onClose={() => setDetailOpen(false)}
            data={selectedItem}
            onTaskUpdated={() => {
              // 任务更新后刷新列表
              fetchTasks(taskPage);
            }}
          />

        </div>
      </main>
    </div>
  );
}
