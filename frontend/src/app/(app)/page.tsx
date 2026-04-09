'use client';

import Link from 'next/link';
import { Calendar, CheckSquare, Loader2, LogOut, RotateCcw, Settings, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { ProgressCircle } from '@/components/dashboard/progress-circle';
import { TodayStatus } from '@/components/dashboard/today-status';
import { MilestoneBanner } from '@/components/dashboard/milestone-banner';
import { StreakDisplay } from '@/components/prayer-tracking/streak-display';
import { useDashboard } from '@/hooks/use-progress';
import { useTodayProgress } from '@/hooks/use-schedule';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tDailyTracker = useTranslations('dailyTracker');
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { data: dashboard, isLoading, error } = useDashboard();
  const { data: goalProgress } = useTodayProgress();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('welcome', { name: user?.name ?? '' })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Button variant="outline" onClick={clearAuth}>
          <LogOut className="mr-1.5 size-4" />
          {tCommon('signOut')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {tCommon('error')}. {tCommon('retry')}.
        </div>
      )}

      {dashboard && (
        <>
          {/* Milestone Banner */}
          <MilestoneBanner milestone={dashboard.milestone} />

          {/* Main Stats */}
          <div className="flex flex-col items-center gap-6 rounded-lg border bg-card p-6 sm:flex-row">
            <ProgressCircle percentage={dashboard.completionPercentage} />
            <div className="grid flex-1 grid-cols-3 gap-4 text-center sm:text-left">
              <div>
                <p className="text-2xl font-bold">
                  {dashboard.totalRemaining.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{t('totalRemaining')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {dashboard.totalCompleted.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{t('totalCompleted')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.recentActivity}</p>
                <p className="text-xs text-muted-foreground">{t('recentActivity')}</p>
              </div>
            </div>
          </div>

          {/* Today's Status */}
          <TodayStatus todayStatus={dashboard.todayStatus} />

          {/* Today's Goal Progress */}
          {goalProgress && (
            <Link href="/schedule" className="block">
              <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="size-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">{t('todaysPrayers')}</h3>
                    <p className="text-lg font-bold">
                      {goalProgress.dailyCompleted}/{goalProgress.dailyGoal} today
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {goalProgress.weeklyCompleted}/{goalProgress.weeklyGoal} this week
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${goalProgress.dailyPercentage}%` }}
                  />
                </div>
              </div>
            </Link>
          )}

          {/* Streak */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">{tDailyTracker('streak')}</h2>
            <StreakDisplay
              currentStreak={dashboard.streak.currentStreak}
              longestStreak={dashboard.streak.longestStreak}
            />
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t('quickActions')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/gap-periods" className="block">
                <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Settings className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{t('gapPeriods')}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t('gapPeriodsDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/daily-tracker" className="block">
                <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <CheckSquare className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{t('dailyTracker')}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t('dailyTrackerDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/makeup" className="block">
                <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <RotateCcw className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{t('makeupPrayers')}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t('makeupPrayersDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/calendar" className="block">
                <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{t('calendarView')}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t('calendarDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
