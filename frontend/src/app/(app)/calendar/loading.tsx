import { Skeleton } from '@/components/shared/skeleton';

export default function CalendarLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Month Nav */}
      <div className="flex items-center justify-between">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="size-9 rounded-md" />
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="mx-auto h-4 w-8" />
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-md" />
        ))}
      </div>

      {/* Legend */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="size-3 rounded-sm" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
