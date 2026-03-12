'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { aggregateAlerts, type Alert } from '@/components';
import { getMonthRange } from '@/lib/calendar-utils';
import { validateData } from '@/lib/data-validation';
import { groupTasksByStatus } from '@/lib/data-utils';
import { KANBAN_COLUMNS, type Agent, type Decision, type DecisionSummary, type Event, type Health, type MemoryTopic, type PaginationInfo, type Pipeline, type Task } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const AUTO_REFRESH_INTERVAL = 60_000;
const AGENT_REFRESH_INTERVAL = 5_000;
const OPERATOR_KEY = 'boss';
const DEFAULT_DECISION_SUMMARY: DecisionSummary = { total: 0, highPriority: 0, overdue: 0, blocked: 0 };
const DEFAULT_METRICS_STATE = {
  metrics: { total: 0, inProgress: 0, blocked: 0, pending: 0 },
  trends: { total: 0, inProgress: 0, blocked: 0, pending: 0 },
};

function getLatestSyncTime(payloads: Array<{ last_sync_at?: string }>) {
  const syncCandidates = payloads
    .map((payload) => payload?.last_sync_at)
    .filter((value): value is string => Boolean(value));

  return syncCandidates.length > 0
    ? syncCandidates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
    : new Date().toISOString();
}

function buildOptimisticOperator(action: '工作' | '喝茶' | '巡视', previous?: Agent): Agent {
  const now = new Date().toISOString();
  const state = action === '工作' ? 'running' : action === '喝茶' ? 'idle' : 'online';

  return {
    id: previous?.id ?? -999,
    agent_key: OPERATOR_KEY,
    display_name: previous?.display_name || '一波',
    description: previous?.description || '操作者，不纳入 agent roster',
    state,
    last_seen_at: now,
    status_source: 'operator_manual',
    current_task: action,
    work_started_at: action === '工作' ? now : previous?.work_started_at || null,
    last_idle_at: action === '喝茶' ? now : previous?.last_idle_at || null,
    presence: 'online',
    work_state: state,
    freshness_level: 'fresh',
    freshness_label: '1 小时内',
  };
}

