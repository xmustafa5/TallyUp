'use client';

import Link from 'next/link';
import { Calendar, CheckSquare, Loader2, LogOut, RotateCcw, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { ProgressCircle } from '@/components/dashboard/progress-circle';
import { TodayStatus } from '@/components/dashboard/today-status';
import { MilestoneBanner } from '@/components/dashboard/milestone-banner';
import { StreakDisplay } from '@/components/prayer-tracking/streak-display';
import { useDashboard } from '@/hooks/use-progress';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { data: dashboard, isLoading, error } = useDashboard();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {user?.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and make up your missed prayers
          </p>
        </div>
        <Button variant="outline" onClick={clearAuth}>
          <LogOut className="mr-1.5 size-4" />
          Sign out
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load dashboard data. Please try again.
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
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {dashboard.totalCompleted.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.recentActivity}</p>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
            </div>
          </div>

          {/* Today's Status */}
          <TodayStatus todayStatus={dashboard.todayStatus} />

          {/* Streak */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Streak</h2>
            <StreakDisplay
              currentStreak={dashboard.streak.currentStreak}
              longestStreak={dashboard.streak.longestStreak}
            />
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/gap-periods" className="block">
                <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Settings className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Gap Periods</h3>
                      <p className="text-xs text-muted-foreground">
                        Manage missed periods
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
                      <h3 className="font-medium">Daily Tracker</h3>
                      <p className="text-xs text-muted-foreground">
                        Track today&apos;s prayers
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
                      <h3 className="font-medium">Makeup Prayers</h3>
                      <p className="text-xs text-muted-foreground">
                        Log completed makeup
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
                      <h3 className="font-medium">Calendar</h3>
                      <p className="text-xs text-muted-foreground">
                        Monthly overview
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
