'use client';

import Link from 'next/link';
import { Calendar, Calculator, CheckSquare, LogOut, RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { PrayerBalanceSection } from '@/components/gap-periods/prayer-balance';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and make up your missed prayers
          </p>
        </div>
        <Button variant="outline" onClick={clearAuth}>
          <LogOut className="mr-1.5 size-4" />
          Sign out
        </Button>
      </div>

      <PrayerBalanceSection />

      <div className="grid grid-cols-2 gap-4">
        <Link href="/gap-periods" className="block">
          <div className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Gap Periods</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your missed prayer periods
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/gap-periods" className="block">
          <div className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Calculator className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Calculator</h3>
                <p className="text-sm text-muted-foreground">
                  View calculation summary and balance
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/daily-tracker" className="block">
          <div className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <CheckSquare className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Daily Tracker</h3>
                <p className="text-sm text-muted-foreground">
                  Track today&apos;s prayers
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/makeup" className="block">
          <div className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <RotateCcw className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Makeup Prayers</h3>
                <p className="text-sm text-muted-foreground">
                  Log completed makeup prayers
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
