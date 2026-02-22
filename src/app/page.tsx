'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, SkeletonCard, EmptyState, Metric, MetricGroup, StatusBadge, PriorityBadge, DetailModal, ClickableItem, LeftNav, type DetailData } from '../components';
import { Icon } from '../components/Icon';
import { validateData, generateDataQualityReport } from '../lib/data-validation';

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
}

interface Pipeline {
  id: number;
  item_name: string;
  stage: string;
  owner: string;
  due_at: string;
}

interface Event {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  type: string;
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

// 任务排序函数
function sortTasks(tasks: Task[], sortBy: string): Task[] {
  const sorted = [...tasks];
  switch (sortBy) {
    case 'priority':
      return sorted.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      });
    case 'dueDate':
      return sorted.sort((a, b) => {
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });
    case 'status':
      const statusOrder = { todo: 0, in_progress: 1, done: 2 };
      return sorted.sort((a, b) => {
        return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      });
    default:
      return sorted;
  }
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

// ============ 数据转换函数 ============
function taskToDetail(task: Task): DetailData {
  return {
    id: task.id,
    type: 'task',
    title: task.title,
    status: task.status,
    priority: task.priority,
    owner: task.owner,
    dueAt: task.due_at,
    nextAction: task.next_action,
    extra: {
      blocker: task.blocker,
    },
  };
}

function pipelineToDetail(item: Pipeline): DetailData {
  return {
    id: item.id,
    type: 'pipeline',
    title: item.item_name,
    status: item.stage,
    owner: item.owner,
    dueAt: item.due_at,
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
  };
}

// ============ 子组件 ============

