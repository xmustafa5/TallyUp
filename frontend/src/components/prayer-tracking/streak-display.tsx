'use client';

import { Flame, Trophy } from 'lucide-react';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  return (
    <div className="flex items-center gap-6 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <Flame className="size-5 text-orange-500" />
        <div>
          <p className="text-2xl font-bold">{currentStreak}</p>
          <p className="text-xs text-muted-foreground">Current streak</p>
        </div>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex items-center gap-2">
        <Trophy className="size-5 text-yellow-500" />
        <div>
          <p className="text-2xl font-bold">{longestStreak}</p>
          <p className="text-xs text-muted-foreground">Best streak</p>
        </div>
      </div>
    </div>
  );
}
