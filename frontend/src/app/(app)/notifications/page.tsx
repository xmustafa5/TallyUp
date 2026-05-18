'use client';

import { useEffect } from 'react';
import { Mail, Check, X } from 'lucide-react';
import { useNotifications, useMarkRead } from '@/hooks/use-notifications';
import { useIncomingInvitations, useInvitationActions } from '@/hooks/use-invitations';
import { useToast } from '@/components/shared/toast';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonCard } from '@/components/shared/skeleton';

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const { data: invites } = useIncomingInvitations();
  const markRead = useMarkRead();
  const { accept, reject } = useInvitationActions();
  const { toast } = useToast();

  // Mark all read on view (PRD: notifications inbox).
  useEffect(() => {
    const hasUnread = notifications?.items.some((n) => !n.readAt);
    if (hasUnread) markRead.mutate('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications?.items.length]);

  return (
    <div>
      <PageHeader title="Notifications" />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {invites && invites.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Pending invitations</h2>
            {invites.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">
                        {inv.from.displayName}
                      </span>{' '}
                      invited you to{' '}
                      <span className="font-medium">{inv.roomName}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        accept.mutate(inv.id, {
                          onSuccess: () =>
                            toast({ type: 'success', message: 'Joined room' }),
                        })
                      }
                      disabled={accept.isPending}
                    >
                      <Check className="mr-1 size-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reject.mutate(inv.id)}
                      disabled={reject.isPending}
                    >
                      <X className="mr-1 size-4" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Activity</h2>
          {isLoading && <SkeletonCard />}
          {!isLoading &&
            notifications?.items.length === 0 &&
            (!invites || invites.length === 0) && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing here yet.
              </p>
            )}
          {notifications?.items.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm">
                    {(n.payload.roomName as string) ?? 'TallyUp'} —{' '}
                    {n.type.replaceAll('_', ' ')}
                    {n.payload.outcome ? ` (${n.payload.outcome})` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
