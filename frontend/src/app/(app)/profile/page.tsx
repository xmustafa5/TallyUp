'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, LogOut, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { useMyHistory } from '@/hooks/use-history';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonCard } from '@/components/shared/skeleton';

const outcomeVariant: Record<
  'won' | 'lost' | 'participated',
  'default' | 'destructive' | 'secondary'
> = {
  won: 'default',
  lost: 'destructive',
  participated: 'secondary',
};

const outcomeKey: Record<
  'won' | 'lost' | 'participated',
  'outcomeWon' | 'outcomeLost' | 'outcomeParticipated'
> = {
  won: 'outcomeWon',
  lost: 'outcomeLost',
  participated: 'outcomeParticipated',
};

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, logout } = useAuth();
  const { data: history, isLoading: historyLoading } = useMyHistory();
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <div className="p-6">
        <SkeletonCard />
      </div>
    );
  }

  function copyId() {
    if (!user) return;
    void navigator.clipboard.writeText(user.publicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <PageHeader title={t('title')} />
      <div className="mx-auto max-w-xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>{user.displayName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {t('yourUserId')}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">
                  {user.publicId}
                </code>
                <Button size="sm" variant="outline" onClick={copyId}>
                  <Check
                    className={`me-1.5 size-4 ${copied ? '' : 'hidden'}`}
                  />
                  <Copy
                    className={`me-1.5 size-4 ${copied ? 'hidden' : ''}`}
                  />
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t('shareWithFriends')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t('email')}</p>
                <p>{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('timezone')}
                </p>
                <p>{user.timezone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('yourStats')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {historyLoading && !history ? (
              <p className="text-sm text-muted-foreground">
                {t('loading')}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {history?.participations ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('cycles')}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-emerald-600">
                      {history?.wins ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('wins')}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-destructive">
                      {history?.losses ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('losses')}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {history?.avgPercent ?? 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('avg')}
                    </p>
                  </div>
                </div>

                {history && history.recent.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {t('recentCycles')}
                    </p>
                    <div className="divide-y rounded-md border">
                      {history.recent.map((r) => (
                        <Link
                          key={r.cycleId}
                          href={`/results/${r.cycleId}`}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {r.roomName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('cycleDate', {
                                number: r.cycleNumber,
                                date: new Date(
                                  r.endsAt,
                                ).toLocaleDateString(),
                              })}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant={outcomeVariant[r.outcome]}>
                              {t(outcomeKey[r.outcome])}
                            </Badge>
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {history && history.recent.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t('noFinishedCycles')}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => logout()}>
          <LogOut className="me-1.5 size-4" />
          {t('logOut')}
        </Button>
      </div>
    </div>
  );
}
