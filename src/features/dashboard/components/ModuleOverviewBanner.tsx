'use client';

import { Card, Icon } from '@/components';
import type { Agent, Event, Health, MemoryTopic, Pipeline, Task } from '@/lib/types';
import {
  formatFreshnessLabel,
  getAgentSummary,
  getEventSummary,
  getHealthSummary,
  getMemoryTopicSummary,
  getPipelineSummary,
  getTaskSummary,
} from '@/features/dashboard/lib/module-summaries';

type HighlightTone = 'neutral' | 'success' | 'warning' | 'danger';

interface Highlight {
  label: string;
  value: string;
  tone?: HighlightTone;
}

interface ModuleOverviewBannerProps {
  moduleKey: string;
  tasks: Task[];
  pipelines: Pipeline[];
  events: Event[];
  agents: Agent[];
  health: Health[];
  memoryTopics: MemoryTopic[];
  alertsCount: number;
  lastUpdated: string | null;
}

function getToneClasses(tone: HighlightTone = 'neutral') {
  switch (tone) {
    case 'success':
      return 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700';
    case 'warning':
      return 'border-amber-200/80 bg-amber-500/10 text-amber-700';
    case 'danger':
      return 'border-rose-200/80 bg-rose-500/10 text-rose-700';
    default:
      return 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)]';
  }
}

function formatEventLabel(value: Event | null) {
  if (!value) return '暂无';
  const startsAt = new Date(value.starts_at);
  return `${value.title} · ${startsAt.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}`;
}

function buildBannerContent({
  moduleKey,
  tasks,
  pipelines,
  events,
  agents,
  health,
  memoryTopics,
  alertsCount,
  lastUpdated,
}: ModuleOverviewBannerProps) {
  switch (moduleKey) {
    case 'tasks': {
      const summary = getTaskSummary(tasks);
      return {
        title: '先处理阻塞和临期任务，再推进进行中项。',
        description: '这页适合做任务清点和队列排序，优先让团队知道什么必须马上动。',
        highlights: [
          { label: '阻塞', value: String(summary.blockedCount), tone: summary.blockedCount > 0 ? 'danger' : 'success' },
          { label: '进行中', value: String(summary.inProgressCount), tone: summary.inProgressCount > 0 ? 'warning' : 'neutral' },
          { label: '高优', value: String(summary.highPriorityCount), tone: summary.highPriorityCount > 0 ? 'warning' : 'neutral' },
          { label: '逾期', value: String(summary.overdueCount), tone: summary.overdueCount > 0 ? 'danger' : 'success' },
        ] as Highlight[],
      };
    }
    case 'pipelines': {
      const summary = getPipelineSummary(pipelines);
      return {
        title: '用阶段分布和截止日期看推进节奏。',
        description: '流程页不只是列表，应该能让你一眼判断哪个阶段堆积、哪些流程快超期。',
        highlights: [
          { label: '总流程', value: String(summary.total) },
          { label: '临期', value: String(summary.dueSoonCount), tone: summary.dueSoonCount > 0 ? 'warning' : 'success' },
          { label: '逾期', value: String(summary.overdueCount), tone: summary.overdueCount > 0 ? 'danger' : 'success' },
          { label: '最拥挤阶段', value: summary.topStage ? `${summary.topStage[0]} · ${summary.topStage[1]}` : '暂无' },
        ] as Highlight[],
      };
    }
    case 'events': {
      const summary = getEventSummary(events);
      return {
        title: '月历是主视图，先看今天和未来 7 天。',
        description: '这页要承担排期用途，所以默认给你当天安排、未来一周负荷和下一场关键日程。',
        highlights: [
          { label: '本月', value: String(summary.total) },
          { label: '今天', value: String(summary.todayCount), tone: summary.todayCount > 0 ? 'warning' : 'neutral' },
          { label: '7 天内', value: String(summary.upcomingCount), tone: summary.upcomingCount > 0 ? 'warning' : 'success' },
          { label: '下一项', value: formatEventLabel(summary.nextEvent) },
        ] as Highlight[],
      };
    }
    case 'memory_topics': {
      const summary = getMemoryTopicSummary(memoryTopics);
      return {
        title: '记忆主题应该先服务检索，再服务沉淀。',
        description: '先看主题数量和摘要覆盖率，确保团队能迅速判断该点开哪个知识包。',
        highlights: [
          { label: '主题数', value: String(summary.total) },
          { label: '有摘要', value: String(summary.withSummaryCount), tone: summary.withSummaryCount > 0 ? 'success' : 'neutral' },
          { label: '待补摘要', value: String(summary.withoutSummaryCount), tone: summary.withoutSummaryCount > 0 ? 'warning' : 'success' },
          { label: '来源', value: '本地记忆文件' },
        ] as Highlight[],
      };
    }
    case 'agents': {
      const summary = getAgentSummary(agents);
      return {
        title: '先确认谁在线，再看最近一次心跳和状态分布。',
        description: '团队页的首要任务是判断可调度性，不是炫展示意图，所以把实时状态放到最前面。',
        highlights: [
          { label: '在线', value: String(summary.onlineCount), tone: summary.onlineCount > 0 ? 'success' : 'warning' },
          { label: '空闲', value: String(summary.idleCount), tone: summary.idleCount > 0 ? 'neutral' : 'warning' },
          { label: '离线', value: String(summary.offlineCount), tone: summary.offlineCount > 0 ? 'danger' : 'success' },
          { label: '最近心跳', value: formatFreshnessLabel(summary.latestSeenAt) },
        ] as Highlight[],
      };
    }
    case 'health': {
      const summary = getHealthSummary(health, alertsCount, lastUpdated);
      return {
        title: summary.status === 'healthy' ? '系统当前稳定，重点看数据新鲜度。' : '先处理健康告警，再看各模块明细。',
        description: '健康页不只看一堆数字，更重要的是快速判断是否影响今天的运营动作。',
        highlights: [
          { label: '告警', value: String(summary.alertsCount), tone: summary.alertsCount > 0 ? 'danger' : 'success' },
          { label: '阻塞任务', value: String(summary.blockedCount), tone: summary.blockedCount > 0 ? 'danger' : 'success' },
          { label: '待决策', value: String(summary.pendingCount), tone: summary.pendingCount > 0 ? 'warning' : 'success' },
          { label: '数据新鲜度', value: summary.freshnessLabel, tone: summary.freshnessLevel === 'error' ? 'danger' : summary.freshnessLevel === 'warning' ? 'warning' : 'success' },
        ] as Highlight[],
      };
    }
    default:
      return {
        title: '当前模块摘要',
        description: '这里会展示最值得先看的上下文。',
        highlights: [] as Highlight[],
      };
  }
}

export function ModuleOverviewBanner(props: ModuleOverviewBannerProps) {
  const content = buildBannerContent(props);

  return (
    <Card hover={false} className="overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-[var(--bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            <Icon name="metrics" size={14} />
            当前模块重点
          </div>
          <h2 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{content.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{content.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
          {content.highlights.map((highlight) => (
            <div
              key={highlight.label}
              className={`rounded-xl border px-3 py-3 ${getToneClasses(highlight.tone)}`}
            >
              <div className="text-[11px] font-medium uppercase tracking-wide opacity-80">{highlight.label}</div>
              <div className="mt-1 text-sm font-semibold leading-5">{highlight.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
