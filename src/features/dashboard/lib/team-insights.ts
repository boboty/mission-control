import type { Agent } from '@/lib/types';

export type EvidenceSourceType = 'config' | 'file' | 'runtime' | 'db' | 'derived' | 'unknown';
export type FreshnessLevel = 'fresh' | 'recent' | 'stale' | 'unknown';
export type SignalSeverity = 'error' | 'warning' | 'info';

export interface FieldEvidence {
  label: string;
  value?: string | number | null;
  sourceType: EvidenceSourceType;
  sourceRef: string;
  freshness: FreshnessLevel;
  updatedAt?: string | null;
  confidence: number;
}

export interface ProtocolCheck {
  key: string;
  label: string;
  present: boolean;
  sourceRef: string;
  sourceType: EvidenceSourceType;
  updatedAt?: string | null;
  weight: number;
  note?: string;
}

export interface TeamSignal {
  id: string;
  severity: SignalSeverity;
  agentKey: string;
  title: string;
  description: string;
}

export interface HealthBreakdown {
  total: number;
  protocol: number;
  runtime: number;
  config: number;
  collaboration: number;
  issues: string[];
}

export interface TeamAgentInsight {
  agent: Agent;
  roleLabel: string;
  channelLabel: string;
  modelLabel: string;
  capabilityTags: string[];
  summary: string;
  freshnessLabel: string;
  freshnessLevel: FreshnessLevel;
  activityEvidence: FieldEvidence;
  statusEvidence: FieldEvidence;
  modelEvidence: FieldEvidence;
  protocolChecks: ProtocolCheck[];
  health: HealthBreakdown;
  blockerCount: number;
  warningCount: number;
  signals: TeamSignal[];
  recommendations: string[];
}

export interface TeamOverviewSummary {
  total: number;
  onlineCount: number;
  active24hCount: number;
  healthyCount: number;
  attentionCount: number;
  missingProtocolCount: number;
  staleCount: number;
  blockerCount: number;
  warningCount: number;
}

function hoursSince(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY;
  return (Date.now() - time) / (1000 * 60 * 60);
}

export function getFreshnessLevel(value?: string | null): FreshnessLevel {
  const hours = hoursSince(value);
  if (!Number.isFinite(hours)) return 'unknown';
  if (hours <= 1) return 'fresh';
  if (hours <= 24) return 'recent';
  return 'stale';
}

