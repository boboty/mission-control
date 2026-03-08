'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClickableItem, EmptyState, Icon, type DetailData } from '@/components';
import type { Event as EventType } from '@/lib/types';
import { eventToDetail } from '@/lib/data-utils';
import { formatAgendaDate, formatEventTimeRange, getMonthRange, groupEventsByDate } from '@/lib/calendar-utils';
import { CalendarMonth, getDefaultSelectedDate } from './CalendarMonth';

interface CalendarListProps {
  initialEvents?: EventType[];
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
  { value: 'day', label: '当天安排' },
  { value: 'all', label: '本月全部' },
];

function DayAgendaItem({ event, onClick }: { event: EventType; onClick: () => void }) {
  return (
    <ClickableItem
      onClick={onClick}
      className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-3 hover:border-[var(--color-primary)]/35 hover:shadow-sm"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{event.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1">
            <Icon name="calendar" size={12} />
            {formatEventTimeRange(event)}
          </span>
          {event.type && (
            <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 font-medium">
              {EVENT_TYPE_OPTIONS.find((item) => item.value === event.type)?.label || event.type}
            </span>
          )}
        </div>
      </div>
    </ClickableItem>
  );
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function CalendarList({ initialEvents = [], loading, openDetail }: CalendarListProps) {
  const [events, setEvents] = useState<EventType[]>(initialEvents);
  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [eventView, setEventView] = useState<'day' | 'all'>('day');
  const [viewDate, setViewDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [eventLoading, setEventLoading] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(() => getDefaultSelectedDate(new Date()));

  const fetchEvents = async () => {
    setEventLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '500',
        view: 'all',
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        ...getMonthRange(viewDate),
      });
      if (eventTypeFilter) params.append('type', eventTypeFilter);
      if (eventSearch) params.append('search', eventSearch);

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();

      if (data.events) {
        setEvents(data.events);
      }
    } finally {
      setEventLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      void fetchEvents();
    }
  }, [viewDate, eventTypeFilter, eventSearch, loading]);

  const createEvent = async (eventData: { title: string; starts_at: string; ends_at?: string; type?: string }) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (res.ok) {
        alert('日程创建成功！');
        await fetchEvents();
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
    setEventView('day');
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(getDefaultSelectedDate(today));
  };

  const selectedDayEvents = useMemo(() => groupEventsByDate(events)[selectedDateKey] || [], [events, selectedDateKey]);
  const agendaEvents = eventView === 'all' ? events : selectedDayEvents;

  if (events.length === 0 && !eventLoading && !loading) {
    return (
      <EmptyState
        moduleType="events"
        icon="empty-calendar"
        title="本月暂无日程"
        description="还没有安排任何日程"
        action={
          <button
            onClick={() => {
              const title = prompt('请输入日程标题：');
              if (!title) return;
              const starts_at = prompt('开始时间（格式：2026-03-08T14:00）：');
              if (!starts_at) return;
              void createEvent({ title, starts_at });
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
    <div className="space-y-5">
      <div className="rounded-[28px] border border-[var(--border-light)] bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(14,165,233,0.04))] p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Calendar</div>
            <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              {viewDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              农历、节日和日程都直接落在月历格子里，选中日期即可查看安排。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const previous = addMonths(viewDate, -1);
                setViewDate(previous);
                setSelectedDateKey(getDefaultSelectedDate(previous));
              }}
              className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              上个月
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelectedDateKey(getDefaultSelectedDate(today));
              }}
              className="rounded-xl bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              回到本月
            </button>
            <button
              type="button"
              onClick={() => {
                const next = addMonths(viewDate, 1);
                setViewDate(next);
                setSelectedDateKey(getDefaultSelectedDate(next));
              }}
              className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              下个月
            </button>
            <button
              type="button"
              onClick={() => {
                const title = prompt('请输入日程标题：');
                if (!title) return;
                const starts_at = prompt('开始时间（格式：2026-03-08T14:00）：');
                if (!starts_at) return;
                void createEvent({ title, starts_at });
              }}
              className="rounded-xl bg-[var(--text-primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              新建日程
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_340px] gap-5">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="搜索日程标题或 ID"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)]"
                />
              </div>
              <select
                value={eventView}
                onChange={(e) => setEventView(e.target.value as 'day' | 'all')}
                className="sm:w-36 px-3 py-2.5 text-sm border rounded-xl border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)]"
              >
                {EVENT_VIEW_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="sm:w-36 px-3 py-2.5 text-sm border rounded-xl border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)]"
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={handleResetFilters}
                className="sm:w-28 px-3 py-2.5 text-sm rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                重置
              </button>
            </div>

            {(eventLoading || loading) ? (
              <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-16 text-center text-sm text-[var(--text-muted)]">
                加载日历中...
              </div>
            ) : (
              <CalendarMonth
                viewDate={viewDate}
                events={events}
                selectedDateKey={selectedDateKey}
                onSelectDate={setSelectedDateKey}
                onEventClick={(event) => openDetail(eventToDetail(event))}
              />
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4 xl:sticky xl:top-6 h-fit">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Agenda</div>
                <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {formatAgendaDate(selectedDateKey)}
                </h3>
              </div>
              <div className="rounded-full bg-[var(--bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {agendaEvents.length} 项
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {agendaEvents.length > 0 ? (
                agendaEvents.map((event) => (
                  <DayAgendaItem key={event.id} event={event} onClick={() => openDetail(eventToDetail(event))} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border-light)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                  当天没有日程安排
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[var(--text-primary)]">本月安排总览</div>
          <div className="text-xs text-[var(--text-muted)]">共 {events.length} 项日程</div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-[var(--bg-tertiary)] px-4 py-3">
            <div className="text-[var(--text-muted)]">会议</div>
            <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {events.filter((event) => event.type === 'meeting').length}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-tertiary)] px-4 py-3">
            <div className="text-[var(--text-muted)]">截止</div>
            <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {events.filter((event) => event.type === 'deadline').length}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-tertiary)] px-4 py-3">
            <div className="text-[var(--text-muted)]">评审</div>
            <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {events.filter((event) => event.type === 'review').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarList;
