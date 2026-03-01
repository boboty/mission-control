'use client';

import { ClickableItem, EmptyState, StatusBadge, type DetailData } from '@/components';
import { type Agent } from '@/lib/types';
import { agentToDetail, formatDate } from '@/lib/data-utils';

interface TeamOverviewProps {
  agents: Agent[];
  openDetail: (data: DetailData) => void;
}

function AgentItem({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const groupLabel =
    agent.type === 'content' ? '内容' : agent.type === 'design' ? '设计' : '开发';

  return (
    <ClickableItem onClick={onClick} className="-mx-2 px-2 rounded-xl group">
      <div className="flex items-center justify-between gap-3 py-3 px-3 border border-[var(--border-light)] bg-[var(--surface-primary)]/70 rounded-xl mb-2 last:mb-0 transition-all duration-200 hover:border-[var(--primary)]/40 hover:bg-[var(--surface-secondary)] hover:shadow-sm">
        <div className="min-w-0 flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-[var(--primary)]/25 to-[var(--accent)]/25 border border-[var(--primary)]/20 flex items-center justify-center text-sm font-semibold text-[var(--text-primary)]">
            {agent.display_name?.slice(0, 1) || 'A'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-secondary)] truncate block">{agent.display_name}</span>
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-[var(--border-light)] bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                {groupLabel}
              </span>
            </div>
            {agent.last_seen_at && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDate(agent.last_seen_at)}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 [&_span]:shadow-sm [&_span]:ring-1 [&_span]:ring-[var(--border-light)]/70 [&_span]:rounded-full">
          <StatusBadge status={agent.state} size="sm" />
        </div>
      </div>
    </ClickableItem>
  );
}

export function TeamOverview({ agents, openDetail }: TeamOverviewProps) {
  if (agents.length === 0) {
    return <EmptyState moduleType="agents" icon="empty-team" title="暂无智能体" description="还没有注册的智能体" />;
  }

  return (
    <div className="overflow-y-auto -mx-2">
      {agents.map((agent) => (
        <AgentItem key={agent.id} agent={agent} onClick={() => openDetail(agentToDetail(agent))} />
      ))}
    </div>
  );
}

export default TeamOverview;
