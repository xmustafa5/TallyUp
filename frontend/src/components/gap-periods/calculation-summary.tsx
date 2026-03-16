'use client';

import { Loader2 } from 'lucide-react';
import { useCalculation } from '@/hooks/use-gap-periods';
import { PRAYER_NAMES, type PrayerType } from '@/constants/prayers';
import { PrayerBalanceCard } from './prayer-balance';

const PRAYER_KEYS: PrayerType[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];

export function CalculationSummary() {
  const { data: calculation, isLoading, error } = useCalculation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !calculation) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load calculation results.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Calculation Summary</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your total missed prayers across all gap periods
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Days</p>
          <p className="text-2xl font-bold">{calculation.totalDays.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Prayers</p>
          <p className="text-2xl font-bold">{calculation.totalPrayers.toLocaleString()}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Per-Prayer Breakdown</h3>
        <div className="grid grid-cols-5 gap-2">
          {PRAYER_KEYS.map((key) => {
            const lowerKey = key.toLowerCase() as keyof typeof calculation.perType;
            return (
              <div key={key} className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground">{PRAYER_NAMES[key].en}</p>
                <p className="mt-1 text-lg font-semibold">
                  {calculation.perType[lowerKey].toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {calculation.mergedPeriods.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Merged Periods (overlaps resolved)
          </h3>
          <div className="space-y-2">
            {calculation.mergedPeriods.map((period, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <span className="text-sm">
                  {new Date(period.startDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  &mdash;{' '}
                  {new Date(period.endDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-sm text-muted-foreground">
                  {period.days.toLocaleString()} days
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <PrayerBalanceCard balance={calculation.balance} />
    </div>
  );
}
