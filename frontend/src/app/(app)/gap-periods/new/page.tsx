'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateGapPeriod } from '@/hooks/use-gap-periods';
import type { InputMethod } from '@/services/gap-periods';

const dateRangeSchema = z
  .object({
    inputMethod: z.literal('DATE_RANGE'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  })
  .refine((data) => new Date(data.endDate) <= new Date(), {
    message: 'End date cannot be in the future',
    path: ['endDate'],
  });

const ageRangeSchema = z
  .object({
    inputMethod: z.literal('AGE_RANGE'),
    startAge: z.string().min(1, 'Start age is required'),
    endAge: z.string().min(1, 'End age is required'),
  })
  .refine(
    (data) => {
      const start = parseInt(data.startAge, 10);
      const end = parseInt(data.endAge, 10);
      return !isNaN(start) && !isNaN(end) && start <= end;
    },
    {
      message: 'Start age must be less than or equal to end age',
      path: ['endAge'],
    },
  );

type DateRangeFormData = z.infer<typeof dateRangeSchema>;
type AgeRangeFormData = z.infer<typeof ageRangeSchema>;

export default function NewGapPeriodPage() {
  const router = useRouter();
  const createMutation = useCreateGapPeriod();
  const [inputMethod, setInputMethod] = useState<InputMethod>('DATE_RANGE');
  const [error, setError] = useState<string | null>(null);

  const dateForm = useForm<DateRangeFormData>({
    resolver: zodResolver(dateRangeSchema),
    defaultValues: {
      inputMethod: 'DATE_RANGE',
      startDate: '',
      endDate: '',
    },
  });

  const ageForm = useForm<AgeRangeFormData>({
    resolver: zodResolver(ageRangeSchema),
    defaultValues: {
      inputMethod: 'AGE_RANGE',
      startAge: '',
      endAge: '',
    },
  });

  async function onSubmitDateRange(data: DateRangeFormData) {
    setError(null);
    try {
      await createMutation.mutateAsync({
        inputMethod: 'DATE_RANGE',
        startDate: data.startDate,
        endDate: data.endDate,
      });
      router.push('/gap-periods');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create gap period.');
    }
  }

  async function onSubmitAgeRange(data: AgeRangeFormData) {
    setError(null);
    try {
      await createMutation.mutateAsync({
        inputMethod: 'AGE_RANGE',
        startAge: parseInt(data.startAge, 10),
        endAge: parseInt(data.endAge, 10),
      });
      router.push('/gap-periods');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create gap period.');
    }
  }

  const isSubmitting = createMutation.isPending;

  return (
    <div className="mx-auto max-w-lg space-y-8 p-6">
      <div>
        <Link
          href="/gap-periods"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 size-4" />
          Back to Gap Periods
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Add Gap Period</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define a period of time when you missed prayers
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-6">
        <div className="flex rounded-lg border p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              inputMethod === 'DATE_RANGE'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setInputMethod('DATE_RANGE')}
          >
            Date Range
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              inputMethod === 'AGE_RANGE'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setInputMethod('AGE_RANGE')}
          >
            Age Range
          </button>
        </div>

        {inputMethod === 'DATE_RANGE' && (
          <form onSubmit={dateForm.handleSubmit(onSubmitDateRange)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                max={new Date().toISOString().split('T')[0]}
                {...dateForm.register('startDate')}
              />
              {dateForm.formState.errors.startDate && (
                <p className="text-sm text-destructive">
                  {dateForm.formState.errors.startDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="endDate" className="text-sm font-medium">
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                max={new Date().toISOString().split('T')[0]}
                {...dateForm.register('endDate')}
              />
              {dateForm.formState.errors.endDate && (
                <p className="text-sm text-destructive">
                  {dateForm.formState.errors.endDate.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Loader2
                className={`mr-2 size-4 animate-spin ${isSubmitting ? '' : 'hidden'}`}
              />
              Create Gap Period
            </Button>
          </form>
        )}

        {inputMethod === 'AGE_RANGE' && (
          <form onSubmit={ageForm.handleSubmit(onSubmitAgeRange)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="startAge" className="text-sm font-medium">
                Start Age
              </label>
              <input
                id="startAge"
                type="number"
                min={0}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. 15"
                {...ageForm.register('startAge')}
              />
              {ageForm.formState.errors.startAge && (
                <p className="text-sm text-destructive">
                  {ageForm.formState.errors.startAge.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="endAge" className="text-sm font-medium">
                End Age
              </label>
              <input
                id="endAge"
                type="number"
                min={0}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. 25"
                {...ageForm.register('endAge')}
              />
              {ageForm.formState.errors.endAge && (
                <p className="text-sm text-destructive">
                  {ageForm.formState.errors.endAge.message}
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Your birthdate from your profile will be used to calculate exact dates.
            </p>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Loader2
                className={`mr-2 size-4 animate-spin ${isSubmitting ? '' : 'hidden'}`}
              />
              Create Gap Period
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
