'use client';

import { Clock } from 'lucide-react';
import { useCountdown } from '@/hooks/use-countdown';

export function CycleCountdown({
  endsAt,
  className,
}: {
  endsAt: string | null | undefined;
  className?: string;
}) {
  const c = useCountdown(endsAt);
  if (!endsAt) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        c.isPast ? 'text-muted-foreground' : 'text-foreground'
      } ${className ?? ''}`}
    >
      <Clock className="size-3" />
      {c.label}
    </span>
  );
}
