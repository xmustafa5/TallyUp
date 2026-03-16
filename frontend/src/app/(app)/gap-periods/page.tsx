'use client';

import Link from 'next/link';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGapPeriods, useDeleteGapPeriod } from '@/hooks/use-gap-periods';
import { CalculationSummary } from '@/components/gap-periods/calculation-summary';

export default function GapPeriodsPage() {
  const { data: gapPeriods, isLoading, error } = useGapPeriods();
  const deleteMutation = useDeleteGapPeriod();

  function handleDelete(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this gap period? This action cannot be undone.',
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gap Periods</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your periods of missed prayers
          </p>
        </div>
        <Link href="/gap-periods/new">
          <Button>
            <Plus className="mr-1.5 size-4" />
            Add Period
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load gap periods. Please try again.
        </div>
      )}

      {gapPeriods && gapPeriods.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No gap periods yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first gap period to start tracking your missed prayers.
          </p>
          <Link href="/gap-periods/new">
            <Button className="mt-4">
              <Plus className="mr-1.5 size-4" />
              Add Your First Period
            </Button>
          </Link>
        </div>
      )}

      {gapPeriods && gapPeriods.length > 0 && (
        <div className="space-y-4">
          {gapPeriods.map((gp) => (
            <div
              key={gp.id}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">
                      {formatDate(gp.startDate)} &mdash; {formatDate(gp.endDate)}
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {gp.inputMethod === 'DATE_RANGE' ? 'Date Range' : 'Age Range'}
                    </span>
                  </div>
                  {gp.inputMethod === 'AGE_RANGE' &&
                    gp.originalStartAge !== null &&
                    gp.originalEndAge !== null && (
                      <p className="text-xs text-muted-foreground">
                        Ages {gp.originalStartAge} to {gp.originalEndAge}
                      </p>
                    )}
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{gp.totalDays.toLocaleString()} days</span>
                    <span>{gp.totalPrayers.toLocaleString()} prayers</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Link href={`/gap-periods/${gp.id}/edit`}>
                    <Button variant="ghost" size="icon">
                      <Pencil className="size-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(gp.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {gapPeriods && gapPeriods.length > 0 && <CalculationSummary />}
    </div>
  );
}
