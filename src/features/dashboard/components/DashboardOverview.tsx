'use client';

import { AlertCard, Card, CardHeader, DecisionCenter, Metric, MetricGroup, SkeletonCard } from '@/components';
import { ModuleContent, type ModuleContentProps } from './ModuleContent';
import { DASHBOARD_MODULES } from '../lib/dashboard-config';
import { getAgentSummary, getEventSummary, getMemoryTopicSummary, getPipelineSummary, getTaskSummary } from '../lib/module-summaries';
import type { Decision, DecisionSummary, PaginationInfo } from '@/lib/types';

function getTrendDirection(value: number) {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'neutral';
}

function getModuleSubtitle(
  moduleKey: string,
  counts: {
    taskTotal: number;
    pipelineTotal: number;
    eventTotal: number;
    memoryTopicTotal: number;
    agentTotal: number;
    healthTotal: number;
  },
  context: {
    tasks: ModuleContentProps['tasks'];
    pipelines: ModuleContentProps['pipelines'];
    events: ModuleContentProps['events'];
    memoryTopics: ModuleContentProps['memoryTopics'];
    agents: ModuleContentProps['agents'];
  }
) {
  switch (moduleKey) {
    case 'tasks': {
      const summary = getTaskSummary(context.tasks);
      return `${counts.taskTotal} 项任务 · 阻塞 ${summary.blockedCount} · 高优 ${summary.highPriorityCount}`;
    }
    case 'pipelines': {
      const summary = getPipelineSummary(context.pipelines);
      return `${counts.pipelineTotal} 项流程 · 临期 ${summary.dueSoonCount} · 逾期 ${summary.overdueCount}`;
    }
    case 'events': {
      const summary = getEventSummary(context.events);
      return `本月 ${counts.eventTotal} 项 · 今天 ${summary.todayCount} · 7 天内 ${summary.upcomingCount}`;
    }
    case 'memory_topics': {
      const summary = getMemoryTopicSummary(context.memoryTopics);
      return `${counts.memoryTopicTotal} 个主题 · 有摘要 ${summary.withSummaryCount}`;
    }
    case 'agents': {
      const summary = getAgentSummary(context.agents);
      return `${counts.agentTotal} 个智能体 · 在线 ${summary.onlineCount} · 空闲 ${summary.idleCount}`;
    }
    default:
      return `共 ${counts.healthTotal} 次检测`;
  }
}

export function DashboardOverview({
  loading,
  metrics,
  trends,
  filteredAlerts,
  onDismissAlert,
  decisions,
  decisionSummary,
  onRefreshDecisions,
  onResolveDecision,
  moduleContentProps,
  taskPagination,
  pipelinesCount,
  eventPagination,
  memoryTopicsCount,
  agentsCount,
  healthCount,
}: {
  loading: boolean;
  metrics: { total: number; inProgress: number; blocked: number; pending: number };
  trends: { total: number; inProgress: number; blocked: number; pending: number };
  filteredAlerts: import('@/components').Alert[];
  onDismissAlert: (id: string) => void;
  decisions: Decision[];
  decisionSummary: DecisionSummary;
  onRefreshDecisions: () => void;
  onResolveDecision: (decision: Decision) => void;
  moduleContentProps: Omit<ModuleContentProps, 'moduleKey' | 'isSingleModule'>;
  taskPagination: PaginationInfo | null;
  pipelinesCount: number;
  eventPagination: PaginationInfo | null;
  memoryTopicsCount: number;
  agentsCount: number;
  healthCount: number;
}) {
  const counts = {
    taskTotal: taskPagination?.total ?? moduleContentProps.tasks.length,
    pipelineTotal: pipelinesCount,
    eventTotal: eventPagination?.total ?? moduleContentProps.events.length,
    memoryTopicTotal: memoryTopicsCount,
    agentTotal: agentsCount,
    healthTotal: healthCount,
  };

  return (
    <>
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
            <Metric label="任务总数" value={metrics.total} icon="metrics" color="blue" trend={getTrendDirection(trends.total)} trendValue={trends.total !== 0 ? `${trends.total > 0 ? '+' : ''}${trends.total}` : undefined} />
            <Metric label="进行中" value={metrics.inProgress} icon="in-progress" color="violet" trend={getTrendDirection(trends.inProgress)} trendValue={trends.inProgress !== 0 ? `${trends.inProgress > 0 ? '+' : ''}${trends.inProgress}` : undefined} />
            <Metric label="阻塞" value={metrics.blocked} icon="blocked" color={metrics.blocked > 0 ? 'rose' : 'emerald'} trend={getTrendDirection(trends.blocked)} trendValue={trends.blocked !== 0 ? `${trends.blocked > 0 ? '+' : ''}${trends.blocked}` : undefined} />
            <Metric label="待决策" value={metrics.pending} icon="pending" color={metrics.pending > 0 ? 'amber' : 'slate'} trend={getTrendDirection(trends.pending)} trendValue={trends.pending !== 0 ? `${trends.pending > 0 ? '+' : ''}${trends.pending}` : undefined} />
          </>
        )}
      </MetricGroup>

      {!loading && filteredAlerts.length > 0 && (
        <div className="mb-6">
          <AlertCard alerts={filteredAlerts} compact={true} onDismiss={onDismissAlert} />
        </div>
      )}

      {!loading && (
        <div className="mb-8">
          <DecisionCenter decisions={decisions} summary={decisionSummary} loading={false} onRefresh={onRefreshDecisions} onResolve={onResolveDecision} />
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {loading ? (
          DASHBOARD_MODULES.map((module) => <SkeletonCard key={module.key} lines={4} />)
        ) : (
          DASHBOARD_MODULES.map((module) => (
            module.key === 'health' ? (
              <ModuleContent key={module.key} moduleKey={module.key} isSingleModule={false} {...moduleContentProps} />
            ) : (
              <Card key={module.key} hover padding="none" className="self-start overflow-hidden">
                <div className="p-6">
                  <CardHeader
                    icon={module.icon}
                    iconColor={module.color}
                    title={module.name}
                    subtitle={getModuleSubtitle(module.key, counts, {
                      tasks: moduleContentProps.tasks,
                      pipelines: moduleContentProps.pipelines,
                      events: moduleContentProps.events,
                      memoryTopics: moduleContentProps.memoryTopics,
                      agents: moduleContentProps.agents,
                    })}
                  />
                  <div className="border-t border-[var(--border-light)] dark:border-[var(--border-medium)] pt-4">
                    <ModuleContent moduleKey={module.key} isSingleModule={false} {...moduleContentProps} />
                  </div>
                </div>
              </Card>
            )
          ))
        )}
      </div>
    </>
  );
}
