'use client';

import { useMemo, useState } from 'react';
import { ClickableItem, EmptyState, StatusBadge, type DetailData } from '@/components';
import { agentToDetail } from '@/lib/data-utils';
import { type Agent } from '@/lib/types';
import { buildTeamInsights, type EvidenceSourceType, type FreshnessLevel, type TeamAgentInsight, type TeamSignal } from '@/features/dashboard/lib/team-insights';
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

function isOnline(state: string | null | undefined) {
  return state === 'online' || state === 'active' || state === 'running' || state === 'working';
}

function isIdle(state: string | null | undefined) {
  return state === 'idle';
}

function isOffline(state: string | null | undefined) {
  return state === 'offline' || !state;
}

function getPresenceLabel(state: string | null | undefined, presence?: string | null) {
  if (presence === 'offline' || isOffline(state)) return '离线';
  if (isIdle(state)) return '空闲';
  if (isOnline(state)) return '在线';
  return '未知';
}

function getPresenceTone(state: string | null | undefined, presence?: string | null) {
  if (presence === 'offline' || isOffline(state)) return 'bg-slate-500/12 text-slate-600 dark:text-slate-300';
  if (isIdle(state)) return 'bg-amber-500/12 text-amber-700 dark:text-amber-300';
  if (isOnline(state)) return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
  return 'bg-slate-500/12 text-slate-600 dark:text-slate-300';
}

function getFreshnessTone(level: FreshnessLevel) {
  if (level === 'fresh') return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
  if (level === 'recent') return 'bg-blue-500/12 text-blue-700 dark:text-blue-300';
  if (level === 'stale') return 'bg-rose-500/12 text-rose-700 dark:text-rose-300';
  return 'bg-slate-500/12 text-slate-600 dark:text-slate-300';
}

function getSourceTone(source: EvidenceSourceType) {
  switch (source) {
    case 'runtime':
      return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
    case 'file':
      return 'bg-blue-500/12 text-blue-700 dark:text-blue-300';
    case 'config':
      return 'bg-violet-500/12 text-violet-700 dark:text-violet-300';
    case 'db':
      return 'bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300';
    case 'derived':
      return 'bg-amber-500/12 text-amber-700 dark:text-amber-300';
    default:
      return 'bg-slate-500/12 text-slate-600 dark:text-slate-300';
  }
}

function getHealthTone(score: number) {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-300';
  if (score >= 70) return 'text-blue-600 dark:text-blue-300';
  if (score >= 55) return 'text-amber-600 dark:text-amber-300';
  return 'text-rose-600 dark:text-rose-300';
}

