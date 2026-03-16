'use client';

import { Loader2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMakeupHistory, useLogMakeup, useUndoMakeup, useMakeupStats } from '@/hooks/use-makeup';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import type { PrayerType } from '@/constants/prayers';
import { useState } from 'react';

function getPrayerFieldKey(pt: PrayerType): 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' {
  return pt.toLowerCase() as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getSourceLabel(source: string): string {
  switch (source) {
    case 'MANUAL':
      return 'Manual';
    case 'DAILY_MISSED':
      return 'Daily Missed';
    case 'GAP_PERIOD':
      return 'Gap Period';
    default:
      return source;
  }
}

function getSourceStyle(source: string): string {
  switch (source) {
    case 'MANUAL':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
    case 'DAILY_MISSED':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400';
    case 'GAP_PERIOD':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
}

export default function MakeupPage() {
  const { data: stats, isLoading: statsLoading } = useMakeupStats();
  const { data: history, isLoading: historyLoading, error: historyError } = useMakeupHistory();
  const logMutation = useLogMakeup();
  const undoMutation = useUndoMakeup();

  const [loggingPrayer, setLoggingPrayer] = useState<string | null>(null);

  function handleLog(prayerType: PrayerType) {
    setLoggingPrayer(prayerType);
    logMutation.mutate(prayerType, {
      onSettled: () => setLoggingPrayer(null),
    });
  }

  function handleUndo(id: string) {
    const confirmed = window.confirm('Undo this makeup prayer log?');
    if (confirmed) {
      undoMutation.mutate(id);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Makeup Prayers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log your completed makeup prayers and track progress
        </p>
      </div>

      {/* Stats Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Progress</h2>
        {statsLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {stats && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              {PRAYER_TYPES.map((pt) => {
                const field = getPrayerFieldKey(pt);
                const stat = stats.perType[field];
                const total = stat.completed + stat.remaining;
                const pct = total > 0 ? Math.round((stat.completed / total) * 100) : 0;
                return (
                  <div
                    key={pt}
                    className="rounded-lg border bg-card p-3 text-center"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {PRAYER_NAMES[pt].en}
                    </p>
                    <p className="mt-1 text-lg font-bold">{stat.completed}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
                      <div
                        className="h-1.5 rounded-full bg-green-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stat.remaining} left
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-card p-4">
              <p className="text-sm font-medium">
                Total completed: {stats.totalCompleted.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Remaining: {stats.totalRemaining.toLocaleString()}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Quick Log Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Log</h2>
        <div className="grid grid-cols-5 gap-2">
          {PRAYER_TYPES.map((pt) => (
            <Button
              key={pt}
              variant="outline"
              onClick={() => handleLog(pt)}
              disabled={loggingPrayer === pt}
              className="flex-col gap-1 py-3"
            >
              <Loader2
                className={`size-4 animate-spin ${loggingPrayer === pt ? '' : 'hidden'}`}
              />
              <span className={loggingPrayer === pt ? 'hidden' : ''}>
                {PRAYER_NAMES[pt].en}
              </span>
              <span className={loggingPrayer === pt ? '' : 'hidden'}>
                Logging...
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent History</h2>

        {historyLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {historyError && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load history. Please try again.
          </div>
        )}

        {history && history.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <h3 className="text-lg font-medium">No makeup prayers logged yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the quick log buttons above to record your first makeup prayer.
            </p>
          </div>
        )}

        {history && history.length > 0 && (
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {PRAYER_NAMES[entry.prayerType.toUpperCase() as PrayerType]?.en ??
                      entry.prayerType}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSourceStyle(entry.source)}`}
                  >
                    {getSourceLabel(entry.source)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.completedAt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleUndo(entry.id)}
                    disabled={undoMutation.isPending}
                  >
                    <Undo2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
