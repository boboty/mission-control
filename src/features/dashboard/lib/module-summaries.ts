import type { Agent, Event, Health, MemoryTopic, Pipeline, Task } from '@/lib/types';

const ACTIVE_AGENT_STATES = new Set(['online', 'active', 'running']);
const IDLE_AGENT_STATES = new Set(['idle']);

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function getDurationHours(from: Date) {
  return (Date.now() - from.getTime()) / (1000 * 60 * 60);
}

export function formatFreshnessLabel(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return '暂无';

  const hours = getDurationHours(date);
  if (hours < 1) return '1 小时内';
  if (hours < 24) return `${Math.floor(hours)} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;

  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export function getTaskSummary(tasks: Task[]) {
  const now = Date.now();
  const doneStatuses = new Set(['done', 'completed']);

  const blockedCount = tasks.filter((task) => task.blocker || task.status === 'blocked').length;
  const inProgressCount = tasks.filter((task) => task.status === 'in_progress').length;
  const overdueCount = tasks.filter((task) => {
    const due = parseDate(task.due_at);
    return due && due.getTime() < now && !doneStatuses.has(task.status);
  }).length;
  const highPriorityCount = tasks.filter((task) => task.priority?.toLowerCase?.().includes('high')).length;

  return {
    total: tasks.length,
    blockedCount,
    inProgressCount,
    overdueCount,
    highPriorityCount,
  };
}

export function getPipelineSummary(pipelines: Pipeline[]) {
  const now = Date.now();
  const dueSoonThreshold = addDays(new Date(), 7).getTime();
  const stageCounts = pipelines.reduce<Record<string, number>>((result, pipeline) => {
    const stage = pipeline.stage || 'unknown';
    result[stage] = (result[stage] || 0) + 1;
    return result;
  }, {});

  const topStage = Object.entries(stageCounts).sort((left, right) => right[1] - left[1])[0];
  const overdueCount = pipelines.filter((pipeline) => {
    const due = parseDate(pipeline.due_at);
    return due && due.getTime() < now;
  }).length;
  const dueSoonCount = pipelines.filter((pipeline) => {
    const due = parseDate(pipeline.due_at);
    return due && due.getTime() >= now && due.getTime() <= dueSoonThreshold;
  }).length;

  return {
    total: pipelines.length,
    overdueCount,
    dueSoonCount,
    topStage,
  };
}

export function getEventSummary(events: Event[]) {
  const today = startOfToday();
  const nextWeek = addDays(today, 7).getTime();
  const todayKey = today.toDateString();
  const upcoming = events
    .map((event) => ({ event, startsAt: parseDate(event.starts_at) }))
    .filter((item): item is { event: Event; startsAt: Date } => Boolean(item.startsAt))
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  const todayCount = upcoming.filter((item) => item.startsAt.toDateString() === todayKey).length;
  const upcomingCount = upcoming.filter((item) => {
    const time = item.startsAt.getTime();
    return time >= today.getTime() && time < nextWeek;
  }).length;
  const nextEvent = upcoming.find((item) => item.startsAt.getTime() >= today.getTime())?.event || null;

  return {
    total: events.length,
    todayCount,
    upcomingCount,
    nextEvent,
  };
}

export function getAgentSummary(agents: Agent[]) {
  const rosterAgents = agents.filter((agent) => agent.agent_key !== 'boss');
  const onlineCount = rosterAgents.filter((agent) => ACTIVE_AGENT_STATES.has(agent.state)).length;
  const idleCount = rosterAgents.filter((agent) => IDLE_AGENT_STATES.has(agent.state)).length;
  const offlineCount = Math.max(rosterAgents.length - onlineCount - idleCount, 0);
  const latestSeenAt = rosterAgents
    .map((agent) => parseDate(agent.last_seen_at))
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => right.getTime() - left.getTime())[0] || null;

  return {
    total: rosterAgents.length,
    onlineCount,
    idleCount,
    offlineCount,
    latestSeenAt: latestSeenAt?.toISOString() || null,
  };
}

export function getMemoryTopicSummary(memoryTopics: MemoryTopic[]) {
  const withSummaryCount = memoryTopics.filter((topic) => Boolean(topic.summary?.trim())).length;

  return {
    total: memoryTopics.length,
    withSummaryCount,
    withoutSummaryCount: Math.max(memoryTopics.length - withSummaryCount, 0),
  };
}

export function getHealthSummary(health: Health[], alertsCount = 0, lastUpdated?: string | null) {
  const latest = health[0];
  const freshnessBase = latest?.last_sync_at || latest?.data_updated_at || latest?.created_at || lastUpdated || null;
  const freshnessHours = freshnessBase ? getDurationHours(new Date(freshnessBase)) : Number.POSITIVE_INFINITY;
  const freshnessLevel = freshnessHours > 24 ? 'error' : freshnessHours > 2 ? 'warning' : 'success';
  const blockedCount = latest?.blocked_count || 0;
  const pendingCount = latest?.pending_decisions || 0;
  const cronOk = Boolean(latest?.cron_ok);
  const status =
    !cronOk || blockedCount > 0 || pendingCount > 0 || alertsCount > 0 || freshnessLevel !== 'success'
      ? 'attention'
      : 'healthy';

  return {
    blockedCount,
    pendingCount,
    alertsCount,
    cronOk,
    freshnessBase,
    freshnessLabel: formatFreshnessLabel(freshnessBase),
    freshnessLevel,
    status,
  };
}
