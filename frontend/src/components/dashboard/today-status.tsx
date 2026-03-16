'use client';

import Link from 'next/link';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import type { PrayerType } from '@/constants/prayers';

interface TodayStatusProps {
  todayStatus: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
    completedCount: number;
    isFinalized: boolean;
  };
}

function getPrayerFieldKey(pt: PrayerType): 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' {
  return pt.toLowerCase() as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
}

export function TodayStatus({ todayStatus }: TodayStatusProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Today&apos;s Prayers</h3>
        <Link
          href="/daily-tracker"
          className="text-xs font-medium text-primary hover:underline"
        >
          Go to tracker
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-3">
        {PRAYER_TYPES.map((pt) => {
          const field = getPrayerFieldKey(pt);
          const done = todayStatus[field];
          return (
            <div key={pt} className="flex flex-col items-center gap-1">
              <div
                className={`size-8 rounded-full border-2 ${
                  done
                    ? 'border-green-500 bg-green-500'
                    : 'border-muted-foreground/30 bg-transparent'
                }`}
              >
                {done && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-full p-1.5 text-white"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {PRAYER_NAMES[pt].en}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm font-medium">
          {todayStatus.completedCount}/5 today
        </span>
        {todayStatus.isFinalized && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            Finalized
          </span>
        )}
      </div>
    </div>
  );
}
