'use client';

import { use } from 'react';
import Link from 'next/link';
import { Trophy, Frown, ArrowLeft } from 'lucide-react';
import { useCycle } from '@/hooks/use-cycles';
import { PageHeader } from '@/components/shared/page-header';
import { Leaderboard } from '@/components/shared/leaderboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonCard } from '@/components/shared/skeleton';

export default function ResultsPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = use(params);
  const { data: cycle, isLoading } = useCycle(cycleId);

  if (isLoading || !cycle) {
    return (
      <div className="p-6">
        <SkeletonCard />
      </div>
    );
  }

  const result = cycle.resultJson;
  const nameOf = (userId: string) =>
    cycle.leaderboard.find((r) => r.userId === userId)?.displayName ?? 'Someone';

  return (
    <div>
      <PageHeader
        title={`Cycle ${cycle.cycleNumber} results`}
        action={
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/rooms/${cycle.roomId}`} />}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Back to room
          </Button>
        }
      />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {!result && (
          <p className="text-sm text-muted-foreground">
            This cycle has not ended yet.
          </p>
        )}

        {result && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-600">
                    <Trophy className="size-4" />
                    {result.winners.length > 1 ? 'Winners' : 'Winner'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.winners.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No winner</p>
                  ) : (
                    <ul className="space-y-1">
                      {result.winners.map((w) => (
                        <li key={w.userId} className="text-sm font-medium">
                          {nameOf(w.userId)}{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            — {w.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Frown className="size-4" />
                    {result.losers.length > 1 ? 'Losers' : 'Loser'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.losers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No loser</p>
                  ) : (
                    <ul className="space-y-1">
                      {result.losers.map((l) => (
                        <li key={l.userId} className="text-sm font-medium">
                          {nameOf(l.userId)}{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            — {l.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {result.loserSkippedDueToOverlap && (
              <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Note: the loser rule was skipped because it overlapped with the
                winners.
              </p>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Final standings</CardTitle>
              </CardHeader>
              <CardContent>
                <Leaderboard rows={cycle.leaderboard} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