export function useDashboardData() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [health, setHealth] = useState<Health[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [memoryTopics, setMemoryTopics] = useState<MemoryTopic[]>([]);
  const [decisionSummary, setDecisionSummary] = useState<DecisionSummary>(DEFAULT_DECISION_SUMMARY);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'grouped' | 'kanban'>('kanban');
  const [taskPage, setTaskPage] = useState(1);
  const [taskPagination, setTaskPagination] = useState<PaginationInfo | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [eventPagination, setEventPagination] = useState<PaginationInfo | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [dataValidation, setDataValidation] = useState<Record<string, { valid: boolean; warnings: string[] }>>({});
  const [metricsState, setMetricsState] = useState(DEFAULT_METRICS_STATE);
  const latestAgentRequestId = useRef(0);

  const dataSource = 'Supabase';
  const autoRefreshEnabled = true;
  const taskSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const applyAgentPayload = useCallback((requestId: number, data: any) => {
    if (requestId !== latestAgentRequestId.current) return;

    if (data.agents) {
      setAgents(data.agents);
    }

    const syncTime =
      data?.meta?.data_updated_at ||
      data?.meta?.last_sync_at ||
      data?.data_updated_at ||
      data?.last_sync_at ||
      data?.agents?.[0]?.last_seen_at;

    if (syncTime) {
      setLastUpdated((current) => {
        if (!current) return syncTime;
        return new Date(syncTime).getTime() > new Date(current).getTime() ? syncTime : current;
      });
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    const requestId = ++latestAgentRequestId.current;

    try {
      const res = await fetch('/api/agents', { cache: 'no-store' });
      const data = await res.json();
      applyAgentPayload(requestId, data);
    } catch (fetchError) {
      console.error('Failed to fetch agents:', fetchError);
    }
  }, [applyAgentPayload]);

  const refreshDecisions = useCallback(async () => {
    try {
      const res = await fetch('/api/decisions');
      const data = await res.json();

      if (data.decisions) {
        setDecisions(data.decisions);
      }
      if (data.summary) {
        setDecisionSummary(data.summary);
      }
      if (data.last_sync_at) {
        setLastUpdated((current) => {
          if (!current) return data.last_sync_at;
          return new Date(data.last_sync_at).getTime() > new Date(current).getTime() ? data.last_sync_at : current;
        });
      }
    } catch (fetchError) {
      console.error('Failed to fetch decisions:', fetchError);
    }
  }, []);

  const updateOperatorStatus = useCallback(async (action: '工作' | '喝茶' | '巡视') => {
    const previousOperator = agents.find((agent) => agent.agent_key === OPERATOR_KEY);
    const optimisticOperator = buildOptimisticOperator(action, previousOperator);
    latestAgentRequestId.current += 1;

    setAgents((current) => {
      const next = current.filter((agent) => agent.agent_key !== OPERATOR_KEY);
      return [optimisticOperator, ...next];
    });
    setLastUpdated(optimisticOperator.last_seen_at);

    try {
      const res = await fetch('/api/user/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update operator status');
      }

      void fetchAgents();
    } catch (error) {
      setAgents((current) => {
        const next = current.filter((agent) => agent.agent_key !== OPERATOR_KEY);
        return previousOperator ? [previousOperator, ...next] : next;
      });
      alert(error instanceof Error ? error.message : '更新操作者状态失败');
      throw error;
    }
  }, [agents, fetchAgents]);

  const fetchTasks = useCallback(async (page = 1) => {
    setTaskLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        sortBy: 'default',
      });

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();

      if (data.tasks) {
        setTasks(data.tasks);
        setTaskPagination(data.pagination);
        setTaskPage(page);
        const validation = validateData('tasks', data.tasks);
        setDataValidation((prev) => ({ ...prev, tasks: { valid: validation.valid, warnings: validation.warnings } }));
      }
    } catch (fetchError) {
      console.error('Failed to fetch tasks:', fetchError);
    } finally {
      setTaskLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async (page = 1) => {
    setEventLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '500',
        view: 'all',
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        ...getMonthRange(new Date()),
      });

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();

      if (data.events) {
        setEvents(data.events);
        setEventPagination(data.pagination);
      }
    } catch (fetchError) {
      console.error('Failed to fetch events:', fetchError);
    } finally {
      setEventLoading(false);
    }
  }, []);

  const refreshAllData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsRefreshing(true);
    }

    const agentRequestId = ++latestAgentRequestId.current;

    try {
      const eventsInitParams = new URLSearchParams({
        page: '1',
        pageSize: '500',
        view: 'all',
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        ...getMonthRange(new Date()),
      });

      const [tasksRes, pipelinesRes, eventsRes, agentsRes, memoryTopicsRes, healthRes, metricsRes, decisionsRes] = await Promise.all([
        fetch('/api/tasks?page=1&pageSize=20'),
        fetch('/api/pipelines'),
        fetch(`/api/events?${eventsInitParams.toString()}`),
        fetch('/api/agents', { cache: 'no-store' }),
        fetch('/api/memory-topics'),
        fetch('/api/health'),
        fetch('/api/metrics'),
        fetch('/api/decisions'),
      ]);

      const [tasksData, pipelinesData, eventsData, agentsData, memoryTopicsData, healthData, metricsData, decisionsData] = await Promise.all([
        tasksRes.json(),
        pipelinesRes.json(),
        eventsRes.json(),
        agentsRes.json(),
        memoryTopicsRes.json(),
        healthRes.json(),
        metricsRes.json(),
        decisionsRes.json(),
      ]);

      if (tasksData.tasks) {
        setTasks(tasksData.tasks);
        setTaskPagination(tasksData.pagination);
        setTaskPage(tasksData.pagination?.page || 1);
        const validation = validateData('tasks', tasksData.tasks);
        setDataValidation((prev) => ({ ...prev, tasks: { valid: validation.valid, warnings: validation.warnings } }));
      }

      if (pipelinesData.pipelines) {
        setPipelines(pipelinesData.pipelines);
      }

      if (eventsData.events) {
        setEvents(eventsData.events);
        setEventPagination(eventsData.pagination);
      }

      applyAgentPayload(agentRequestId, agentsData);

      if (memoryTopicsData?.topics) {
        setMemoryTopics(memoryTopicsData.topics);
      }

      if (healthData.health) {
        setHealth(healthData.health);
        const validation = validateData('health', healthData.health);
        setDataValidation((prev) => ({ ...prev, health: { valid: validation.valid, warnings: validation.warnings } }));
      }

      if (metricsData.metrics) {
        setMetricsState(metricsData);
      }

      if (decisionsData.decisions) {
        setDecisions(decisionsData.decisions);
      }

      if (decisionsData.summary) {
        setDecisionSummary(decisionsData.summary);
      }

      const lastSync = getLatestSyncTime([
        tasksData,
        pipelinesData,
        eventsData,
        agentsData,
        healthData,
        metricsData,
        decisionsData,
      ]);

      setLastUpdated(lastSync);
      setAlerts(aggregateAlerts(healthData.health || [], tasksData.tasks || [], lastSync));
      setError(null);
    } catch (refreshError) {
      console.error('Failed to refresh data:', refreshError);
      setError('数据加载失败，请刷新页面重试');
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [applyAgentPayload]);

  const createEvent = useCallback(async (eventData: { title: string; starts_at: string; ends_at?: string; type?: string }) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (res.ok) {
        alert('日程创建成功！');
        await fetchEvents(1);
      } else {
        const createError = await res.json();
        alert(`创建失败：${createError.error || '未知错误'}`);
      }
    } catch (createError) {
      alert(`创建失败：${createError}`);
    }
  }, [fetchEvents]);

  const resolveDecision = useCallback(async (decision: Decision) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: decision.id, status: 'done', actor: 'user', meta: { reason: 'decision_resolved' } }),
      });

      if (res.ok) {
        await Promise.all([refreshDecisions(), fetchTasks(taskPage)]);
      }
    } catch (resolveError) {
      console.error('Failed to resolve decision:', resolveError);
    }
  }, [fetchTasks, refreshDecisions, taskPage]);

  const handleTaskPageChange = useCallback((page: number) => {
    void fetchTasks(page);
  }, [fetchTasks]);

  const handleEventPageChange = useCallback((page: number) => {
    void fetchEvents(page);
  }, [fetchEvents]);

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveId(Number(event.active.id));
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = Number(active.id);
    let newStatus = '';

    for (const column of KANBAN_COLUMNS) {
      const columnTasks = groupTasksByStatus(tasks)[column.id] || [];
      if (columnTasks.some((task) => task.id === Number(over.id))) {
        newStatus = column.id;
        break;
      }
    }

    if (!newStatus && KANBAN_COLUMNS.some((column) => column.id === String(over.id))) {
      newStatus = String(over.id);
    }

    if (!newStatus) return;

    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;

    const oldStatus = currentTask.status;
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)));

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus, actor: 'user', meta: { reason: 'drag' } }),
      });

      if (!res.ok) {
        setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: oldStatus } : task)));
        alert('移动任务失败');
      }
    } catch (dragError) {
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: oldStatus } : task)));
      alert('移动任务失败');
      console.error('Failed to move task:', dragError);
    }
  }, [tasks]);

  useEffect(() => {
    void refreshAllData(true);
  }, [refreshAllData]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshAllData(false);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refreshAllData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchAgents();
      }
    }, AGENT_REFRESH_INTERVAL);

    const refreshVisibleAgents = () => {
      if (document.visibilityState === 'visible') {
        void fetchAgents();
      }
    };

    window.addEventListener('focus', refreshVisibleAgents);
    document.addEventListener('visibilitychange', refreshVisibleAgents);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshVisibleAgents);
      document.removeEventListener('visibilitychange', refreshVisibleAgents);
    };
  }, [fetchAgents]);

  useEffect(() => {
    const supabaseClient = supabase;
    if (!supabaseClient) return;

    const channel = supabaseClient
      .channel('agents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
        void fetchAgents();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void fetchAgents();
        }
      });

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [fetchAgents]);

  const filteredAlerts = useMemo(
    () => alerts.filter((alert) => !dismissedAlerts.includes(alert.id)),
    [alerts, dismissedAlerts]
  );

  return {
    tasks,
    setTasks,
    pipelines,
    setPipelines,
    events,
    agents,
    health,
    decisions,
    memoryTopics,
    decisionSummary,
    alerts,
    filteredAlerts,
    loading,
    error,
    lastUpdated,
    dataSource,
    isRefreshing,
    autoRefreshEnabled,
    dataValidation,
    taskViewMode,
    setTaskViewMode,
    taskPage,
    taskPagination,
    taskLoading,
    eventPagination,
    eventLoading,
    metrics: metricsState.metrics,
    trends: metricsState.trends,
    refreshAllData,
    refreshDecisions,
    resolveDecision,
    createEvent,
    updateOperatorStatus,
    fetchTasks,
    handleTaskPageChange,
    handleEventPageChange,
    dismissAlert: (id: string) => setDismissedAlerts((prev) => [...prev, id]),
    taskDrag: {
      activeId,
      sensors: taskSensors,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
  };
}
