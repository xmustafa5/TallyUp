import { Skeleton, SkeletonLine } from '@/components/shared/skeleton';

export default function DailyTrackerLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Prayer Cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="rounded-lg border bg-card p-4">
        <SkeletonLine className="w-40" />
      </div>

      {/* Weekly View */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center rounded-lg border p-2 space-y-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-3 w-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
