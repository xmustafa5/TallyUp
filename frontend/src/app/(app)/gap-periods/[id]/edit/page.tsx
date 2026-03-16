'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGapPeriods, useUpdateGapPeriod } from '@/hooks/use-gap-periods';

const editSchema = z
  .object({
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

type EditFormData = z.infer<typeof editSchema>;

export default function EditGapPeriodPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: gapPeriods, isLoading } = useGapPeriods();
  const updateMutation = useUpdateGapPeriod();
  const [error, setError] = useState<string | null>(null);

  const gapPeriod = gapPeriods?.find((gp) => gp.id === id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    values: gapPeriod
      ? {
          startDate: gapPeriod.startDate,
          endDate: gapPeriod.endDate,
        }
      : undefined,
  });

  async function onSubmit(data: EditFormData) {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        id,
        payload: {
          startDate: data.startDate,
          endDate: data.endDate,
        },
      });
      router.push('/gap-periods');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update gap period.');
    }
  }

  const isSubmitting = updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!gapPeriod) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <Link
          href="/gap-periods"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 size-4" />
          Back to Gap Periods
        </Link>
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Gap period not found.
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold tracking-tight">Edit Gap Period</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the date range for this gap period
        </p>
        <span className="mt-2 inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {gapPeriod.inputMethod === 'DATE_RANGE' ? 'Date Range' : 'Age Range'}
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="startDate" className="text-sm font-medium">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            max={new Date().toISOString().split('T')[0]}
            {...register('startDate')}
          />
          {errors.startDate && (
            <p className="text-sm text-destructive">{errors.startDate.message}</p>
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
            {...register('endDate')}
          />
          {errors.endDate && (
            <p className="text-sm text-destructive">{errors.endDate.message}</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            <Loader2
              className={`mr-2 size-4 animate-spin ${isSubmitting ? '' : 'hidden'}`}
            />
            Save Changes
          </Button>
          <Link href="/gap-periods" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
