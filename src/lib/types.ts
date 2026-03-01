// ============ 类型定义 ============

// 任务
export interface Task {
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

// 管线
export interface Pipeline {
  id: number;
  item_name: string;
  stage: string;
  owner: string;
  due_at: string;
}

// 日程
export interface Event {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  type: string;
}

// 智能体
export interface Agent {
  id: number;
  agent_key: string;
  display_name: string;
  state: string;
  last_seen_at: string;
}

// 记忆
export interface Memory {
  id: number;
  title: string;
  category: string;
  ref_path: string;
  summary: string;
  happened_at: string;
}

// 健康快照
export interface Health {
  id: number;
  blocked_count: number;
  pending_decisions: number;
  cron_ok: boolean;
  created_at: string;
  last_sync_at?: string;
  data_updated_at?: string;
  is_stale?: boolean;
}

// 记忆主题
export interface MemoryTopic {
  slug: string;
  title: string;
  ref_path: string;
  summary?: string;
}

// 决策
export interface Decision {
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

// 决策摘要
export interface DecisionSummary {
  total: number;
  highPriority: number;
  overdue: number;
  blocked: number;
}

// 分页信息
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// 模块配置
export interface ModuleConfig {
  name: string;
  icon: string;
  color: string;
  key: string;
}

// 看板列
export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

// 状态选项
export interface StatusOption {
  value: string;
  label: string;
}

// 模块配置常量
export const MODULE_CONFIG: ModuleConfig[] = [
  { name: '任务看板', icon: 'tasks', color: 'from-blue-500 to-blue-600', key: 'tasks' },
  { name: '流程管线', icon: 'pipelines', color: 'from-violet-500 to-violet-600', key: 'pipelines' },
  { name: '日历', icon: 'events', color: 'from-emerald-500 to-emerald-600', key: 'events' },
  { name: '记忆主题', icon: 'memories', color: 'from-orange-500 to-orange-600', key: 'memory_topics' },
  { name: '团队概览', icon: 'agents', color: 'from-fuchsia-500 to-fuchsia-600', key: 'agents' },
  { name: '运行健康', icon: 'health', color: 'from-rose-500 to-rose-600', key: 'health' },
];

// 看板列定义
export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: '待办', color: 'bg-slate-500' },
  { id: 'in_progress', title: '进行中', color: 'bg-blue-500' },
  { id: 'checklist', title: '检查中', color: 'bg-amber-500' },
  { id: 'blocked', title: '阻塞', color: 'bg-rose-500' },
  { id: 'done', title: '已完成', color: 'bg-emerald-500' },
];

// 状态选项
export const STATUS_OPTIONS: StatusOption[] = [
  { value: '', label: '全部状态' },
  { value: 'todo', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'blocked', label: '已阻塞' },
  { value: 'done', label: '已完成' },
];

// 状态组显示名称
export const STATUS_GROUP_NAMES: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  blocked: '已阻塞',
};
