'use client';

import type { CalendarDay } from '@/services/progress';

interface CalendarGridProps {
  days: CalendarDay[];
  year: number;
  month: number;
  onDayClick: (date: string) => void;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getStatusClasses(status: CalendarDay['status']): string {
  switch (status) {
    case 'complete':
      return 'bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/50';
    case 'partial':
      return 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50';
    case 'missed':
      return 'bg-rose-100 text-rose-900 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/50';
    case 'future':
      return 'text-muted-foreground/50';
    case 'no-data':
      return 'bg-muted/30 text-muted-foreground';
    default:
      return '';
  }
}

function isCurrentDay(year: number, month: number, day: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
}

export function CalendarGrid({ days, year, month, onDayClick }: CalendarGridProps) {
  // month is 1-indexed
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build a lookup map from day number to CalendarDay
  const dayMap = new Map<number, CalendarDay>();
  for (const day of days) {
    const dayNum = new Date(day.date + 'T00:00:00').getDate();
    dayMap.set(dayNum, day);
  }

  // Build grid cells: leading empty cells + actual day cells
  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(dayMap.get(d) ?? null);
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {DAY_HEADERS.map((header) => (
          <div
            key={header}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {header}
          </div>
        ))}
        {cells.map((cell, index) => {
          if (cell === null && index < firstDayOfMonth) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          // For days without data in the month range
          if (cell === null) {
            const dayNum = index - firstDayOfMonth + 1;
            if (dayNum < 1 || dayNum > daysInMonth) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }
            // Day exists in calendar but no data returned from API
            return (
              <div
                key={`nodata-${dayNum}`}
                className="flex aspect-square flex-col items-center justify-center rounded-md bg-muted/30 text-muted-foreground"
              >
                <span className="text-sm">{dayNum}</span>
              </div>
            );
          }

          const dayNum = new Date(cell.date + 'T00:00:00').getDate();
          const statusClasses = getStatusClasses(cell.status);
          const isClickable = cell.status !== 'future';
          const isToday = isCurrentDay(year, month, dayNum);

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => isClickable && onDayClick(cell.date)}
              disabled={!isClickable}
              className={`flex aspect-square flex-col items-center justify-center rounded-md transition-colors ${statusClasses} ${isClickable ? 'cursor-pointer' : 'cursor-default'
                } ${isToday ? 'ring-1 ring-primary ring-offset-1' : ''}`}
            >
              <span className="text-sm font-medium">{dayNum}</span>
              {cell.prayedCount > 0 && (
                <span className="text-[10px]">{cell.prayedCount}p</span>
              )}
              {cell.makeupCount > 0 && (
                <span className="text-[10px] font-medium">+{cell.makeupCount}m</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
