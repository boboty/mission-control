'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ClickableItem, EmptyState, Icon, StatusBadge, type DetailData } from '@/components';
import { type Task, type PaginationInfo, KANBAN_COLUMNS, STATUS_OPTIONS, STATUS_GROUP_NAMES } from '@/lib/types';
import { groupTasksByStatus, taskToDetail, formatDate } from '@/lib/data-utils';

interface TaskBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  loading: boolean;
  openDetail: (data: DetailData) => void;
  taskViewMode?: 'list' | 'grouped' | 'kanban';
  setTaskViewMode?: (mode: 'list' | 'grouped' | 'kanban') => void;
}

export function SortableTaskItem({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group mb-2 cursor-grab rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/95 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-md active:cursor-grabbing ${isDragging ? 'opacity-60 shadow-lg' : ''}`}
    >
      <div className="text-xs font-medium text-[var(--text-primary)] line-clamp-2">{task.title}</div>
      {task.priority === 'high' && <span className="mt-1.5 inline-block rounded-md bg-[var(--badge-warning-bg)] px-1.5 py-0.5 text-[10px] text-[var(--badge-warning-text)]">高优</span>}
    </div>
  );
}

export function TaskItem({ task, onClick }: { task: Task; onClick: () => void }) {
  const isBlocked = task.blocker || task.status === 'blocked';
  return (
    <ClickableItem onClick={onClick} isBlocked={isBlocked} className="-mx-2 px-2 rounded-lg">
      <div className={`flex items-start justify-between py-2.5 border-b border-[var(--border-light)] last:border-0 ${isBlocked ? 'bg-[var(--badge-error-bg)]/30 border-l-4 border-l-[var(--color-danger)] pl-1' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className={`text-sm truncate ${isBlocked || task.priority === 'high' ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{task.title}</span>
            {task.blocker && <span className="text-xs bg-[var(--color-danger)] text-white px-2 py-0.5 rounded-full">🚫 阻塞</span>}
          </div>
          {task.next_action && <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{task.next_action}</p>}
          {task.due_at && <p className="text-xs text-[var(--text-muted)] mt-0.5">📅 截止：{formatDate(task.due_at)}</p>}
        </div>
        <StatusBadge status={task.status} size="sm" />
      </div>
    </ClickableItem>
  );
}

export function Pagination({ pagination, onPageChange }: { pagination: PaginationInfo; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-light)]">
      <span className="text-xs text-[var(--text-muted)]">第 {pagination.page} / {pagination.totalPages} 页</span>
      <div className="flex items-center space-x-2">
        <button onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-light)] disabled:opacity-50">上一页</button>
        <button onClick={() => onPageChange(pagination.page + 1)} disabled={!pagination.hasMore} className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-light)] disabled:opacity-50">下一页</button>
      </div>
    </div>
  );
}

export function TaskBoard({ tasks, setTasks, loading, openDetail, taskViewMode: externalViewMode, setTaskViewMode: externalSetViewMode }: TaskBoardProps) {
  const [taskSortBy, setTaskSortBy] = useState<'default' | 'priority' | 'dueDate' | 'status'>('default');
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'grouped' | 'kanban'>('list');
  const taskViewMode = externalViewMode ?? internalViewMode;
  const setTaskViewMode = externalSetViewMode ?? setInternalViewMode;
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');
  const [taskPagination, setTaskPagination] = useState<PaginationInfo | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchTasks = async (page = 1) => {
    setTaskLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20', sortBy: taskSortBy });
      if (taskStatusFilter) params.append('status', taskStatusFilter);
      if (taskSearch) params.append('search', taskSearch);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
        setTaskPagination(data.pagination);
      }
    } finally {
      setTaskLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchTasks(1);
  }, [taskSortBy, taskStatusFilter, taskSearch]);

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const taskId = Number(active.id);
    let newStatus = KANBAN_COLUMNS.find((c) => c.id === String(over.id))?.id || '';
    if (!newStatus) {
      for (const col of KANBAN_COLUMNS) {
        if ((groupTasksByStatus(tasks)[col.id] || []).some((t) => t.id === Number(over.id))) newStatus = col.id;
      }
    }
    const current = tasks.find((t) => t.id === taskId);
    if (!current || !newStatus || current.status === newStatus) return;
    const oldStatus = current.status;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      const res = await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, status: newStatus, actor: 'user', meta: { reason: 'drag' } }) });
      if (!res.ok) setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t)));
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t)));
    }
  };

  if (tasks.length === 0 && !taskLoading) return <EmptyState moduleType="tasks" icon="empty-tasks" title="暂无任务" description="当前没有待办任务，一切正常！" />;

  return (
    <div>
      <div className="space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} placeholder="搜索任务（标题或 ID）..." className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg" />
          </div>
          <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)} className="sm:w-40 px-3 py-2 text-sm border rounded-lg">{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={taskSortBy} onChange={(e) => setTaskSortBy(e.target.value as any)} className="sm:w-36 px-3 py-2 text-sm border rounded-lg"><option value="default">默认排序</option><option value="priority">优先级</option><option value="dueDate">截止日期</option><option value="status">状态</option></select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">{taskPagination ? `共 ${taskPagination.total} 项任务` : ''}</span>
          <div className="flex items-center space-x-1 rounded-lg p-0.5 border border-[var(--border-light)]">
            {(['list', 'grouped', 'kanban'] as const).map((mode) => <button key={mode} onClick={() => setTaskViewMode(mode)} className={`px-3 py-1.5 text-xs rounded-md ${taskViewMode === mode ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{mode === 'list' ? '列表' : mode === 'grouped' ? '分组' : '看板'}</button>)}
          </div>
        </div>
      </div>

      {taskViewMode === 'kanban' ? (
        <DndContext collisionDetection={closestCenter} onDragStart={(e) => setActiveId(Number(e.active.id))} onDragEnd={handleDragEnd} sensors={sensors}>
          <div className="grid grid-cols-5 gap-4 overflow-x-auto pb-1">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = groupTasksByStatus(tasks)[col.id] || [];
              const headerClass =
                col.id === 'todo'
                  ? 'bg-slate-500/90'
                  : col.id === 'in_progress'
                    ? 'bg-blue-500/90'
                    : col.id === 'blocked'
                      ? 'bg-rose-500/90'
                      : col.id === 'done'
                        ? 'bg-emerald-500/90'
                        : 'bg-[var(--color-primary)]/90';
              return (
                <div key={col.id} className="min-w-[220px] rounded-2xl border border-[var(--border-light)]/80 bg-[var(--bg-secondary)]/40 shadow-sm backdrop-blur-sm">
                  <div className={`flex items-center justify-between rounded-t-2xl px-3.5 py-2.5 text-xs font-semibold text-white ${headerClass}`}>
                    <span>{col.title}</span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">{colTasks.length}</span>
                  </div>
                  <div className="min-h-[220px] rounded-b-2xl bg-[var(--bg-tertiary)]/80 p-2.5">
                    <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      {colTasks.map((task) => <SortableTaskItem key={task.id} task={task} onClick={() => openDetail(taskToDetail(task))} />)}
                    </SortableContext>
                  </div>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm font-medium shadow-xl">
                {tasks.find((t) => t.id === activeId)?.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="overflow-y-auto -mx-2">
          {(taskViewMode === 'grouped' ? Object.entries(groupTasksByStatus(tasks)).flatMap(([status, list]) => [<h4 key={status} className="text-xs font-semibold px-2 py-2 text-[var(--text-muted)]">{(STATUS_GROUP_NAMES as Record<string, string>)[status] || status} · {list.length}</h4>, ...list.map((task) => <TaskItem key={task.id} task={task} onClick={() => openDetail(taskToDetail(task))} />)]) : tasks.map((task) => <TaskItem key={task.id} task={task} onClick={() => openDetail(taskToDetail(task))} />))}
          {taskPagination && <Pagination pagination={taskPagination} onPageChange={fetchTasks} />}
        </div>
      )}
    </div>
  );
}

export default TaskBoard;
