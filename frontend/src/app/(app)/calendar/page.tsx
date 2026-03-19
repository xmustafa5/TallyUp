'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { DayDetailModal } from '@/components/calendar/day-detail-modal';
import { useCalendarMonth } from '@/hooks/use-progress';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarPage() {
  const t = useTranslations('calendar');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: days, isLoading, error } = useCalendarMonth(year, month);

  function goToPrevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function goToNextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load calendar data. Please try again.
        </div>
      )}

      {days && (
        <CalendarGrid
          days={days}
          year={year}
          month={month}
          onDayClick={(date) => setSelectedDate(date)}
        />
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm bg-green-100 dark:bg-green-900/30" />
          <span className="text-xs text-muted-foreground">{t('complete')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm bg-amber-100 dark:bg-amber-900/30" />
          <span className="text-xs text-muted-foreground">{t('partial')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm bg-rose-100 dark:bg-rose-900/30" />
          <span className="text-xs text-muted-foreground">{t('missed')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-sm bg-muted/30" />
          <span className="text-xs text-muted-foreground">{t('noData')}</span>
        </div>
      </div>

      <DayDetailModal
        date={selectedDate}
        calendarDay={selectedDate && days ? days.find((d) => d.date === selectedDate) ?? null : null}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}
