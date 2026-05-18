'use client';

import { use, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRoomQuery } from '@/hooks/use-rooms';
import { useActivity } from '@/hooks/use-activity';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/shared/skeleton';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function RoomActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('activity');
  const tc = useTranslations('common');
  const [page, setPage] = useState(1);
  const { data: room, isLoading: roomLoading } = useRoomQuery(id);
  const cycleId = room?.currentCycle?.id;
  const { data, isLoading, isPlaceholderData } = useActivity(
    id,
    cycleId,
    page,
  );

  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <div className="mx-auto max-w-2xl space-y-3 p-6">
        {(roomLoading || (isLoading && !data)) && <SkeletonCard />}

        {!roomLoading && !cycleId && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('noActiveCycle')}
          </p>
        )}

        {cycleId && data?.items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('noCheckins')}
          </p>
        )}

        {data?.items.map((row) => (
          <Card key={row.id}>
            <CardContent className="flex items-center gap-3">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs">
                  {initials(row.user.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {row.user.displayName}{' '}
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {t('points', { count: row.points })}
                  </span>
                </p>
                {row.note && (
                  <p className="truncate text-xs text-muted-foreground">
                    {row.note}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {new Date(row.createdAt).toLocaleString()}
              </span>
            </CardContent>
          </Card>
        ))}

        {data && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isPlaceholderData}
            >
              <ChevronLeft className="me-1.5 size-4 rtl:rotate-180" />
              {tc('previous')}
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {tc('pageOf', { page, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages || isPlaceholderData}
            >
              {tc('next')}
              <ChevronRight className="ms-1.5 size-4 rtl:rotate-180" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
