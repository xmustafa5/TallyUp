'use client';

import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRoomsQuery } from '@/hooks/use-rooms';
import { PageHeader } from '@/components/shared/page-header';
import { CycleCountdown } from '@/components/shared/cycle-countdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonCard } from '@/components/shared/skeleton';

const STATUS_KEY: Record<
  string,
  'statusDraft' | 'statusActive' | 'statusPaused' | 'statusArchived'
> = {
  draft: 'statusDraft',
  active: 'statusActive',
  paused: 'statusPaused',
  archived: 'statusArchived',
};

export default function HomePage() {
  const t = useTranslations('rooms');
  const { data: rooms, isLoading } = useRoomsQuery();

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={
          <Button render={<Link href="/rooms/new" />} size="sm">
            <Plus className="me-1.5 size-4" />
            {t('newRoom')}
          </Button>
        }
      />

      <div className="p-6">
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!isLoading && rooms?.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <div className="text-4xl">🎯</div>
            <h2 className="mt-3 text-lg font-semibold">{t('emptyTitle')}</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t('emptyDescription')}
            </p>
            <Button render={<Link href="/rooms/new" />} className="mt-4" size="sm">
              <Plus className="me-1.5 size-4" />
              {t('createRoom')}
            </Button>
          </div>
        )}

        {!isLoading && rooms && rooms.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Link key={room.id} href={`/rooms/${room.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{room.icon ?? '🎯'}</span>
                        <div>
                          <p className="font-semibold leading-tight">
                            {room.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {room.myRole === 'admin'
                              ? t('admin')
                              : t('member')}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          room.status === 'active' ? 'default' : 'secondary'
                        }
                      >
                        {STATUS_KEY[room.status]
                          ? t(STATUS_KEY[room.status])
                          : room.status}
                      </Badge>
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3" />
                        {t('memberCount', { count: room.memberCount })}
                      </span>
                      {room.currentCycle && (
                        <CycleCountdown endsAt={room.currentCycle.endsAt} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
