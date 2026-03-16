'use client';

import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrayerCard } from '@/components/prayer-tracking/prayer-card';
import { StreakDisplay } from '@/components/prayer-tracking/streak-display';
import { useTodayTracker, useMarkPrayers, useFinalizeDay, useWeekTrackers, useStreak } from '@/hooks/use-daily-tracker';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import type { PrayerType } from '@/constants/prayers';
import { useState } from 'react';
import { useToast } from '@/components/shared/toast';

function formatDisplayDate(dateString: string): string {
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatShortDate(dateString: string): string {
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getPrayerFieldKey(pt: PrayerType): 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' {
  return pt.toLowerCase() as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
}

export default function DailyTrackerPage() {
  const { data: today, isLoading: todayLoading, error: todayError } = useTodayTracker();
  const { data: weekData, isLoading: weekLoading } = useWeekTrackers();
  const { data: streakData, isLoading: streakLoading } = useStreak();
  const markMutation = useMarkPrayers();
  const finalizeMutation = useFinalizeDay();

  const [pendingPrayer, setPendingPrayer] = useState<string | null>(null);
  const { toast } = useToast();

  function handleToggle(prayerType: PrayerType) {
    if (!today) return;
    const field = getPrayerFieldKey(prayerType);
    const currentValue = today[field];
    setPendingPrayer(prayerType);
    markMutation.mutate(
      { date: today.date, prayers: { [field]: !currentValue } },
      {
        onError: () => {
          toast({ message: 'Failed to update prayer', type: 'error' });
        },
        onSettled: () => setPendingPrayer(null),
      },
    );
  }

  function handleFinalize() {
    if (!today) return;
    const confirmed = window.confirm(
      'Are you sure you want to finalize today? Missed prayers will be added to your makeup balance. This cannot be undone.',
    );
    if (confirmed) {
      finalizeMutation.mutate(today.date, {
        onSuccess: () => {
          toast({ message: 'Day finalized', type: 'success' });
        },
        onError: () => {
          toast({ message: 'Failed to finalize day', type: 'error' });
        },
      });
    }
  }

  const completedCount = today
    ? PRAYER_TYPES.filter((pt) => today[getPrayerFieldKey(pt)]).length
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Today&apos;s Prayers</h1>
        {today && (
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDisplayDate(today.date)}
          </p>
        )}
      </div>

      {todayLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {todayError && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load today&apos;s tracker. Please try again.
        </div>
      )}

      {today && (
        <>
          <div className="space-y-3">
            {PRAYER_TYPES.map((pt) => (
              <PrayerCard
                key={pt}
                name={PRAYER_NAMES[pt].en}
                completed={today[getPrayerFieldKey(pt)]}
                disabled={today.isFinalized}
                onToggle={() => handleToggle(pt)}
                isPending={pendingPrayer === pt}
              />
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-card p-4">
            <p className="text-sm font-medium">
              {completedCount} of 5 prayers completed
            </p>
            {today.isFinalized && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5" />
                Finalized
              </span>
            )}
          </div>

          {!today.isFinalized && (
            <Button
              variant="outline"
              onClick={handleFinalize}
              disabled={finalizeMutation.isPending}
              className="w-full"
            >
              <Loader2
                className={`mr-2 size-4 animate-spin ${finalizeMutation.isPending ? '' : 'hidden'}`}
              />
              Finalize Day
            </Button>
          )}
        </>
      )}

      {/* Weekly View */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">This Week</h2>
        {weekLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {weekData && weekData.length > 0 && (
          <div className="grid grid-cols-7 gap-2">
            {weekData.map((day) => {
              const count = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).filter(
                (f) => day[f],
              ).length;
              return (
                <div
                  key={day.date}
                  className={`flex flex-col items-center rounded-lg border p-2 text-center ${
                    count === 5
                      ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20'
                      : count > 0
                        ? 'border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20'
                        : 'bg-card'
                  }`}
                >
                  <span className="text-xs text-muted-foreground">
                    {formatShortDate(day.date).split(',')[0]}
                  </span>
                  <span className="text-lg font-bold">{count}</span>
                  <span className="text-xs text-muted-foreground">/5</span>
                </div>
              );
            })}
          </div>
        )}
        {weekData && weekData.length === 0 && (
          <p className="text-sm text-muted-foreground">No tracking data this week yet.</p>
        )}
      </div>

      {/* Streak */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Streak</h2>
        {streakLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {streakData && (
          <StreakDisplay
            currentStreak={streakData.currentStreak}
            longestStreak={streakData.longestStreak}
          />
        )}
      </div>
    </div>
  );
}
