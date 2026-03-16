'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/shared/toast';
import { useSchedule, useUpdateSchedule, useTodayProgress } from '@/hooks/use-schedule';

const scheduleSchema = z.object({
  dailyGoal: z.coerce.number().int().min(1, 'Minimum 1').max(50, 'Maximum 50'),
  weeklyGoal: z.coerce.number().int().min(1, 'Minimum 1').max(350, 'Maximum 350'),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

const inputClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface ProgressBarProps {
  value: number;
  max: number;
  percentage: number;
  label: string;
}

function ProgressBar({ value, max, percentage, label }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value} / {max} prayers
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">{percentage}%</p>
    </div>
  );
}

export default function SchedulePage() {
  const { toast } = useToast();
  const { data: schedule, isLoading: scheduleLoading } = useSchedule();
  const { data: progress, isLoading: progressLoading } = useTodayProgress();
  const updateSchedule = useUpdateSchedule();

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      dailyGoal: 5,
      weeklyGoal: 35,
    },
  });

  // Reset form values when schedule data loads
  useEffect(() => {
    if (schedule) {
      form.reset({
        dailyGoal: schedule.dailyGoal,
        weeklyGoal: schedule.weeklyGoal,
      });
    }
  }, [schedule, form]);

  async function onSubmit(data: ScheduleFormData) {
    try {
      await updateSchedule.mutateAsync(data);
      toast({ message: 'Schedule updated successfully', type: 'success' });
    } catch {
      toast({ message: 'Failed to update schedule', type: 'error' });
    }
  }

  const isLoading = scheduleLoading || progressLoading;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedule & Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set daily and weekly makeup prayer goals to stay on track
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Goals Form */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Prayer Goals</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              How many makeup prayers do you want to complete each day and week?
            </p>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-4 space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="daily-goal" className="text-sm font-medium">
                    Daily Goal (1-50)
                  </label>
                  <input
                    id="daily-goal"
                    type="number"
                    min={1}
                    max={50}
                    className={inputClassName}
                    {...form.register('dailyGoal')}
                  />
                  {form.formState.errors.dailyGoal && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.dailyGoal.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="weekly-goal" className="text-sm font-medium">
                    Weekly Goal (1-350)
                  </label>
                  <input
                    id="weekly-goal"
                    type="number"
                    min={1}
                    max={350}
                    className={inputClassName}
                    {...form.register('weeklyGoal')}
                  />
                  {form.formState.errors.weeklyGoal && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.weeklyGoal.message}
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={updateSchedule.isPending}
              >
                <Loader2
                  className={`mr-2 size-4 animate-spin ${updateSchedule.isPending ? '' : 'hidden'}`}
                />
                Save Goals
              </Button>
            </form>
          </div>

          {/* Today's Progress */}
          {progress && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold">Today&apos;s Progress</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your progress against daily and weekly goals
              </p>

              <div className="mt-4 space-y-6">
                <ProgressBar
                  value={progress.dailyCompleted}
                  max={progress.dailyGoal}
                  percentage={progress.dailyPercentage}
                  label="Daily"
                />

                <ProgressBar
                  value={progress.weeklyCompleted}
                  max={progress.weeklyGoal}
                  percentage={progress.weeklyPercentage}
                  label="Weekly"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
