'use client';

import { useEffect, useState } from 'react';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  label: string;
}

function compute(target: number): Countdown {
  const diff = target - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, label: 'Ended' };
  }
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const label =
    days > 0
      ? `${days}d ${hours}h left`
      : hours > 0
        ? `${hours}h ${minutes}m left`
        : `${minutes}m ${seconds}s left`;
  return { days, hours, minutes, seconds, isPast: false, label };
}

/** Live countdown to an ISO timestamp, recomputed every second. */
export function useCountdown(endsAtIso: string | null | undefined): Countdown {
  const [state, setState] = useState<Countdown>(() =>
    endsAtIso
      ? compute(new Date(endsAtIso).getTime())
      : { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, label: '' },
  );

  useEffect(() => {
    if (!endsAtIso) return;
    const target = new Date(endsAtIso).getTime();
    setState(compute(target));
    const t = setInterval(() => setState(compute(target)), 1000);
    return () => clearInterval(t);
  }, [endsAtIso]);

  return state;
}
