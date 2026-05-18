'use client';

import { Crown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { LeaderboardRow } from '@/types/tallyup';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Leaderboard({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[];
  currentUserId?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No members scored yet.
      </p>
    );
  }

  const topPercent = Math.max(...rows.map((r) => r.percent));

  return (
    <div className="divide-y">
      {rows.map((row, i) => {
        const isMe = row.userId === currentUserId;
        const isLeader = row.percent === topPercent && topPercent > 0;
        const reached = row.percent >= 100;
        return (
          <div
            key={row.userId}
            className={cn(
              'flex items-center gap-3 px-3 py-3',
              isMe && 'rounded-md bg-muted/50',
            )}
          >
            <span className="w-5 shrink-0 text-center text-sm font-medium text-muted-foreground tabular-nums">
              {i + 1}
            </span>
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs">
                {initials(row.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">
                  {row.displayName}
                  {isMe && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (you)
                    </span>
                  )}
                </span>
                {isLeader && (
                  <Crown className="size-3.5 shrink-0 text-amber-500" />
                )}
                {reached && (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                )}
                {!reached && row.percent < 25 && (
                  <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                )}
              </div>
              <Progress value={row.percent} className="mt-1.5" />
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums">
                {row.points}
                <span className="text-muted-foreground">/{row.target}</span>
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {row.percent}%
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
