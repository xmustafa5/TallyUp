import { Skeleton, SkeletonCard, SkeletonLine, SkeletonCircle } from '@/components/shared/skeleton';

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Main Stats with Progress Circle */}
      <div className="flex flex-col items-center gap-6 rounded-lg border bg-card p-6 sm:flex-row">
        <SkeletonCircle className="size-32" />
        <div className="grid flex-1 grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 text-center sm:text-left">
              <Skeleton className="mx-auto h-7 w-16 sm:mx-0" />
              <Skeleton className="mx-auto h-3 w-20 sm:mx-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Today's Prayers */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="rounded-lg border bg-card p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLine key={i} className="w-full" />
          ))}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
