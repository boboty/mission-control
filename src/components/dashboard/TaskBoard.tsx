'use client';

import { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DndContext, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ClickableItem, EmptyState, Icon, StatusBadge, type DetailData } from '@/components';
import { type Task, type PaginationInfo, KANBAN_COLUMNS, STATUS_OPTIONS, STATUS_GROUP_NAMES } from '@/lib/types';
import { groupTasksByStatus, taskToDetail, formatDate } from '@/lib/data-utils';
import { exportTasksToCSV, exportTasksToPDF } from '@/lib/export-utils';

// Virtual scroll threshold
const VIRTUAL_SCROLL_THRESHOLD = 100;
// Estimated row height for virtual scroll (in pixels)
const ROW_HEIGHT = 64;
// Buffer size for virtual scroll (number of items to render beyond visible area)
const VIRTUAL_BUFFER = 5;

interface TaskBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  loading: boolean;
  openDetail: (data: DetailData) => void;
  taskViewMode?: 'list' | 'grouped' | 'kanban';
  setTaskViewMode?: (mode: 'list' | 'grouped' | 'kanban') => void;
}

interface BulkUpdatePayload {
  taskIds: number[];
  status?: string;
  priority?: string;
  owner?: string;
  actor?: string;
  meta?: Record<string, any>;
}

