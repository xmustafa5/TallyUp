import { Skeleton } from '@/components/shared/skeleton';

export default function MakeupLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats Section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-20" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
              <Skeleton className="mx-auto h-3 w-12" />
              <Skeleton className="mx-auto h-6 w-8" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="mx-auto h-3 w-14" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Quick Log Section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border bg-card p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
