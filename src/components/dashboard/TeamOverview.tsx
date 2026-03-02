'use client';

import { ClickableItem, EmptyState, StatusBadge, type DetailData } from '@/components';
import { type Agent } from '@/lib/types';
import { agentToDetail, formatDate } from '@/lib/data-utils';
import dynamic from 'next/dynamic';

// 动态导入 3D 场景（避免 SSR 问题）
const OfficeScene = dynamic(() => import('./OfficeScene'), { 
  ssr: false,
  loading: () => <div className="h-[300px] bg-[var(--surface-secondary)]/30 rounded-xl animate-pulse flex items-center justify-center text-[var(--text-muted)]">加载 3D 场景中...</div>
});

interface TeamOverviewProps {
  agents: Agent[];
  openDetail: (data: DetailData) => void;
}

// 生成 DiceBear 机器人头像 URL
function getAvatarUrl(agentKey: string): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(agentKey)}&backgroundColor=1a1a2e`;
}

// 判断是否在线（根据 state）
function isOnline(state: string): boolean {
  return state === 'online' || state === 'active' || state === 'running';
}

function AgentItem({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  // 根据 agent_key 推断类型
  const groupLabel = agent.agent_key.includes('content') ? '内容' 
    : agent.agent_key.includes('design') ? '设计' 
    : '开发';
  
  const online = isOnline(agent.state);

  return (
    <ClickableItem onClick={onClick} className="-mx-2 px-2 rounded-xl group">
      <div className="flex items-center justify-between gap-3 py-3 px-3 border border-[var(--border-light)] bg-[var(--surface-primary)]/70 rounded-xl mb-2 last:mb-0 transition-all duration-200 hover:border-[var(--primary)]/40 hover:bg-[var(--surface-secondary)] hover:shadow-sm">
        <div className="min-w-0 flex items-center gap-3">
          {/* DiceBear 虚拟头像 */}
          <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden border-2 transition-colors"
               style={{ borderColor: online ? '#4ade80' : '#6b7280' }}>
            <img 
              src={getAvatarUrl(agent.agent_key)} 
              alt={agent.display_name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-secondary)] truncate block">{agent.display_name}</span>
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-[var(--border-light)] bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                {groupLabel}
              </span>
            </div>
            {agent.description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{agent.description}</p>
            )}
            {agent.last_seen_at && !agent.description && (
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
    <div className="flex flex-col gap-4">
      {/* Agent 列表 */}
      <div className="overflow-y-auto -mx-2" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        {agents.map((agent) => (
          <AgentItem key={agent.id} agent={agent} onClick={() => openDetail(agentToDetail(agent))} />
        ))}
      </div>
      
      {/* 3D 虚拟办公室场景 */}
      <OfficeScene agents={agents} onAgentClick={(agent) => openDetail(agentToDetail(agent))} />
    </div>
  );
}

export default TeamOverview;
