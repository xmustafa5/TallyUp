'use client';

import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDateTracker, useMarkPrayers } from '@/hooks/use-daily-tracker';
import { useCalendarDayDetail } from '@/hooks/use-progress';
import { useLogMakeupForDay } from '@/hooks/use-makeup';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import type { PrayerType } from '@/constants/prayers';
import type { CalendarDay } from '@/services/progress';
import { useToast } from '@/components/shared/toast';
import { useQueryClient } from '@tanstack/react-query';

interface DayDetailModalProps {
  date: string | null;
  calendarDay?: CalendarDay | null;
  onClose: () => void;
}

function getPrayerFieldKey(pt: PrayerType): 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' {
  return pt.toLowerCase() as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
}

function formatDisplayDate(dateString: string): string {
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isDateToday(dateString: string): boolean {
  const now = new Date();
  const d = new Date(dateString + 'T00:00:00');
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function DayDetailModal({ date, calendarDay, onClose }: DayDetailModalProps) {
  if (!date) return null;

  const isToday = isDateToday(date);
  const isNotFuture = calendarDay && calendarDay.status !== 'future';

  // Fetch day detail for all non-future days (to check if gap day)
  const { data: dayDetail, isLoading: dayDetailLoading } = useCalendarDayDetail(
    isNotFuture ? date : null,
  );

  // Fetch daily tracker only for non-gap days (gap days use Qadha modal only)
  const isGapDay = dayDetail?.isGapDay ?? false;
  const shouldFetchTracker = !isGapDay && (isToday || isNotFuture);
  const { data: tracker, isLoading: trackerLoading } = useDateTracker(
    shouldFetchTracker ? date : '',
  );

  const logMakeupForDay = useLogMakeupForDay();
  const markMutation = useMarkPrayers();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  function handleTogglePrayer(prayerType: PrayerType) {
    if (!date || !tracker) return;
    const field = getPrayerFieldKey(prayerType);
    const currentValue = tracker[field];
    markMutation.mutate(
      { date, prayers: { [field]: !currentValue } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['progress', 'calendar'] });
        },
        onError: () => {
          toast({ message: 'Failed to update prayer', type: 'error' });
        },
      },
    );
  }

  function handleLogMakeupForDay(prayerType: PrayerType) {
    if (!date) return;
    logMakeupForDay.mutate(
      { date, prayerType },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['progress', 'calendar', 'day', date] });
          queryClient.invalidateQueries({ queryKey: ['progress', 'calendar'] });
          toast({ message: `${PRAYER_NAMES[prayerType].en} qadha logged`, type: 'success' });
        },
        onError: () => {
          toast({ message: 'Already logged or failed', type: 'error' });
        },
      },
    );
  }

  const isLoading = (isNotFuture && dayDetailLoading) || (shouldFetchTracker && trackerLoading);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div className="relative z-10 mx-4 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">{formatDisplayDate(date)}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* TODAY (non-gap): Daily Prayers only */}
          {isToday && !isGapDay && tracker && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Daily Prayers</h3>
              <div className="space-y-2">
                {PRAYER_TYPES.map((pt) => {
                  const field = getPrayerFieldKey(pt);
                  const completed = tracker[field];
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => handleTogglePrayer(pt)}
                      disabled={markMutation.isPending}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                        completed
                          ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <span>{PRAYER_NAMES[pt].en}</span>
                      <Check className={`size-5 ${completed ? 'text-green-500' : 'text-muted-foreground/20'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* GAP DAY (past or today): Qadha Prayers only */}
          {!dayDetailLoading && dayDetail && dayDetail.isGapDay && dayDetail.prayers && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Qadha Prayers</h3>
                <span className={`text-xs font-medium ${
                  dayDetail.status === 'complete' ? 'text-green-600' :
                  dayDetail.status === 'partial' ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {dayDetail.status === 'complete' ? 'Fully made up' :
                   dayDetail.status === 'partial' ? 'In progress' : 'Not yet made up'}
                </span>
              </div>
              <div className="space-y-2">
                {PRAYER_TYPES.map((pt) => {
                  const field = getPrayerFieldKey(pt);
                  const isDone = dayDetail.prayers![field];
                  if (isDone) {
                    return (
                      <div key={pt} className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950/20">
                        <span className="text-sm font-medium">{PRAYER_NAMES[pt].en}</span>
                        <Check className="size-5 text-green-500" />
                      </div>
                    );
                  }
                  return (
                    <button key={pt} type="button" onClick={() => handleLogMakeupForDay(pt)} disabled={logMakeupForDay.isPending}
                      className="flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-green-50 hover:border-green-200 disabled:opacity-50 dark:hover:bg-green-950/20">
                      <span>{PRAYER_NAMES[pt].en}</span>
                      <span className="text-xs text-muted-foreground">Tap to log</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAST NON-GAP DAY: Daily Prayers (editable) */}
          {!isToday && !isGapDay && tracker && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Daily Prayers</h3>
              <div className="space-y-2">
                {PRAYER_TYPES.map((pt) => {
                  const field = getPrayerFieldKey(pt);
                  const completed = tracker[field];
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => handleTogglePrayer(pt)}
                      disabled={markMutation.isPending}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                        completed
                          ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <span>{PRAYER_NAMES[pt].en}</span>
                      <Check className={`size-5 ${completed ? 'text-green-500' : 'text-muted-foreground/20'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No data */}
          {!isLoading && !tracker && !dayDetail?.isGapDay && calendarDay?.status === 'no-data' && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No tracking data for this date.
            </p>
          )}

          {/* Future date */}
          {calendarDay?.status === 'future' && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Future date
            </p>
          )}
        </div>

        <div className="mt-6">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
