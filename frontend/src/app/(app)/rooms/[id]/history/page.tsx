'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCycleHistory } from '@/hooks/use-cycles';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/shared/skeleton';

export default function RoomHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('historyPage');
  const { data, isLoading } = useCycleHistory(id);

  return (
    <div>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <div className="mx-auto max-w-2xl space-y-3 p-6">
        {isLoading && <SkeletonCard />}
        {!isLoading && data?.items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('noCycles')}
          </p>
        )}
        {data?.items.map((c) => {
          const ended = c.status === 'ended';
          const statusKey = `status${
            c.status.charAt(0).toUpperCase() + c.status.slice(1)
          }` as 'statusEnded' | 'statusActive' | 'statusUpcoming';
          const inner = (
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {t('cycleNumber', { number: c.cycleNumber })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.startsAt).toLocaleDateString()} —{' '}
                    {new Date(c.endsAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ended ? 'secondary' : 'default'}>
                    {t(statusKey)}
                  </Badge>
                  {ended && (
                    <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
          return ended ? (
            <Link key={c.id} href={`/results/${c.id}`}>
              {inner}
            </Link>
          ) : (
            <div key={c.id}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
