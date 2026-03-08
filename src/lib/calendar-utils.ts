import type { Event } from './types';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const LUNAR_DAY_LABELS = [
  '',
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十',
];

const SOLAR_HOLIDAYS: Record<string, string> = {
  '01-01': '元旦',
  '05-01': '劳动节',
  '10-01': '国庆节',
};

const LUNAR_HOLIDAYS: Record<string, string> = {
  '正月-初一': '春节',
  '正月-十五': '元宵',
  '五月-初五': '端午',
  '七月-初七': '七夕',
  '八月-十五': '中秋',
  '九月-初九': '重阳',
  '腊月-初八': '腊八',
  '腊月-廿三': '小年',
  '腊月-廿四': '小年',
};

const chineseFormatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export interface CalendarDay {
  date: Date;
  key: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  holidayLabel: string | null;
  lunarLabel: string;
  lunarMonth: string;
  lunarDayLabel: string;
}

export function getWeekdayLabels() {
  return WEEKDAY_LABELS;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameDay(left: Date, right: Date) {
  return toDateKey(left) === toDateKey(right);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getMonthRange(viewDate: Date) {
  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  return {
    from: toDateKey(start),
    to: toDateKey(end),
  };
}

export function getMonthTitle(viewDate: Date) {
  return viewDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
  });
}

export function formatAgendaDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

export function formatEventTimeRange(event: Event) {
  const startDate = new Date(event.starts_at);
  const endDate = event.ends_at ? new Date(event.ends_at) : null;
  const startsAtMidnight = startDate.getHours() === 0 && startDate.getMinutes() === 0;
  const endsAtDayEnd = endDate && endDate.getHours() === 23 && endDate.getMinutes() >= 55;

  if (!endDate && startsAtMidnight) {
    return '全天';
  }

  if (endDate && toDateKey(startDate) === toDateKey(endDate)) {
    if (startsAtMidnight && endsAtDayEnd) {
      return '全天';
    }

    return `${startDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (endDate) {
    return `${startDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  }

  return startDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function groupEventsByDate(events: Event[]) {
  const grouped: Record<string, Event[]> = {};

  for (const event of events) {
    const start = new Date(event.starts_at);
    const end = event.ends_at ? new Date(event.ends_at) : start;
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    let safety = 0;

    while (current <= endDay && safety < 93) {
      const key = toDateKey(current);
      grouped[key] ??= [];
      grouped[key].push(event);
      current.setDate(current.getDate() + 1);
      safety += 1;
    }
  }

  Object.values(grouped).forEach((items) => {
    items.sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime());
  });

  return grouped;
}

function getQingmingDate(year: number) {
  const y = year % 100;
  const day = Math.floor(y * 0.2422 + 4.81) - Math.floor(y / 4);
  return `${year}-04-${String(day).padStart(2, '0')}`;
}

function getLunarParts(date: Date) {
  const parts = chineseFormatter.formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const dayNumber = Number(parts.find((part) => part.type === 'day')?.value || '1');
  const dayLabel = LUNAR_DAY_LABELS[dayNumber] || '';
  return {
    month,
    dayNumber,
    dayLabel,
  };
}

function getLunarHoliday(date: Date, month: string, dayLabel: string) {
  const mapped = LUNAR_HOLIDAYS[`${month}-${dayLabel}`];
  if (mapped) return mapped;

  if (month === '腊月') {
    const tomorrowMonth = getLunarParts(addDays(date, 1)).month;
    if (tomorrowMonth !== '腊月') {
      return '除夕';
    }
  }

  return null;
}

export function getCalendarDay(date: Date, currentMonth: Date): CalendarDay {
  const today = new Date();
  const { month, dayNumber, dayLabel } = getLunarParts(date);
  const key = toDateKey(date);
  const solarHoliday = key === getQingmingDate(date.getFullYear()) ? '清明' : SOLAR_HOLIDAYS[key.slice(5)] || null;
  const lunarHoliday = getLunarHoliday(date, month, dayLabel);
  const holidayLabel = solarHoliday || lunarHoliday;

  return {
    date,
    key,
    dayNumber: date.getDate(),
    inCurrentMonth: date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear(),
    isToday: isSameDay(date, today),
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
    holidayLabel,
    lunarLabel: holidayLabel || (dayNumber === 1 ? month : dayLabel),
    lunarMonth: month,
    lunarDayLabel: dayLabel,
  };
}

export function buildCalendarDays(viewDate: Date) {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthStartWeekday = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -monthStartWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return getCalendarDay(date, viewDate);
  });
}