// 系统状态指示器
function SystemStatus({ health }: { health: Health[] }) {
  const latest = health[0];
  const isHealthy = latest?.cron_ok && (!latest.blocked_count || latest.blocked_count === 0);
  
  return (
    <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl ${
      isHealthy ? 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]' : 
      'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]'
    }`}>
      <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          isHealthy ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
        }`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
          isHealthy ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
        }`} />
      </span>
      <span className="text-sm font-medium">
        {isHealthy ? '系统正常' : '需要关注'}
      </span>
    </div>
  );
}

// 任务列表项 - 增强阻塞高亮 + 可点击
function TaskItem({ task, compact = false, onClick }: { task: Task; compact?: boolean; onClick?: () => void }) {
  const isBlocked = task.blocker || task.status === 'blocked';
  
  const content = (
    <div className={`
      flex items-start justify-between py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0 
      -mx-2 px-2 rounded-lg transition-all duration-200
      ${isBlocked 
        ? 'bg-[var(--badge-error-bg)]/30 border-l-4 border-l-[var(--color-danger)] pl-1' 
        : ''
      }
    `}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className={`text-sm truncate ${
            isBlocked 
              ? 'font-semibold text-[var(--badge-error-text)]' 
              : task.priority === 'high' 
                ? 'font-semibold text-[var(--text-primary)]' 
                : 'text-[var(--text-secondary)]'
          }`}>
            {task.title}
          </span>
          {task.blocker && (
            <span className="flex-shrink-0 text-xs bg-[var(--color-danger)] text-white px-2 py-0.5 rounded-full font-medium shadow-sm">
              🚫 阻塞
            </span>
          )}
          {task.priority === 'high' && !task.blocker && (
            <span className="flex-shrink-0 text-xs bg-[var(--badge-error-bg)] text-[var(--badge-error-text)] px-2 py-0.5 rounded-full font-medium">
              高优
            </span>
          )}
        </div>
        {!compact && task.next_action && (
          <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{task.next_action}</p>
        )}
        {!compact && task.due_at && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            📅 截止：{formatDate(task.due_at)}
          </p>
        )}
      </div>
      <StatusBadge status={task.status} size="sm" />
    </div>
  );
  
  if (onClick) {
    return (
      <ClickableItem onClick={onClick} isBlocked={isBlocked} className="-mx-2 px-2 rounded-lg">
        {content}
      </ClickableItem>
    );
  }
  return content;
}

// 状态分组任务列表
function TaskGroup({ title, tasks, compact = false, onTaskClick }: { title: string; tasks: Task[]; compact?: boolean; onTaskClick?: (task: Task) => void }) {
  if (tasks.length === 0) return null;
  
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
          {title} · {tasks.length}
        </h4>
      </div>
      <div>
        {tasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            compact={compact} 
            onClick={onTaskClick ? () => onTaskClick(task) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// 管线项
function PipelineItem({ item, onClick }: { item: Pipeline; onClick?: () => void }) {
  const content = (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0 -mx-2 px-2 rounded-lg">
      <span className="text-sm text-[var(--text-secondary)] truncate flex-1">{item.item_name}</span>
      <StatusBadge status={item.stage} size="sm" />
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

// 模块卡片配置 - 使用图标名称替代 emoji
const MODULE_CONFIG = [
  { name: '任务看板', icon: 'tasks', color: 'from-blue-500 to-blue-600', key: 'tasks' },
  { name: '流程管线', icon: 'pipelines', color: 'from-violet-500 to-violet-600', key: 'pipelines' },
  { name: '日历', icon: 'events', color: 'from-emerald-500 to-emerald-600', key: 'events' },
  { name: '记忆归档', icon: 'memories', color: 'from-amber-500 to-amber-600', key: 'memories' },
  { name: '团队概览', icon: 'agents', color: 'from-fuchsia-500 to-fuchsia-600', key: 'agents' },
  { name: '运行健康', icon: 'health', color: 'from-rose-500 to-rose-600', key: 'health' },
];

// ============ 主页面 ============
export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [health, setHealth] = useState<Health[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // 任务看板控制状态
  const [taskSortBy, setTaskSortBy] = useState<'default' | 'priority' | 'dueDate' | 'status'>('default');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'grouped'>('list');
  
  // 详情浮窗状态
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DetailData | null>(null);
  
  // 导航状态
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  
  // 数据验证状态
  const [dataValidation, setDataValidation] = useState<Record<string, { valid: boolean; warnings: string[] }>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksRes, pipelinesRes, eventsRes, agentsRes, memoriesRes, healthRes, metricsRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/pipelines'),
          fetch('/api/events'),
          fetch('/api/agents'),
          fetch('/api/memories'),
          fetch('/api/health'),
          fetch('/api/metrics'),
        ]);

        const tasksData = await tasksRes.json();
        const pipelinesData = await pipelinesRes.json();
        const eventsData = await eventsRes.json();
        const agentsData = await agentsRes.json();
        const memoriesData = await memoriesRes.json();
        const healthData = await healthRes.json();
        const metricsData = await metricsRes.json();

        if (tasksData.tasks) {
          setTasks(tasksData.tasks);
          const validation = validateData('tasks', tasksData.tasks);
          setDataValidation(prev => ({ ...prev, tasks: { valid: validation.valid, warnings: validation.warnings } }));
        }
        if (pipelinesData.pipelines) setPipelines(pipelinesData.pipelines);
        if (eventsData.events) setEvents(eventsData.events);
        if (agentsData.agents) setAgents(agentsData.agents);
        if (memoriesData.memories) setMemories(memoriesData.memories);
        if (healthData.health) {
          setHealth(healthData.health);
          const validation = validateData('health', healthData.health);
          setDataValidation(prev => ({ ...prev, health: { valid: validation.valid, warnings: validation.warnings } }));
        }
        if (metricsData.metrics) setMetricsState(metricsData);

        setLastUpdated(new Date().toISOString());
        setLoading(false);
      } catch (err) {
        setError('无法从数据库加载数据，请检查网络连接');
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // 指标状态（包含趋势）
  const [metricsState, setMetricsState] = useState({
    metrics: { total: 0, inProgress: 0, blocked: 0, pending: 0 },
    trends: { total: 0, inProgress: 0, blocked: 0, pending: 0 },
  });

  // 计算指标（从 API 获取带趋势的数据）
  const metrics = metricsState.metrics;
  const trends = metricsState.trends;

  // 打开详情浮窗
  const openDetail = (data: DetailData) => {
    setSelectedItem(data);
    setDetailOpen(true);
  };
  
  // 渲染模块内容
  const renderModuleContent = (key: string) => {
    switch (key) {
      case 'tasks':
        if (tasks.length === 0) {
          return <EmptyState moduleType="tasks" icon="empty-tasks" title="暂无任务" description="当前没有待办任务，一切正常！" />;
        }
        
        // 应用排序
        const sortedTasks = sortTasks(tasks, taskSortBy);
        
        // 控制视图模式
        if (taskViewMode === 'grouped') {
          const groupedTasks = groupTasksByStatus(sortedTasks);
          return (
            <div className="max-h-64 overflow-y-auto -mx-2">
              {Object.entries(groupedTasks).map(([status, statusTasks]) => (
                <TaskGroup 
                  key={status} 
                  title={statusGroupNames[status] || status} 
                  tasks={statusTasks}
                  compact={true}
                  onTaskClick={(task) => openDetail(taskToDetail(task))}
                />
              ))}
            </div>
          );
        }
        
        // 列表视图
        return (
          <div className="max-h-48 overflow-y-auto -mx-2">
            {sortedTasks.slice(0, 5).map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                compact={true} 
                onClick={() => openDetail(taskToDetail(task))}
              />
            ))}
            {tasks.length > 5 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-3">还有 {tasks.length - 5} 项任务</p>
            )}
          </div>
        );
      case 'pipelines':
        if (pipelines.length === 0) {
          return <EmptyState moduleType="pipelines" icon="empty-pipeline" title="暂无流程" description="当前没有进行中的流程项目" />;
        }
        return (
          <div className="max-h-48 overflow-y-auto -mx-2">
            {pipelines.slice(0, 5).map(item => (
              <PipelineItem 
                key={item.id} 
                item={item} 
                onClick={() => openDetail(pipelineToDetail(item))}
              />
            ))}
            {pipelines.length > 5 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-3">还有 {pipelines.length - 5} 项</p>
            )}
          </div>
        );
      case 'events':
        if (events.length === 0) {
          return <EmptyState moduleType="events" icon="empty-calendar" title="暂无日程" description="近期没有安排的日程" />;
        }
        return (
          <div className="max-h-48 overflow-y-auto -mx-2">
            {events.slice(0, 5).map(event => (
              <EventItem 
                key={event.id} 
                event={event} 
                onClick={() => openDetail(eventToDetail(event))}
              />
            ))}
            {events.length > 5 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-3">还有 {events.length - 5} 项</p>
            )}
          </div>
        );
      case 'memories':
        if (memories.length === 0) {
          return <EmptyState moduleType="memories" icon="empty-archive" title="暂无记录" description="还没有归档的记忆" />;
        }
        return (
          <div className="max-h-48 overflow-y-auto -mx-2">
            {memories.slice(0, 5).map(memory => (
              <MemoryItem 
                key={memory.id} 
                memory={memory} 
                onClick={() => openDetail(memoryToDetail(memory))}
              />
            ))}
            {memories.length > 5 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-3">还有 {memories.length - 5} 条</p>
            )}
          </div>
        );
      case 'agents':
        if (agents.length === 0) {
          return <EmptyState moduleType="agents" icon="empty-team" title="暂无智能体" description="还没有注册的智能体" />;
        }
        return (
          <div className="max-h-48 overflow-y-auto -mx-2">
            {agents.slice(0, 5).map(agent => (
              <AgentItem 
                key={agent.id} 
                agent={agent} 
                onClick={() => openDetail(agentToDetail(agent))}
              />
            ))}
            {agents.length > 5 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-3">还有 {agents.length - 5} 个</p>
            )}
          </div>
        );
      case 'health':
        if (health.length === 0) {
          return <EmptyState moduleType="health" icon="empty-heart" title="暂无数据" description="健康检测数据尚未生成" />;
        }
        return (
          <div className="max-h-48 overflow-y-auto -mx-2">
            {health.slice(0, 5).map(snapshot => (
              <HealthItem 
                key={snapshot.id} 
                snapshot={snapshot} 
                onClick={() => openDetail(healthToDetail(snapshot))}
              />
            ))}
            {health.length > 5 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-3">还有 {health.length - 5} 次检测</p>
            )}
          </div>
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
      />
      
      {/* 主内容区 - 根据导航状态调整左边距 */}
      <main className={`transition-all duration-300 ${navCollapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
          
          {/* ========== 顶部标题区 ========== */}
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">任务控制中心</h1>
                <p className="text-[var(--text-secondary)] mt-2 text-sm">
                  实时数据看板 · Supabase 驱动
                  {lastUpdated && (
                    <span className="ml-3 text-[var(--text-muted)]">
                      · 更新于 {formatUpdateTime(lastUpdated)}
                    </span>
                  )}
                </p>
              </div>
              <SystemStatus health={health} />
            </div>
          </header>

          {/* ========== 错误提示 ========== */}
          {error && (
            <div className="mb-6 p-4 bg-[var(--badge-error-bg)] rounded-xl border border-[var(--border-medium)] flex items-start space-x-3">
              <Icon name="error" size={24} className="text-[var(--badge-error-text)]" />
              <div>
                <p className="text-[var(--badge-error-text)] font-medium text-sm">加载失败</p>
                <p className="text-[var(--badge-error-text)]/80 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* ========== 数据质量警告 ========== */}
          {Object.entries(dataValidation).some(([_, v]) => v.warnings.length > 0) && (
            <div className="mb-6 p-4 bg-[var(--badge-warning-bg)] rounded-xl border border-[var(--border-medium)] flex items-start space-x-3">
              <Icon name="warning" size={24} className="text-[var(--badge-warning-text)]" />
              <div className="flex-1">
                <p className="text-[var(--badge-warning-text)] font-medium text-sm">数据质量提醒</p>
                <ul className="text-[var(--badge-warning-text)]/80 text-sm mt-1 space-y-0.5">
                  {Object.entries(dataValidation).flatMap(([module, validation]) =>
                    validation.warnings.map((w, i) => (
                      <li key={`${module}-${i}`}>
                        <span className="font-medium capitalize">{module}:</span> {w}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* ========== 关键指标区（带趋势） ========== */}
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

          {/* ========== 模块卡片网格 ========== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              MODULE_CONFIG.map((_, i) => <SkeletonCard key={i} lines={4} />)
            ) : (
              MODULE_CONFIG.map((module) => (
                <Card key={module.name} hover padding="none">
                  <div className="p-5">
                    {/* 任务看板特殊处理：添加控制栏 */}
                    {module.key === 'tasks' ? (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-sm`}>
                              <Icon name={module.icon} size={24} color="white" />
                            </div>
                            <div>
                              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{module.name}</h2>
                              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">共 {tasks.length} 项任务</p>
                            </div>
                          </div>
                        </div>
                        {/* 控制栏：排序 + 视图切换 */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-[var(--text-muted)]">排序:</span>
                            <select
                              value={taskSortBy}
                              onChange={(e) => setTaskSortBy(e.target.value as any)}
                              className="text-xs bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] border border-[var(--border-light)] dark:border-[var(--border-medium)] rounded-md px-2 py-1 text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            >
                              <option value="default">默认</option>
                              <option value="priority">优先级</option>
                              <option value="dueDate">截止日期</option>
                              <option value="status">状态</option>
                            </select>
                          </div>
                          <div className="flex items-center space-x-1 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded-lg p-0.5">
                            <button
                              onClick={() => setTaskViewMode('list')}
                              className={`px-2 py-1 text-xs rounded-md transition-all ${
                                taskViewMode === 'list'
                                  ? 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                              }`}
                              title="列表视图"
                            >
                              列表
                            </button>
                            <button
                              onClick={() => setTaskViewMode('grouped')}
                              className={`px-2 py-1 text-xs rounded-md transition-all ${
                                taskViewMode === 'grouped'
                                  ? 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                              }`}
                              title="分组视图"
                            >
                              分组
                            </button>
                          </div>
                        </div>
                        <div className="-mt-3">
                          {renderModuleContent(module.key)}
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
                            module.key === 'events' ? `共 ${events.length} 项日程` :
                            module.key === 'memories' ? `共 ${memories.length} 条记录` :
                            module.key === 'agents' ? `共 ${agents.length} 个智能体` :
                            `共 ${health.length} 次检测`
                          }
                        />
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                          {renderModuleContent(module.key)}
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* ========== 底部状态栏 ========== */}
          <footer className="mt-8">
            <Card hover={false} padding="md">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    M
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Mission Control</h3>
                    <p className="text-xs text-[var(--text-muted)]">MVP · 全部模块已连接实时数据</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-[var(--color-success)] rounded-full mr-2" />
                    Supabase 已连接
                  </span>
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full mr-2" />
                    响应式布局
                  </span>
                </div>
              </div>
            </Card>
          </footer>

          {/* ========== 详情浮窗 ========== */}
          <DetailModal
            isOpen={detailOpen}
            onClose={() => setDetailOpen(false)}
            data={selectedItem}
          />

        </div>
      </main>
    </div>
  );
}
