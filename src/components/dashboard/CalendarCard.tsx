'use client';

import { useMemo, useState } from 'react';
import { ClickableItem, EmptyState, Icon, type DetailData } from '@/components';
import { formatAgendaDate, formatEventTimeRange, groupEventsByDate } from '@/lib/calendar-utils';
import { eventToDetail } from '@/lib/data-utils';
import type { Event as EventType } from '@/lib/types';
import { CalendarMonth, getDefaultSelectedDate } from './CalendarMonth';

interface CalendarCardProps {
  events: EventType[];
  openDetail: (data: DetailData) => void;
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function CalendarCard({ events, openDetail }: CalendarCardProps) {
  const [viewDate, setViewDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(() => getDefaultSelectedDate(new Date()));

  const selectedDayEvents = useMemo(() => groupEventsByDate(events)[selectedDateKey] || [], [events, selectedDateKey]);

  if (events.length === 0) {
    return <EmptyState moduleType="events" icon="empty-calendar" title="本月暂无日程" description="还没有写入日程安排" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setViewDate((current) => addMonths(current, -1))} className="rounded-lg border border-[var(--border-light)] px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <Icon name="chevron-left" size={16} />
        </button>
        <div className="text-sm font-semibold text-[var(--text-primary)]">
          {viewDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
        </div>
        <button type="button" onClick={() => setViewDate((current) => addMonths(current, 1))} className="rounded-lg border border-[var(--border-light)] px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <Icon name="chevron-right" size={16} />
        </button>
      </div>

      <CalendarMonth
        viewDate={viewDate}
        events={events}
        selectedDateKey={selectedDateKey}
        onSelectDate={setSelectedDateKey}
        onEventClick={(event) => openDetail(eventToDetail(event))}
        compact
      />

      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {formatAgendaDate(selectedDateKey)}
        </div>
        <div className="mt-2 space-y-2">
          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.slice(0, 3).map((event) => (
              <ClickableItem key={event.id} onClick={() => openDetail(eventToDetail(event))} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{event.title}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">{formatEventTimeRange(event)}</div>
              </ClickableItem>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-light)] px-3 py-5 text-center text-sm text-[var(--text-muted)]">
              当天没有安排
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