export function getFreshnessLabel(value?: string | null) {
  const hours = hoursSince(value);
  if (!Number.isFinite(hours)) return '未知';
  if (hours < 1) return '1 小时内';
  if (hours < 24) return `${Math.floor(hours)} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function isOnline(state?: string | null) {
  return state === 'online' || state === 'active' || state === 'running' || state === 'working';
}

function inferRole(agent: Agent) {
  const key = agent.agent_key.toLowerCase();
  const name = agent.display_name || agent.agent_key;
  if (key.includes('feishu')) return '办公助理';
  if (key.includes('code')) return '编码代理';
  if (key.includes('main')) return '主助理';
  if (name.includes('燕')) return '办公助理';
  if (name.includes('考德')) return '编码代理';
  return '通用代理';
}

function inferChannel(agent: Agent) {
  const key = agent.agent_key.toLowerCase();
  if (key.includes('feishu')) return 'Feishu';
  if (key.includes('main')) return 'Telegram';
  return 'OpenClaw';
}

function inferModel(agent: Agent) {
  const key = agent.agent_key.toLowerCase();
  if (key.includes('code')) return 'GPT-5.4';
  if (key.includes('feishu')) return 'Qwen';
  if (key.includes('main')) return 'Qwen';
  return '未声明';
}

function inferCapabilities(agent: Agent) {
  const key = agent.agent_key.toLowerCase();
  const caps = new Set<string>();
  if (key.includes('code')) {
    caps.add('coding');
    caps.add('review');
  }
  if (key.includes('feishu')) {
    caps.add('docs');
    caps.add('workflow');
  }
  if (key.includes('main')) {
    caps.add('orchestration');
    caps.add('memory');
  }
  if (caps.size === 0) caps.add('general');
  return [...caps];
}

function buildProtocolChecks(agent: Agent): ProtocolCheck[] {
  const key = agent.agent_key.toLowerCase();
  const isMain = key.includes('main');
  const isFeishu = key.includes('feishu');
  const isCode = key.includes('code');

  return [
    { key: 'agents', label: 'AGENTS', present: true, sourceRef: 'workspace/AGENTS.md', sourceType: 'file', weight: 20 },
    { key: 'user', label: 'USER', present: isMain || isFeishu, sourceRef: 'workspace/USER.md', sourceType: 'file', weight: 15 },
    { key: 'soul', label: 'SOUL', present: isMain || isFeishu, sourceRef: 'workspace/SOUL.md', sourceType: 'file', weight: 15 },
    { key: 'memory', label: 'MEMORY', present: isMain, sourceRef: 'workspace/MEMORY.md', sourceType: 'file', weight: 10, note: isMain ? '主会话长期记忆' : '共享/隔离场景通常不加载' },
    { key: 'heartbeat', label: 'Heartbeat', present: isMain, sourceRef: 'workspace/HEARTBEAT.md', sourceType: 'file', weight: 10 },
    { key: 'runtime', label: 'Runtime Evidence', present: Boolean(agent.last_seen_at), sourceRef: 'public.agents', sourceType: 'runtime', weight: 30 },
    { key: 'model', label: 'Default Model', present: inferModel(agent) !== '未声明', sourceRef: 'derived from agent mapping', sourceType: 'derived', weight: 10 },
    { key: 'role', label: 'Role Mapping', present: isMain || isFeishu || isCode, sourceRef: 'derived from agent mapping', sourceType: 'derived', weight: 10 },
  ];
}

function buildSignals(agent: Agent, protocolChecks: ProtocolCheck[]): TeamSignal[] {
  const signals: TeamSignal[] = [];
  const stale = getFreshnessLevel(agent.last_seen_at) === 'stale';
  const role = inferRole(agent);
  const missingProtocols = protocolChecks.filter((check) => !check.present && check.weight >= 10);

  if (missingProtocols.length > 0) {
    signals.push({
      id: `${agent.agent_key}-missing-protocol`,
      severity: 'warning',
      agentKey: agent.agent_key,
      title: '协议覆盖不完整',
      description: `缺少 ${missingProtocols.map((item) => item.label).join('、')} 等关键信号。`,
    });
  }

  if (stale) {
    signals.push({
      id: `${agent.agent_key}-stale`,
      severity: 'warning',
      agentKey: agent.agent_key,
      title: '运行态数据过期',
      description: '最近活跃时间超过 24 小时，当前状态可能不可靠。',
    });
  }

  if (!agent.description?.trim()) {
    signals.push({
      id: `${agent.agent_key}-desc`,
      severity: 'info',
      agentKey: agent.agent_key,
      title: '角色说明偏少',
      description: `当前仅能推断为“${role}”，建议补充更明确的职责描述。`,
    });
  }

  if (!agent.last_seen_at) {
    signals.push({
      id: `${agent.agent_key}-runtime`,
      severity: 'error',
      agentKey: agent.agent_key,
      title: '缺少运行态证据',
      description: '没有 last_seen_at，无法判断实时状态和新鲜度。',
    });
  }

  return signals;
}

function buildHealth(agent: Agent, protocolChecks: ProtocolCheck[], signals: TeamSignal[]): HealthBreakdown {
  const protocolTotal = protocolChecks.filter((item) => item.sourceType === 'file').reduce((sum, item) => sum + item.weight, 0) || 1;
  const protocolScore = Math.round((protocolChecks.filter((item) => item.sourceType === 'file' && item.present).reduce((sum, item) => sum + item.weight, 0) / protocolTotal) * 100);

  const runtimeScore = !agent.last_seen_at ? 15 : getFreshnessLevel(agent.last_seen_at) === 'fresh' ? 100 : getFreshnessLevel(agent.last_seen_at) === 'recent' ? 75 : 35;
  const configScore = inferModel(agent) !== '未声明' ? 85 : 50;
  const collaborationScore = inferRole(agent) !== '通用代理' ? 85 : 60;
  const total = Math.round(protocolScore * 0.3 + runtimeScore * 0.3 + configScore * 0.2 + collaborationScore * 0.2);

  return {
    total,
    protocol: protocolScore,
    runtime: runtimeScore,
    config: configScore,
    collaboration: collaborationScore,
    issues: signals.filter((signal) => signal.severity !== 'info').map((signal) => signal.title),
  };
}

function buildRecommendations(agent: Agent, signals: TeamSignal[]) {
  const recommendations: string[] = [];
  if (!agent.description?.trim()) recommendations.push('补充 agent 描述，让团队页能展示更可靠的一句话摘要。');
  if (!agent.last_seen_at) recommendations.push('接入运行态上报，提供 last_seen_at / state 等实时证据。');
  if (getFreshnessLevel(agent.last_seen_at) === 'stale') recommendations.push('检查心跳或最近调度链路，避免状态长期过期。');
  if (inferModel(agent) === '未声明') recommendations.push('为该 agent 明确默认模型，减少调度时的隐式推断。');
  if (signals.some((signal) => signal.title.includes('协议覆盖'))) recommendations.push('补齐协议文件或建立更稳定的映射规则。');
  return recommendations.slice(0, 4);
}

export function buildTeamAgentInsight(agent: Agent): TeamAgentInsight {
  const protocolChecks = buildProtocolChecks(agent);
  const signals = buildSignals(agent, protocolChecks);
  const health = buildHealth(agent, protocolChecks, signals);
  const roleLabel = inferRole(agent);
  const channelLabel = inferChannel(agent);
  const modelLabel = inferModel(agent);
  const capabilityTags = inferCapabilities(agent);
  
  // 优先使用 API 返回的 freshness 字段，如果不存在则计算
  const freshnessLevel = agent.freshness_level || getFreshnessLevel(agent.last_seen_at);
  const freshnessLabel = agent.freshness_label || getFreshnessLabel(agent.last_seen_at);
  
  const warningCount = signals.filter((signal) => signal.severity === 'warning').length;
  const blockerCount = signals.filter((signal) => signal.severity === 'error').length;

  // 根据 presence 和 state 生成更准确的摘要
  const presenceStatus = agent.presence === 'offline' ? '离线' 
    : agent.state === 'running' || agent.state === 'working' ? '工作中'
    : agent.state === 'idle' ? '空闲'
    : agent.state === 'online' || agent.state === 'active' ? '在线'
    : '未知';

  return {
    agent,
    roleLabel,
    channelLabel,
    modelLabel,
    capabilityTags,
    summary: `${roleLabel}，${presenceStatus}，${freshnessLabel}，${warningCount + blockerCount > 0 ? `存在 ${warningCount + blockerCount} 项关注点` : '协议与运行信号基本完整'}`,
    freshnessLabel,
    freshnessLevel,
    activityEvidence: {
      label: 'Last Active',
      value: agent.last_seen_at || '未知',
      sourceType: 'runtime',
      sourceRef: 'public.agents.last_seen_at',
      freshness: freshnessLevel,
      updatedAt: agent.last_seen_at,
      confidence: agent.last_seen_at ? 0.92 : 0.25,
    },
    statusEvidence: {
      label: 'Status',
      value: agent.state,
      sourceType: (agent.status_source as EvidenceSourceType | null | undefined) || 'runtime',
      sourceRef: 'public.agents.state',
      freshness: freshnessLevel,
      updatedAt: agent.last_seen_at,
      confidence: agent.last_seen_at ? 0.88 : 0.4,
    },
    modelEvidence: {
      label: 'Default Model',
      value: modelLabel,
      sourceType: modelLabel === '未声明' ? 'derived' : 'config',
      sourceRef: modelLabel === '未声明' ? 'agent mapping fallback' : 'agent mapping',
      freshness: 'recent',
      updatedAt: null,
      confidence: modelLabel === '未声明' ? 0.45 : 0.75,
    },
    protocolChecks,
    health,
    blockerCount,
    warningCount,
    signals,
    recommendations: buildRecommendations(agent, signals),
  };
}

export function buildTeamInsights(agents: Agent[]) {
  const insights = agents.map(buildTeamAgentInsight);
  const summary: TeamOverviewSummary = {
    total: insights.length,
    onlineCount: insights.filter((item) => {
      const online = isOnline(item.agent.state);
      const notOffline = item.agent.presence !== 'offline';
      return online && notOffline;
    }).length,
    active24hCount: insights.filter((item) => getFreshnessLevel(item.agent.last_seen_at) !== 'stale' && getFreshnessLevel(item.agent.last_seen_at) !== 'unknown').length,
    healthyCount: insights.filter((item) => item.health.total >= 75 && item.blockerCount === 0).length,
    attentionCount: insights.filter((item) => item.health.total < 75 || item.warningCount > 0 || item.blockerCount > 0).length,
    missingProtocolCount: insights.filter((item) => item.protocolChecks.some((check) => !check.present && check.sourceType === 'file')).length,
    staleCount: insights.filter((item) => item.freshnessLevel === 'stale' || item.freshnessLevel === 'unknown').length,
    blockerCount: insights.reduce((sum, item) => sum + item.blockerCount, 0),
    warningCount: insights.reduce((sum, item) => sum + item.warningCount, 0),
  };

  const signals = insights.flatMap((item) => item.signals);

  return { insights, summary, signals };
}
