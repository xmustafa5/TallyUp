interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${className}`}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonLine({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-4 ${className}`} />;
}

export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-full bg-muted ${className}`} />;
}
