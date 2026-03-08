import type { ModuleConfig } from '@/lib/types';

export type DashboardModuleKey =
  | 'dashboard'
  | 'tasks'
  | 'pipelines'
  | 'events'
  | 'memory_topics'
  | 'agents'
  | 'health';

export const DASHBOARD_MODULES: ModuleConfig[] = [
  { name: '任务看板', icon: 'tasks', color: 'from-blue-500 to-blue-600', key: 'tasks' },
  { name: '业务管线', icon: 'pipelines', color: 'from-violet-500 to-violet-600', key: 'pipelines' },
  { name: '日历', icon: 'events', color: 'from-emerald-500 to-emerald-600', key: 'events' },
  { name: '记忆主题', icon: 'book', color: 'from-amber-500 to-amber-600', key: 'memory_topics' },
  { name: '团队概览', icon: 'agents', color: 'from-fuchsia-500 to-fuchsia-600', key: 'agents' },
  { name: '运行健康', icon: 'health', color: 'from-rose-500 to-rose-600', key: 'health' },
];

export function getDashboardModule(key: string) {
  return DASHBOARD_MODULES.find((module) => module.key === key);
}
