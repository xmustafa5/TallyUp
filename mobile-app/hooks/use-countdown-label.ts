import type { Countdown } from '@/hooks/use-countdown';
import { useI18n } from '@/hooks/use-i18n';

/**
 * Localized label for a Countdown. Keeps the useCountdown hook returning raw
 * numbers (logic unchanged) while the displayed text is translated.
 */
export function useCountdownLabel(c: Countdown): string {
  const { t } = useI18n();
  if (c.isPast) return t('countdown.ended');
  if (c.days > 0)
    return t('countdown.daysLeft', { days: c.days, hours: c.hours });
  if (c.hours > 0)
    return t('countdown.hoursLeft', { hours: c.hours, minutes: c.minutes });
  return t('countdown.minutesLeft', {
    minutes: c.minutes,
    seconds: c.seconds,
  });
}
