'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2, Archive } from 'lucide-react';
import { useRoomQuery, usePatchMember, useRoomLifecycle } from '@/hooks/use-rooms';
import { useSendInvitation } from '@/hooks/use-invitations';
import { roomsService } from '@/services/rooms';
import { useToast } from '@/components/shared/toast';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonCard } from '@/components/shared/skeleton';

function errMsg(e: unknown, fallback: string) {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  );
}

export default function RoomSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { data: room, isLoading, refetch } = useRoomQuery(id);
  const sendInvite = useSendInvitation(id);
  const patchMember = usePatchMember(id);
  const { archive } = useRoomLifecycle();
  const [publicId, setPublicId] = useState('');
  const [targets, setTargets] = useState<Record<string, string>>({});

  if (isLoading || !room) {
    return (
      <div className="p-6">
        <SkeletonCard />
      </div>
    );
  }

  if (room.myRole !== 'admin') {
    return (
      <div className="p-6">
        <PageHeader title="Settings" />
        <p className="p-6 text-sm text-muted-foreground">
          Only the room admin can manage settings.
        </p>
      </div>
    );
  }

  function invite() {
    if (!publicId.trim()) return;
    sendInvite.mutate(publicId.trim().toUpperCase(), {
      onSuccess: () => {
        toast({ type: 'success', message: 'Invitation sent' });
        setPublicId('');
      },
      onError: (e) => toast({ type: 'error', message: errMsg(e, 'Invite failed') }),
    });
  }

  function saveTarget(userId: string) {
    const val = Number(targets[userId]);
    if (!Number.isInteger(val) || val < 1) {
      toast({ type: 'error', message: 'Target must be a positive integer' });
      return;
    }
    patchMember.mutate(
      { userId, body: { target: val } },
      {
        onSuccess: () => toast({ type: 'success', message: 'Target updated' }),
        onError: (e) =>
          toast({ type: 'error', message: errMsg(e, 'Update failed') }),
      },
    );
  }

  async function transfer(userId: string) {
    try {
      await roomsService.transferAdmin(id, userId);
      toast({ type: 'success', message: 'Admin transferred' });
      refetch();
    } catch (e) {
      toast({ type: 'error', message: errMsg(e, 'Transfer failed') });
    }
  }

  const activeMembers = room.members.filter((m) => !m.leftAt);

  return (
    <div>
      <PageHeader title={`${room.icon ?? '🎯'} ${room.name} — Settings`} />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Invite a member</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="publicId">User ID</Label>
              <Input
                id="publicId"
                placeholder="ALI-2941"
                value={publicId}
                onChange={(e) => setPublicId(e.target.value)}
              />
            </div>
            <Button onClick={invite} disabled={sendInvite.isPending}>
              <Loader2
                className={`mr-2 size-4 animate-spin ${sendInvite.isPending ? '' : 'hidden'}`}
              />
              <UserPlus
                className={`mr-1.5 size-4 ${sendInvite.isPending ? 'hidden' : ''}`}
              />
              Invite
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members & targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeMembers.map((m) => (
              <div
                key={m.user.id}
                className="flex items-center gap-3 border-b pb-3 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.user.displayName}
                    {m.role === 'admin' && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        (admin)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.user.publicId}
                    {m.joinedLate && ' · joined late'}
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  defaultValue={m.target}
                  onChange={(e) =>
                    setTargets((t) => ({ ...t, [m.user.id]: e.target.value }))
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveTarget(m.user.id)}
                  disabled={patchMember.isPending}
                >
                  Save
                </Button>
                {m.role !== 'admin' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => transfer(m.user.id)}
                  >
                    Make admin
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                archive.mutate(id, {
                  onSuccess: () => {
                    toast({ type: 'success', message: 'Room archived' });
                    router.push('/');
                  },
                })
              }
              disabled={archive.isPending}
            >
              <Archive className="mr-1.5 size-4" />
              Archive room
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
