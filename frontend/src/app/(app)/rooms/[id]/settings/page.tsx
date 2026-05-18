'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2, Archive } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('settings');
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
        <PageHeader title={t('title')} />
        <p className="p-6 text-sm text-muted-foreground">
          {t('onlyAdmin')}
        </p>
      </div>
    );
  }

  function invite() {
    if (!publicId.trim()) return;
    sendInvite.mutate(publicId.trim().toUpperCase(), {
      onSuccess: () => {
        toast({ type: 'success', message: t('invitationSent') });
        setPublicId('');
      },
      onError: (e) =>
        toast({ type: 'error', message: errMsg(e, t('inviteFailed')) }),
    });
  }

  function saveTarget(userId: string) {
    const val = Number(targets[userId]);
    if (!Number.isInteger(val) || val < 1) {
      toast({ type: 'error', message: t('targetPositive') });
      return;
    }
    patchMember.mutate(
      { userId, body: { target: val } },
      {
        onSuccess: () => toast({ type: 'success', message: t('targetUpdated') }),
        onError: (e) =>
          toast({ type: 'error', message: errMsg(e, t('updateFailed')) }),
      },
    );
  }

  async function transfer(userId: string) {
    try {
      await roomsService.transferAdmin(id, userId);
      toast({ type: 'success', message: t('adminTransferred') });
      refetch();
    } catch (e) {
      toast({ type: 'error', message: errMsg(e, t('transferFailed')) });
    }
  }

  const activeMembers = room.members.filter((m) => !m.leftAt);

  return (
    <div>
      <PageHeader
        title={t('roomSettingsTitle', {
          icon: room.icon ?? '🎯',
          name: room.name,
        })}
      />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('inviteMember')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="publicId">{t('userId')}</Label>
              <Input
                id="publicId"
                placeholder="ALI-2941"
                value={publicId}
                onChange={(e) => setPublicId(e.target.value)}
              />
            </div>
            <Button onClick={invite} disabled={sendInvite.isPending}>
              <Loader2
                className={`me-2 size-4 animate-spin ${sendInvite.isPending ? '' : 'hidden'}`}
              />
              <UserPlus
                className={`me-1.5 size-4 ${sendInvite.isPending ? 'hidden' : ''}`}
              />
              {t('invite')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('membersAndTargets')}</CardTitle>
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
                      <span className="ms-1.5 text-xs text-muted-foreground">
                        {t('adminTag')}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.user.publicId}
                    {m.joinedLate && ` · ${t('joinedLate')}`}
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
                  {t('save')}
                </Button>
                {m.role !== 'admin' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => transfer(m.user.id)}
                  >
                    {t('makeAdmin')}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dangerZone')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                archive.mutate(id, {
                  onSuccess: () => {
                    toast({ type: 'success', message: t('roomArchived') });
                    router.push('/');
                  },
                })
              }
              disabled={archive.isPending}
            >
              <Archive className="me-1.5 size-4" />
              {t('archiveRoom')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
