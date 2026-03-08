'use client';

import { useEffect, useState } from 'react';
import { EmptyState, Icon, ClickableItem, type DetailData } from '@/components';
import type { Event as EventType, PaginationInfo } from '@/lib/types';
import { eventToDetail, formatDate } from '@/lib/data-utils';

interface CalendarListProps {
  events: EventType[];
  setEvents: React.Dispatch<React.SetStateAction<EventType[]>>;
  loading: boolean;
  openDetail: (data: DetailData) => void;
  onRefresh?: () => void;
}

const EVENT_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'meeting', label: '会议' },
  { value: 'deadline', label: '截止' },
  { value: 'review', label: '评审' },
  { value: 'other', label: '其他' },
];

const EVENT_VIEW_OPTIONS = [
  { value: 'upcoming', label: '近期日程' },
  { value: 'all', label: '全部日程' },
];

export function CalendarListItem({ event, onClick }: { event: EventType; onClick: () => void }) {
  const startDate = new Date(event.starts_at);
  const endDate = event.ends_at ? new Date(event.ends_at) : null;
  
  const timeStr = endDate
    ? `${startDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    : startDate.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const typeColorMap: Record<string, string> = {
    meeting: 'bg-blue-500',
    deadline: 'bg-rose-500',
    review: 'bg-violet-500',
    other: 'bg-slate-500',
  };

  const typeColor = typeColorMap[event.type?.toLowerCase()] || typeColorMap.other;

  return (
    <ClickableItem
      onClick={onClick}
      className="group mb-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/95 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${typeColor}`} />
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{event.title}</p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
            <span className="flex items-center">
              <Icon name="calendar" size={12} className="mr-1" />
              {timeStr}
            </span>
            {event.type && (
              <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[10px] font-medium">
                {event.type}
              </span>
            )}
          </div>
        </div>
      </div>
    </ClickableItem>
  );
}

export function Pagination({ pagination, onPageChange }: { pagination: PaginationInfo; onPageChange: (page: number) => void }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-light)]" role="navigation" aria-label="分页导航">
      <span className="text-xs text-[var(--text-muted)]" aria-live="polite">
        第 {pagination.page} / {pagination.totalPages} 页 · 共 {pagination.total} 项
      </span>
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

export function CalendarList({ events, setEvents, loading, openDetail }: CalendarListProps) {
  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [eventFrom, setEventFrom] = useState('');
  const [eventTo, setEventTo] = useState('');
  const [eventView, setEventView] = useState<'upcoming' | 'all'>('upcoming');
  const [eventPagination, setEventPagination] = useState<PaginationInfo | null>(null);
  const [eventLoading, setEventLoading] = useState(false);

  const fetchEvents = async (page = 1) => {
    setEventLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        view: eventView,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });
      if (eventTypeFilter) params.append('type', eventTypeFilter);
      if (eventSearch) params.append('search', eventSearch);
      if (eventFrom) params.append('from', eventFrom);
      if (eventTo) params.append('to', eventTo);

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
        setEventPagination(data.pagination);
      }
    } finally {
      setEventLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchEvents(1);
  }, [eventView, eventTypeFilter, eventSearch, eventFrom, eventTo]);

  const createEvent = async (eventData: { title: string; starts_at: string; ends_at?: string; type?: string }) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (res.ok) {
        alert('日程创建成功！');
        fetchEvents(1);
      } else {
        const error = await res.json();
        alert(`创建失败：${error.error || '未知错误'}`);
      }
    } catch (err) {
      alert(`创建失败：${err}`);
    }
  };

  const handleResetFilters = () => {
    setEventSearch('');
    setEventTypeFilter('');
    setEventFrom('');
    setEventTo('');
    setEventView('upcoming');
  };

  if (events.length === 0 && !eventLoading && !loading) {
    return (
      <EmptyState 
        moduleType="events" 
        icon="empty-calendar" 
        title="暂无日程" 
        description="近期没有安排的日程"
        action={
          <button 
            onClick={() => {
              const title = prompt('请输入日程标题：');
              if (!title) return;
              const starts_at = prompt('开始时间（格式：2026-03-08T14:00）：');
              if (!starts_at) return;
              createEvent({ title, starts_at });
            }}
            className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
          >
            新建日程
          </button>
        }
      />
    );
  }

  return (
    <div>
      <div className="space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder="搜索日程（标题或 ID）..."
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)]"
            />
          </div>
          <select
            value={eventView}
            onChange={(e) => setEventView(e.target.value as 'upcoming' | 'all')}
            className="sm:w-36 px-3 py-2 text-sm border rounded-lg border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)]"
          >
            {EVENT_VIEW_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="sm:w-36 px-3 py-2 text-sm border rounded-lg border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)]"
          >
            {EVENT_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={eventFrom}
            onChange={(e) => setEventFrom(e.target.value)}
            className="sm:w-44 px-3 py-2 text-sm rounded-lg border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)]"
          />
          <input
            type="date"
            value={eventTo}
            onChange={(e) => setEventTo(e.target.value)}
            className="sm:w-44 px-3 py-2 text-sm rounded-lg border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)]"
          />
          <button
            onClick={handleResetFilters}
            className="sm:w-28 px-3 py-2 text-sm rounded-lg border border-[var(--border-light)] dark:border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            重置筛选
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            {eventPagination ? `共 ${eventPagination.total} 项日程` : ''}
          </span>
        </div>
      </div>

      <div className="overflow-y-auto -mx-2">
        {(eventLoading || loading) ? (
          <div className="py-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>
        ) : (
          <>
            {events.map((event) => (
              <CalendarListItem 
                key={event.id} 
                event={event} 
                onClick={() => openDetail(eventToDetail(event))} 
              />
            ))}
            {eventPagination && <Pagination pagination={eventPagination} onPageChange={fetchEvents} />}
          </>
        )}
      </div>
    </div>
  );
}

export default CalendarList;
