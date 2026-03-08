'use client';

import type { MouseEvent } from 'react';
import type { Event } from '@/lib/types';
import { buildCalendarDays, formatEventTimeRange, getWeekdayLabels, groupEventsByDate, toDateKey } from '@/lib/calendar-utils';

const TYPE_STYLE_MAP: Record<string, string> = {
  meeting: 'bg-blue-500/14 text-blue-700 border-blue-500/20',
  deadline: 'bg-rose-500/14 text-rose-700 border-rose-500/20',
  review: 'bg-violet-500/14 text-violet-700 border-violet-500/20',
  other: 'bg-slate-500/12 text-slate-700 border-slate-500/15',
};

function getEventStyle(type: string | undefined) {
  return TYPE_STYLE_MAP[type?.toLowerCase?.() || 'other'] || TYPE_STYLE_MAP.other;
}

export interface CalendarMonthProps {
  viewDate: Date;
  events: Event[];
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  onEventClick?: (event: Event) => void;
  compact?: boolean;
}

export function CalendarMonth({
  viewDate,
  events,
  selectedDateKey,
  onSelectDate,
  onEventClick,
  compact = false,
}: CalendarMonthProps) {
  const days = buildCalendarDays(viewDate);
  const eventsByDate = groupEventsByDate(events);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2">
        {getWeekdayLabels().map((label) => (
          <div key={label} className="text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] py-1">
            周{label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = eventsByDate[day.key] || [];
          const visibleEvents = dayEvents.slice(0, compact ? 2 : 3);
          const extraCount = dayEvents.length - visibleEvents.length;
          const isSelected = day.key === selectedDateKey;

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDate(day.key)}
              className={`rounded-2xl border p-2 text-left transition-all ${
                compact ? 'min-h-[96px]' : 'min-h-[148px]'
              } ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm'
                  : 'border-[var(--border-light)] bg-[var(--bg-secondary)] hover:border-[var(--color-primary)]/30 hover:shadow-sm'
              } ${!day.inCurrentMonth ? 'opacity-55' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`text-sm font-semibold ${day.isToday ? 'text-[var(--color-primary)]' : 'text-[var(--text-primary)]'}`}>
                    {day.dayNumber}
                  </div>
                  <div className={`mt-0.5 text-[10px] ${day.holidayLabel ? 'text-rose-600 font-medium' : 'text-[var(--text-muted)]'}`}>
                    {day.lunarLabel}
                  </div>
                </div>
                {day.isToday && (
                  <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                    今天
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1.5">
                {visibleEvents.map((event) => (
                  <button
                    key={`${day.key}-${event.id}`}
                    type="button"
                    onClick={(clickEvent: MouseEvent<HTMLButtonElement>) => {
                      clickEvent.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className={`block w-full rounded-lg border px-2 py-1 text-left ${getEventStyle(event.type)} hover:brightness-[0.98]`}
                  >
                    <div className="truncate text-[11px] font-medium">{event.title}</div>
                    {!compact && (
                      <div className="mt-0.5 truncate text-[10px] opacity-80">
                        {formatEventTimeRange(event)}
                      </div>
                    )}
                  </button>
                ))}
                {extraCount > 0 && (
                  <div className="px-1 text-[11px] text-[var(--text-muted)]">+ {extraCount} 项安排</div>
                )}
                {dayEvents.length === 0 && compact && (
                  <div className="pt-1 text-[10px] text-[var(--text-muted)]">{day.lunarLabel}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function getDefaultSelectedDate(viewDate: Date) {
  const today = new Date();
  if (today.getFullYear() === viewDate.getFullYear() && today.getMonth() === viewDate.getMonth()) {
    return toDateKey(today);
  }

  return toDateKey(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1));
}
