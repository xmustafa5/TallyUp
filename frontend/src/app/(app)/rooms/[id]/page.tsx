'use client';

import { use } from 'react';
import Link from 'next/link';
import { Settings, Play, Pause, Trophy, History } from 'lucide-react';
import { useRoomQuery, useStartRoom, useRoomLifecycle } from '@/hooks/use-rooms';
import { useCurrentCycle, useAdvanceCycle } from '@/hooks/use-cycles';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/shared/toast';
import { PageHeader } from '@/components/shared/page-header';
import { CycleCountdown } from '@/components/shared/cycle-countdown';
import { Leaderboard } from '@/components/shared/leaderboard';
import { CheckinControls } from '@/components/shared/checkin-controls';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SkeletonCard } from '@/components/shared/skeleton';

export default function RoomOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: room, isLoading } = useRoomQuery(id);
  const { data: cycle } = useCurrentCycle(id);
  const startRoom = useStartRoom();
  const { pause, resume } = useRoomLifecycle();
  const advance = useAdvanceCycle(id);

  if (isLoading || !room) {
    return (
      <div className="p-6">
        <SkeletonCard />
      </div>
    );
  }

  const isAdmin = room.myRole === 'admin';
  const me = cycle?.leaderboard.find((r) => r.userId === user?.id);
  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div>
      <PageHeader
        title={`${room.icon ?? '🎯'} ${room.name}`}
        description={room.description ?? undefined}
        action={
          <div className="flex items-center gap-2">
            {room.currentCycle && (
              <CycleCountdown endsAt={room.currentCycle.endsAt} />
            )}
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/rooms/${id}/history`} />}
            >
              <History className="mr-1.5 size-4" />
              History
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/rooms/${id}/settings`} />}
              >
                <Settings className="mr-1.5 size-4" />
                Settings
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-6 p-6">
        {/* Status / lifecycle */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={room.status === 'active' ? 'default' : 'secondary'}>
            {room.status}
          </Badge>
          {room.stake && (
            <span className="text-sm text-muted-foreground">
              Stake: {room.stake}
            </span>
          )}
          {isAdmin && room.status === 'draft' && (
            <Button
              size="sm"
              onClick={() =>
                startRoom.mutate(id, {
                  onError: (e: unknown) =>
                    toast({
                      type: 'error',
                      message:
                        (e as { response?: { data?: { message?: string } } })
                          ?.response?.data?.message ?? 'Could not start',
                    }),
                })
              }
              disabled={startRoom.isPending}
            >
              <Play className="mr-1.5 size-4" />
              Start challenge
            </Button>
          )}
          {isAdmin && room.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => pause.mutate(id)}
              disabled={pause.isPending}
            >
              <Pause className="mr-1.5 size-4" />
              Pause
            </Button>
          )}
          {isAdmin && room.status === 'paused' && (
            <Button
              size="sm"
              onClick={() => resume.mutate(id)}
              disabled={resume.isPending}
            >
              <Play className="mr-1.5 size-4" />
              Resume
            </Button>
          )}
          {isAdmin && isDev && cycle && room.status === 'active' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                advance.mutate(cycle.id, {
                  onSuccess: () =>
                    toast({ type: 'success', message: 'Cycle advanced' }),
                })
              }
              disabled={advance.isPending}
            >
              ⏩ End cycle now (dev)
            </Button>
          )}
        </div>

        {/* My progress */}
        {cycle && me && (
          <Card>
            <CardHeader>
              <CardTitle>Your progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold tabular-nums">
                    {me.points}
                    <span className="text-lg text-muted-foreground">
                      {' '}
                      / {me.target}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {me.percent}% of your target
                  </p>
                </div>
              </div>
              <Progress value={me.percent} />
              <CheckinControls
                roomId={id}
                myUserId={user?.id}
                disabled={room.status !== 'active'}
              />
              {room.status !== 'active' && (
                <p className="text-xs text-muted-foreground">
                  Check-ins are disabled while the room is {room.status}.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cycle ? (
              <Leaderboard
                rows={cycle.leaderboard}
                currentUserId={user?.id}
              />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {room.status === 'draft'
                  ? 'Start the challenge to see the leaderboard.'
                  : 'No active cycle.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
