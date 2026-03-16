'use client';

import { Loader2 } from 'lucide-react';
import { usePrayerBalance } from '@/hooks/use-gap-periods';
import { PRAYER_NAMES, type PrayerType } from '@/constants/prayers';
import type { PrayerBalance } from '@/services/gap-periods';

const PRAYER_KEYS: PrayerType[] = ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];

interface PrayerBalanceCardProps {
  balance: PrayerBalance;
}

export function PrayerBalanceCard({ balance }: PrayerBalanceCardProps) {
  const total = balance.totalRemaining + balance.totalCompleted;
  const progressPercent = total > 0 ? Math.round((balance.totalCompleted / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Prayer Balance</h3>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Overall Progress</p>
            <p className="text-lg font-semibold">
              {balance.totalCompleted.toLocaleString()} / {total.toLocaleString()} completed
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{progressPercent}%</p>
            <p className="text-xs text-muted-foreground">
              {balance.totalRemaining.toLocaleString()} remaining
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {PRAYER_KEYS.map((key) => {
          const lowerKey = key.toLowerCase() as keyof Pick<
            PrayerBalance,
            'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
          >;
          const remaining = balance[lowerKey];
          return (
            <div key={key} className="rounded-lg border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">{PRAYER_NAMES[key].en}</p>
              <p className="mt-1 text-lg font-semibold">{remaining.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">remaining</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PrayerBalanceSection() {
  const { data: balance, isLoading, error } = usePrayerBalance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !balance) {
    return null;
  }

  const hasData = balance.totalRemaining > 0 || balance.totalCompleted > 0;
  if (!hasData) {
    return null;
  }

  return <PrayerBalanceCard balance={balance} />;
}
