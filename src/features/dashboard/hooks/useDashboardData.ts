'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { aggregateAlerts, type Alert } from '@/components';
import { getMonthRange } from '@/lib/calendar-utils';
import { validateData } from '@/lib/data-validation';
import { groupTasksByStatus } from '@/lib/data-utils';
import { KANBAN_COLUMNS, type Agent, type Decision, type DecisionSummary, type Event, type Health, type MemoryTopic, type PaginationInfo, type Pipeline, type Task } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const AUTO_REFRESH_INTERVAL = 60_000;
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

  const dataSource = 'Supabase';
  const autoRefreshEnabled = true;
  const taskSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.agents) {
        setAgents(data.agents);
      }
    } catch (fetchError) {
      console.error('Failed to fetch agents:', fetchError);
    }
  }, []);

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
        fetch('/api/agents'),
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

      if (agentsData.agents) {
        setAgents(agentsData.agents);
      }

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
  }, []);

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
    const supabaseClient = supabase;
    if (!supabaseClient) return;

    const channel = supabaseClient
      .channel('agents-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
        void fetchAgents();
      })
      .subscribe();

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