function enhanceAgentDetail(insight: TeamAgentInsight) {
  const base = agentToDetail(insight.agent);
  const protocolSummary = insight.protocolChecks
    .map((check) => `${check.present ? '✅' : '⚠️'} ${check.label} · ${check.sourceRef}${check.note ? ` · ${check.note}` : ''}`)
    .join('\n');
  const signalSummary = insight.signals.length > 0
    ? insight.signals.map((signal) => `- [${signal.severity}] ${signal.title}：${signal.description}`).join('\n')
    : '暂无显著异常';
  const recommendationSummary = insight.recommendations.length > 0
    ? insight.recommendations.map((item) => `- ${item}`).join('\n')
    : '暂无明确建议';

  return {
    ...base,
    owner: insight.roleLabel,
    description: `${insight.summary}\n\n${signalSummary}`,
    notes: `Protocol Coverage\n${protocolSummary}\n\nRecommendations\n${recommendationSummary}`,
    extra: {
      ...base.extra,
      channel: insight.channelLabel,
      model: insight.modelLabel,
      freshness: insight.freshnessLabel,
      health: insight.health,
      evidence: {
        status: insight.statusEvidence,
        activity: insight.activityEvidence,
        model: insight.modelEvidence,
      },
      signals: insight.signals,
      recommendations: insight.recommendations,
      capabilities: insight.capabilityTags,
    },
  };
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

function AgentItem({ insight, onClick }: { insight: TeamAgentInsight; onClick: () => void }) {
  const online = isOnline(insight.agent.state);
  const idle = isIdle(insight.agent.state);
  const offline = isOffline(insight.agent.state) || insight.agent.presence === 'offline';

  return (
    <ClickableItem onClick={onClick} className="-mx-2 rounded-xl px-2 group">
      <div className="mb-3 rounded-2xl border border-[var(--border-light)] bg-[var(--surface-primary)]/70 p-4 transition-all duration-200 last:mb-0 hover:border-[var(--primary)]/40 hover:bg-[var(--surface-secondary)] hover:shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <div
              className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2"
              style={{ borderColor: online ? '#4ade80' : offline ? '#6b7280' : '#f59e0b' }}
            >
              <img src={getAvatarUrl(insight.agent.agent_key)} alt={insight.agent.display_name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{insight.agent.display_name}</span>
                <span className="inline-flex items-center rounded-full border border-[var(--border-light)] bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                  {insight.agent.agent_key}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getPresenceTone(insight.agent.state, insight.agent.presence)}`}>
                  {getPresenceLabel(insight.agent.state, insight.agent.presence)}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getFreshnessTone(insight.freshnessLevel)}`}>
                  {insight.freshnessLabel}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>{insight.roleLabel}</span>
                <span>·</span>
                <span>{insight.channelLabel}</span>
                <span>·</span>
                <span>{insight.modelLabel}</span>
              </div>

              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{insight.summary}</p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className={`text-2xl font-semibold ${getHealthTone(insight.health.total)}`}>{insight.health.total}</div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Health</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${getSourceTone(insight.statusEvidence.sourceType)}`}>
            状态源：{insight.statusEvidence.sourceType}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${getSourceTone(insight.modelEvidence.sourceType)}`}>
            模型源：{insight.modelEvidence.sourceType}
          </span>
          {insight.capabilityTags.map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full border border-[var(--border-light)] bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Protocol</div>
            <div className={`mt-1 text-sm font-semibold ${getHealthTone(insight.health.protocol)}`}>{insight.health.protocol}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Runtime</div>
            <div className={`mt-1 text-sm font-semibold ${getHealthTone(insight.health.runtime)}`}>{insight.health.runtime}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Warnings</div>
            <div className="mt-1 text-sm font-semibold text-amber-600 dark:text-amber-300">{insight.warningCount}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Blockers</div>
            <div className="mt-1 text-sm font-semibold text-rose-600 dark:text-rose-300">{insight.blockerCount}</div>
          </div>
        </div>
      </div>
    </ClickableItem>
  );
}

function SignalsPanel({ signals }: { signals: TeamSignal[] }) {
  if (signals.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
        <div className="text-sm font-semibold text-[var(--text-primary)]">Signals</div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">当前没有明显异常，团队页数据覆盖处于稳定状态。</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Signals</h3>
          <p className="text-xs text-[var(--text-muted)]">聚焦缺协议文件、数据过期与运行态证据缺口。</p>
        </div>
        <div className="text-xs text-[var(--text-muted)]">{signals.length} 条</div>
      </div>
      <div className="mt-3 space-y-2">
        {signals.slice(0, 8).map((signal) => (
          <div key={signal.id} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[var(--text-primary)]">{signal.title}</div>
              <StatusBadge status={signal.severity} size="sm" />
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-secondary)]">{signal.agentKey} · {signal.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamOverview({ agents, openDetail, showScene = true }: TeamOverviewProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'signals'>('roster');
  const [forceAllOnlinePreview, setForceAllOnlinePreview] = useState(true);
  const { insights, summary, signals } = useMemo(() => buildTeamInsights(agents), [agents]);
  const sortedInsights = useMemo(
    () => [...insights].sort((left, right) => {
      // 在线优先，然后空闲，最后离线
      const getPriority = (agent: typeof left.agent) => {
        if (isOnline(agent.state) && agent.presence !== 'offline') return 2;
        if (isIdle(agent.state)) return 1;
        return 0;
      };
      return right.health.total - left.health.total || getPriority(right.agent) - getPriority(left.agent);
    }),
    [insights]
  );

  if (agents.length === 0) {
    return <EmptyState moduleType="agents" icon="empty-team" title="暂无智能体" description="还没有注册的智能体" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <SummaryCard label="在线" value={String(summary.onlineCount)} description="当前可立即调度的 agent" valueClassName="text-emerald-700 dark:text-emerald-300" />
        <SummaryCard label="24h 活跃" value={String(summary.active24hCount)} description="最近 24 小时内有运行态证据" valueClassName="text-blue-700 dark:text-blue-300" />
        <SummaryCard label="健康" value={String(summary.healthyCount)} description="Health ≥ 75 且无 blocker" valueClassName="text-emerald-700 dark:text-emerald-300" />
        <SummaryCard label="异常关注" value={String(summary.attentionCount)} description="存在 warning / blocker 或评分偏低" valueClassName="text-amber-700 dark:text-amber-300" />
        <SummaryCard label="协议缺口" value={String(summary.missingProtocolCount)} description="缺少核心文件或角色映射" valueClassName="text-rose-700 dark:text-rose-300" />
        <SummaryCard label="数据过期" value={String(summary.staleCount)} description="状态来源未知或超过 24h 未刷新" valueClassName="text-rose-700 dark:text-rose-300" />
      </div>

      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">团队概览</h3>
            <p className="text-xs text-[var(--text-muted)]">证据驱动的 roster：显示来源、freshness、协议覆盖和健康拆解。</p>
          </div>
          <div className="inline-flex rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-1">
            <button
              onClick={() => setActiveTab('roster')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === 'roster' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
            >
              Roster
            </button>
            <button
              onClick={() => setActiveTab('signals')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === 'signals' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
            >
              Signals
            </button>
          </div>
        </div>

        {activeTab === 'roster' ? (
          <div className="mt-4">
            {sortedInsights.map((insight) => (
              <AgentItem key={insight.agent.id} insight={insight} onClick={() => openDetail(enhanceAgentDetail(insight))} />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <SignalsPanel signals={signals} />
            <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">团队建议</h3>
              <div className="mt-3 space-y-2 text-xs text-[var(--text-secondary)]">
                <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">1. 给 agent 建立更明确的角色/模型映射，减少 derived 数据的占比。</div>
                <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">2. 补齐运行态心跳和最近任务证据，让 freshness 更可信。</div>
                <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">3. 后续可增加 Hierarchy 视图，对比 declared 与 observed collaboration。</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showScene && activeTab === 'roster' && (
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">空间视图</h3>
              <p className="text-xs text-[var(--text-muted)]">作为辅助浏览层，点击仍会进入 evidence-first 的详情。</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={forceAllOnlinePreview}
                  onChange={(event) => setForceAllOnlinePreview(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-light)]"
                />
                全员在线预览
              </label>
              <div className="text-xs text-[var(--text-muted)]">拖动旋转 · 滚轮缩放</div>
            </div>
          </div>
          <OfficeScene agents={sortedInsights.map((item) => item.agent)} forceAllOnline={forceAllOnlinePreview} onAgentClick={(agent) => {
            const insight = sortedInsights.find((item) => item.agent.id === agent.id);
            openDetail(insight ? enhanceAgentDetail(insight) : agentToDetail(agent));
          }} />
        </div>
      )}
    </div>
  );
}

export default TeamOverview;
