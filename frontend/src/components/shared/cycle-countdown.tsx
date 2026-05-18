'use client';

import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCountdown } from '@/hooks/use-countdown';

export function CycleCountdown({
  endsAt,
  className,
}: {
  endsAt: string | null | undefined;
  className?: string;
}) {
  const t = useTranslations('countdown');
  const c = useCountdown(endsAt);
  if (!endsAt) return null;

  const label = c.isPast
    ? t('ended')
    : c.days > 0
      ? t('daysLeft', { days: c.days, hours: c.hours })
      : c.hours > 0
        ? t('hoursLeft', { hours: c.hours, minutes: c.minutes })
        : t('minutesLeft', { minutes: c.minutes, seconds: c.seconds });

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        c.isPast ? 'text-muted-foreground' : 'text-foreground'
      } ${className ?? ''}`}
    >
      <Clock className="size-3" />
      {label}
    </span>
  );
}
