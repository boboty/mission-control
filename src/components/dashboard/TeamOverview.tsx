'use client';

import { useMemo } from 'react';
import { ClickableItem, EmptyState, StatusBadge, type DetailData } from '@/components';
import { agentToDetail, formatDate } from '@/lib/data-utils';
import { type Agent } from '@/lib/types';
import { formatFreshnessLabel, getAgentSummary } from '@/features/dashboard/lib/module-summaries';
import dynamic from 'next/dynamic';

const OfficeScene = dynamic(() => import('./OfficeScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl bg-[var(--surface-secondary)]/30 text-[var(--text-muted)] animate-pulse">
      加载 3D 场景中...
    </div>
  ),
});

interface TeamOverviewProps {
  agents: Agent[];
  openDetail: (data: DetailData) => void;
  showScene?: boolean;
}

function getAvatarUrl(agentKey: string) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(agentKey)}&backgroundColor=1a1a2e`;
}

function isOnline(state: string) {
  return state === 'online' || state === 'active' || state === 'running';
}

function getPresenceLabel(state: string) {
  if (isOnline(state)) return '在线';
  if (state === 'idle') return '空闲';
  return '离线';
}

function getPresenceTone(state: string) {
  if (isOnline(state)) return 'bg-emerald-500/12 text-emerald-700';
  if (state === 'idle') return 'bg-amber-500/12 text-amber-700';
  return 'bg-slate-500/12 text-slate-600';
}

function getGroupLabel(agentKey: string) {
  if (agentKey.includes('content')) return '内容';
  if (agentKey.includes('design')) return '设计';
  return '开发';
}

function getAgentSortScore(agent: Agent) {
  const freshness = agent.last_seen_at ? new Date(agent.last_seen_at).getTime() : 0;
  const statusPriority = isOnline(agent.state) ? 3 : agent.state === 'idle' ? 2 : 1;
  return statusPriority * 10_000_000_000_000 + freshness;
}

function SummaryCard({
  label,
  value,
  description,
  valueClassName = 'text-[var(--text-primary)]',
}: {
  label: string;
  value: string;
  description: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${valueClassName}`}>{value}</div>
      <div className="mt-1 text-xs text-[var(--text-muted)]">{description}</div>
    </div>
  );
}

function AgentItem({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const groupLabel = getGroupLabel(agent.agent_key);
  const online = isOnline(agent.state);

  return (
    <ClickableItem onClick={onClick} className="-mx-2 rounded-xl px-2 group">
      <div className="mb-2 flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-[var(--border-light)] bg-[var(--surface-primary)]/70 px-3 py-3 transition-all duration-200 last:mb-0 hover:border-[var(--primary)]/40 hover:bg-[var(--surface-secondary)] hover:shadow-sm touch-target">
        <div className="min-w-0 flex items-center gap-3">
          <div
            className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 sm:h-12 sm:w-12"
            style={{ borderColor: online ? '#4ade80' : '#6b7280' }}
          >
            <img src={getAvatarUrl(agent.agent_key)} alt={agent.display_name} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="block truncate text-sm font-medium text-[var(--text-secondary)]">{agent.display_name}</span>
              <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--border-light)] bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                {groupLabel}
              </span>
              <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getPresenceTone(agent.state)}`}>
                {getPresenceLabel(agent.state)}
              </span>
            </div>
            {agent.description && <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{agent.description}</p>}
            {agent.last_seen_at && (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">最近心跳 {formatDate(agent.last_seen_at)}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 [&_span]:rounded-full [&_span]:shadow-sm [&_span]:ring-1 [&_span]:ring-[var(--border-light)]/70">
          <StatusBadge status={agent.state} size="sm" />
        </div>
      </div>
    </ClickableItem>
  );
}

export function TeamOverview({ agents, openDetail, showScene = true }: TeamOverviewProps) {
  const summary = useMemo(() => getAgentSummary(agents), [agents]);
  const sortedAgents = useMemo(() => [...agents].sort((left, right) => getAgentSortScore(right) - getAgentSortScore(left)), [agents]);

  if (agents.length === 0) {
    return <EmptyState moduleType="agents" icon="empty-team" title="暂无智能体" description="还没有注册的智能体" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="在线" value={String(summary.onlineCount)} description="可立即调度的 agent" valueClassName="text-emerald-700" />
        <SummaryCard label="空闲" value={String(summary.idleCount)} description="已在线但暂未占用" valueClassName="text-amber-700" />
        <SummaryCard label="离线" value={String(summary.offlineCount)} description="需要检查状态上报" valueClassName="text-slate-700" />
        <SummaryCard label="最近心跳" value={formatFreshnessLabel(summary.latestSeenAt)} description="来自最新一次 agent 更新" valueClassName="text-lg text-[var(--text-primary)]" />
      </div>

      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">实时状态</h3>
            <p className="text-xs text-[var(--text-muted)]">按可调度优先级排序，优先展示在线与最近有心跳的成员。</p>
          </div>
          <div className="text-xs text-[var(--text-muted)]">共 {summary.total} 个 agent</div>
        </div>

        <div className="overflow-y-auto -mx-2" style={{ maxHeight: showScene ? 'calc(100vh - 520px)' : 'calc(100vh - 360px)' }}>
          {sortedAgents.map((agent) => (
            <AgentItem key={agent.id} agent={agent} onClick={() => openDetail(agentToDetail(agent))} />
          ))}
        </div>
      </div>

      {showScene && (
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">空间视图</h3>
              <p className="text-xs text-[var(--text-muted)]">辅助观察分布与点击详情，不替代上面的实时状态列表。</p>
            </div>
            <div className="text-xs text-[var(--text-muted)]">拖动旋转 · 滚轮缩放</div>
          </div>
          <OfficeScene agents={sortedAgents} onAgentClick={(agent) => openDetail(agentToDetail(agent))} />
        </div>
      )}
    </div>
  );
}

export default TeamOverview;
