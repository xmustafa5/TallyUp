'use client';

import { Check, Circle, Loader2 } from 'lucide-react';

interface PrayerCardProps {
  name: string;
  completed: boolean;
  disabled: boolean;
  onToggle: () => void;
  isPending: boolean;
}

export function PrayerCard({ name, completed, disabled, onToggle, isPending }: PrayerCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || isPending}
      className={`flex w-full items-center justify-between rounded-lg border p-4 transition-colors ${
        completed
          ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20'
          : 'border-border bg-card hover:bg-muted/50'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span className="text-base font-medium">{name}</span>
      <div className="flex size-8 items-center justify-center">
        <Loader2
          className={`size-5 animate-spin text-muted-foreground ${isPending ? '' : 'hidden'}`}
        />
        {!isPending && completed && <Check className="size-5 text-green-600" />}
        {!isPending && !completed && <Circle className="size-5 text-muted-foreground" />}
      </div>
    </button>
  );
}