export function SortableTaskItem({ 
  task, 
  onClick,
  selected,
  onToggleSelect
}: { 
  task: Task; 
  onClick: () => void;
  selected?: boolean;
  onToggleSelect?: (taskId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`任务：${task.title}`}
      className={`group mb-2 cursor-grab rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/95 p-3 sm:p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-md active:cursor-grabbing active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset min-h-[48px] touch-target ${isDragging ? 'opacity-60 shadow-lg rotate-2' : ''} ${selected ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/5' : ''}`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected || false}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(task.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 h-4 w-4 sm:h-5 sm:w-5 rounded border-[var(--border-medium)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0 flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm font-medium text-[var(--text-primary)] line-clamp-2">{task.title}</div>
          {task.priority === 'high' && <span className="mt-1.5 inline-block rounded-md bg-[var(--badge-warning-bg)] px-2 py-1 text-[10px] sm:text-xs text-[var(--badge-warning-text)] font-medium animate-pulse-soft">高优</span>}
        </div>
      </div>
    </div>
  );
}

export function TaskItem({ 
  task, 
  onClick,
  selected,
  onToggleSelect
}: { 
  task: Task; 
  onClick: () => void;
  selected?: boolean;
  onToggleSelect?: (taskId: number) => void;
}) {
  const isBlocked = task.blocker || task.status === 'blocked';
  return (
    <ClickableItem onClick={onClick} isBlocked={isBlocked} className="-mx-2 px-2 rounded-lg">
      <div className={`flex items-start justify-between py-3 sm:py-2.5 border-b border-[var(--border-light)] last:border-0 transition-all duration-200 min-h-[48px] touch-target ${isBlocked ? 'bg-[var(--badge-error-bg)]/30 border-l-4 border-l-[var(--color-danger)] pl-2' : ''} ${selected ? 'bg-[var(--color-primary)]/5' : ''}`}>
        <div className="flex-1 min-w-0 flex items-start gap-2 sm:gap-3">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected || false}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(task.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 h-4 w-4 sm:h-5 sm:w-5 rounded border-[var(--border-medium)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className={`text-sm truncate ${isBlocked || task.priority === 'high' ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{task.title}</span>
              {task.blocker && <span className="text-xs bg-[var(--color-danger)] text-white px-2 py-0.5 rounded-full font-medium animate-pulse-soft flex-shrink-0">🚫 阻塞</span>}
              {task.priority === 'high' && !task.blocker && <span className="text-xs bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] px-2 py-0.5 rounded-full font-medium flex-shrink-0">高优</span>}
            </div>
            {task.next_action && <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{task.next_action}</p>}
            {task.due_at && <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center flex-wrap"><span className="mr-1 flex-shrink-0">📅</span> <span className="truncate">截止：{formatDate(task.due_at)}</span></p>}
          </div>
        </div>
        <StatusBadge status={task.status} size="sm" />
      </div>
    </ClickableItem>
  );
}

export function Pagination({ pagination, onPageChange }: { pagination: PaginationInfo; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-light)]" role="navigation" aria-label="分页导航">
      <span className="text-xs text-[var(--text-muted)]" aria-live="polite">第 {pagination.page} / {pagination.totalPages} 页</span>
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => onPageChange(pagination.page - 1)} 
          disabled={pagination.page <= 1} 
          className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
          aria-label="上一页"
        >
          上一页
        </button>
        <button 
          onClick={() => onPageChange(pagination.page + 1)} 
          disabled={!pagination.hasMore} 
          className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
          aria-label="下一页"
        >
          下一页
        </button>
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
  
  // Virtual scroll refs and data preparation
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Prepare data for virtual scroll - flatten grouped data if needed
  const flattenedTasks = taskViewMode === 'grouped' 
    ? Object.entries(groupTasksByStatus(tasks)).flatMap(([status, list]) => 
        [{ type: 'header' as const, status, count: list.length }, ...list.map(t => ({ type: 'task' as const, task: t }))]
      )
    : tasks.map(t => ({ type: 'task' as const, task: t }));
  
  const virtualizer = useVirtualizer({
    count: flattenedTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flattenedTasks[index];
      return item?.type === 'header' ? 32 : ROW_HEIGHT;
    },
    overscan: VIRTUAL_BUFFER,
  });
  
  // Bulk operation state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkOwner, setBulkOwner] = useState('');
  
  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
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
      // Clear bulk selection on refresh
      if (selectedTaskIds.size > 0) {
        setSelectedTaskIds(new Set());
        setBulkMode(false);
      }
    }
  };

  // Bulk selection handlers
  const toggleTaskSelection = (taskId: number) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
    setBulkMode(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
      setBulkMode(false);
    } else {
      const allIds = new Set(tasks.map(t => t.id));
      setSelectedTaskIds(allIds);
      setBulkMode(true);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedTaskIds.size === 0) return;
    
    setBulkLoading(true);
    try {
      const payload: BulkUpdatePayload = {
        taskIds: Array.from(selectedTaskIds),
        actor: 'user',
        meta: { reason: 'bulk_update' },
      };
      
      if (bulkStatus) payload.status = bulkStatus;
      if (bulkPriority) payload.priority = bulkPriority;
      if (bulkOwner) payload.owner = bulkOwner;
      
      // Call bulk update API (or loop through individual updates)
      const res = await fetch('/api/tasks/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        throw new Error('Bulk update failed');
      }
      
      // Refresh tasks after successful update
      await fetchTasks(1);
      
      // Reset bulk state
      setSelectedTaskIds(new Set());
      setBulkMode(false);
      setBulkStatus('');
      setBulkPriority('');
      setBulkOwner('');
    } catch (error) {
      console.error('Bulk update error:', error);
      // Optionally show error toast here
    } finally {
      setBulkLoading(false);
    }
  };

  // Export handlers
  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      // Fetch all tasks with current filters
      const params = new URLSearchParams({ page: '1', pageSize: '1000', sortBy: taskSortBy });
      if (taskStatusFilter) params.append('status', taskStatusFilter);
      if (taskSearch) params.append('search', taskSearch);
      
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      
      if (data.tasks) {
        exportTasksToCSV(data.tasks);
      }
    } catch (error) {
      console.error('Export CSV error:', error);
      alert('导出失败，请重试');
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      // Fetch all tasks with current filters
      const params = new URLSearchParams({ page: '1', pageSize: '1000', sortBy: taskSortBy });
      if (taskStatusFilter) params.append('status', taskStatusFilter);
      if (taskSearch) params.append('search', taskSearch);
      
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      
      if (data.tasks) {
        exportTasksToPDF(data.tasks);
      }
    } catch (error) {
      console.error('Export PDF error:', error);
      alert('导出失败，请重试');
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchTasks(1);
  }, [taskSortBy, taskStatusFilter, taskSearch]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-export-container]')) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportMenu]);

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
      {/* Bulk Action Toolbar */}
      {bulkMode && (
        <div className="mb-4 p-3 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--color-primary)]">
                已选择 {selectedTaskIds.size} 个任务
              </span>
              <button
                onClick={toggleSelectAll}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
              >
                {selectedTaskIds.size === tasks.length ? '取消全选' : '全选'}
              </button>
            </div>
            <button
              onClick={() => {
                setSelectedTaskIds(new Set());
                setBulkMode(false);
              }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              ✕ 关闭
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md bg-[var(--bg-secondary)]"
            >
              <option value="">修改状态...</option>
              {STATUS_OPTIONS.filter(o => o.value).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={bulkPriority}
              onChange={(e) => setBulkPriority(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md bg-[var(--bg-secondary)]"
            >
              <option value="">修改优先级...</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
            <input
              type="text"
              value={bulkOwner}
              onChange={(e) => setBulkOwner(e.target.value)}
              placeholder="负责人..."
              className="px-3 py-1.5 text-sm border rounded-md bg-[var(--bg-secondary)] w-32"
            />
            <button
              onClick={handleBulkUpdate}
              disabled={bulkLoading || (!bulkStatus && !bulkPriority && !bulkOwner)}
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {bulkLoading && <span className="animate-spin">⏳</span>}
              应用
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              value={taskSearch} 
              onChange={(e) => setTaskSearch(e.target.value)} 
              placeholder="搜索任务..." 
              className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg min-h-[44px]"
              aria-label="搜索任务"
            />
          </div>
          <div className="flex gap-3">
            <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)} className="flex-1 px-3 py-2.5 text-sm border rounded-lg min-h-[44px]" aria-label="筛选状态">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={taskSortBy} onChange={(e) => setTaskSortBy(e.target.value as any)} className="flex-1 px-3 py-2.5 text-sm border rounded-lg min-h-[44px]" aria-label="排序方式">
              <option value="default">排序</option>
              <option value="priority">优先级</option>
              <option value="dueDate">截止</option>
              <option value="status">状态</option>
            </select>
            {/* Export button with dropdown */}
            <div className="relative" data-export-container>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExportMenu(!showExportMenu);
                }}
                disabled={exportLoading || tasks.length === 0}
                className="px-3 py-2.5 text-sm border rounded-lg min-h-[44px] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                aria-label="导出任务"
              >
                {exportLoading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Icon name="download" size={16} />
                )}
                <span className="hide-mobile">导出</span>
              </button>
              
              {/* Export dropdown menu */}
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-40 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] shadow-lg z-50 overflow-hidden" data-export-container>
                  <button
                    onClick={handleExportCSV}
                    disabled={exportLoading}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2"
                  >
                    <span className="text-base">📊</span>
                    导出 CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={exportLoading}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 border-t border-[var(--border-light)]"
                  >
                    <span className="text-base">📄</span>
                    导出 PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">{taskPagination ? `共 ${taskPagination.total} 项` : ''}</span>
          <div className="flex items-center space-x-1 rounded-lg p-0.5 border border-[var(--border-light)]">
            {(['list', 'grouped', 'kanban'] as const).map((mode) => (
              <button 
                key={mode} 
                onClick={() => setTaskViewMode(mode)} 
                className={`px-2 sm:px-3 py-1.5 text-xs rounded-md min-h-[36px] min-w-[44px] ${taskViewMode === mode ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
                aria-label={`${mode === 'list' ? '列表' : mode === 'grouped' ? '分组' : '看板'}视图`}
              >
                <span className="hide-mobile">{mode === 'list' ? '列表' : mode === 'grouped' ? '分组' : '看板'}</span>
                <span className="show-mobile">{mode === 'list' ? '📋' : mode === 'grouped' ? '🗂' : '📊'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {taskViewMode === 'kanban' ? (
        <DndContext collisionDetection={closestCenter} onDragStart={(e) => setActiveId(Number(e.active.id))} onDragEnd={handleDragEnd} sensors={sensors}>
          <div className="grid grid-cols-5 gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-2 px-2">
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
                <div key={col.id} className="min-w-[240px] sm:min-w-[260px] rounded-2xl border border-[var(--border-light)]/80 bg-[var(--bg-secondary)]/40 shadow-sm backdrop-blur-sm">
                  <div className={`flex items-center justify-between rounded-t-2xl px-3.5 py-2.5 text-xs font-semibold text-white ${headerClass}`}>
                    <span className="truncate">{col.title}</span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] flex-shrink-0">{colTasks.length}</span>
                  </div>
                  <div className="min-h-[200px] sm:min-h-[220px] rounded-b-2xl bg-[var(--bg-tertiary)]/80 p-2">
                    <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      {colTasks.map((task) => (
                        <SortableTaskItem 
                          key={task.id} 
                          task={task} 
                          onClick={() => openDetail(taskToDetail(task))}
                          selected={selectedTaskIds.has(task.id)}
                          onToggleSelect={toggleTaskSelection}
                        />
                      ))}
                    </SortableContext>
                    {(!colTasks || colTasks.length === 0) && (
                      <div className="text-center text-xs text-[var(--text-muted)] py-8">暂无</div>
                    )}
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
        <>
          {/* Virtual scroll for large lists (>100 tasks) */}
          {tasks.length > VIRTUAL_SCROLL_THRESHOLD ? (
            <div 
              ref={parentRef} 
              className="overflow-y-auto -mx-2" 
              style={{ height: '600px', maxHeight: '70vh' }}
            >
              <div 
                style={{ 
                  height: `${virtualizer.getTotalSize()}px`, 
                  width: '100%', 
                  position: 'relative' 
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const item = flattenedTasks[virtualRow.index];
                  if (!item) return null;
                  
                  if (item.type === 'header') {
                    return (
                      <div
                        key={`header-${item.status}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <h4 className="text-xs font-semibold px-2 py-2 text-[var(--text-muted)]">
                          {(STATUS_GROUP_NAMES as Record<string, string>)[item.status] || item.status} · {item.count}
                        </h4>
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={item.task.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <TaskItem 
                        task={item.task} 
                        onClick={() => openDetail(taskToDetail(item.task))}
                        selected={selectedTaskIds.has(item.task.id)}
                        onToggleSelect={toggleTaskSelection}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Regular rendering for small lists (<=100 tasks) */
            <div className="overflow-y-auto -mx-2">
              {(taskViewMode === 'grouped' ? Object.entries(groupTasksByStatus(tasks)).flatMap(([status, list]) => [<h4 key={status} className="text-xs font-semibold px-2 py-2 text-[var(--text-muted)]">{(STATUS_GROUP_NAMES as Record<string, string>)[status] || status} · {list.length}</h4>, ...list.map((task) => <TaskItem key={task.id} task={task} onClick={() => openDetail(taskToDetail(task))} selected={selectedTaskIds.has(task.id)} onToggleSelect={toggleTaskSelection} />)]) : tasks.map((task) => <TaskItem key={task.id} task={task} onClick={() => openDetail(taskToDetail(task))} selected={selectedTaskIds.has(task.id)} onToggleSelect={toggleTaskSelection} />))}
              {taskPagination && <Pagination pagination={taskPagination} onPageChange={fetchTasks} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TaskBoard;
