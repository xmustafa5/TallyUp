'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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
  const { data, isLoading } = useCycleHistory(id);

  return (
    <div>
      <PageHeader title="Cycle history" description="Past and current cycles" />
      <div className="mx-auto max-w-2xl space-y-3 p-6">
        {isLoading && <SkeletonCard />}
        {!isLoading && data?.items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No cycles yet.
          </p>
        )}
        {data?.items.map((c) => {
          const ended = c.status === 'ended';
          const inner = (
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cycle {c.cycleNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.startsAt).toLocaleDateString()} —{' '}
                    {new Date(c.endsAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ended ? 'secondary' : 'default'}>
                    {c.status}
                  </Badge>
                  {ended && (
                    <ChevronRight className="size-4 text-muted-foreground" />
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
