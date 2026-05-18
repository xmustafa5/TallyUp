'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Frown,
  ArrowLeft,
  AlertTriangle,
  Share2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCycle } from '@/hooks/use-cycles';
import { useRoomQuery } from '@/hooks/use-rooms';
import { useTieBreak } from '@/hooks/use-tie-break';
import { useToast } from '@/components/shared/toast';
import { PageHeader } from '@/components/shared/page-header';
import { Leaderboard } from '@/components/shared/leaderboard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonCard } from '@/components/shared/skeleton';

/** Which side of the result a tie sits on. */
function tiedSide(kind: string): 'winners' | 'losers' {
  return kind === 'loser_boundary' || kind === 'lowest_tie'
    ? 'losers'
    : 'winners';
}

function TieBreakBanner({
  cycleId,
  tiedUserIds,
  kind,
  nameOf,
}: {
  cycleId: string;
  tiedUserIds: string[];
  kind: string;
  nameOf: (userId: string) => string;
}) {
  const t = useTranslations('results');
  const { toast } = useToast();
  const tieBreak = useTieBreak(cycleId);
  const side = tiedSide(kind);
  const [manual, setManual] = useState(false);
  const [kept, setKept] = useState<Record<string, boolean>>({});

  const keptIds = tiedUserIds.filter((id) => kept[id]);

  function onError(e: unknown) {
    toast({
      type: 'error',
      message:
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? t('couldNotResolveTie'),
    });
  }

  function includeAll() {
    tieBreak.mutate(
      { pick: 'include_all' },
      {
        onSuccess: () =>
          toast({ type: 'success', message: t('tieResolvedAllIncluded') }),
        onError,
      },
    );
  }

  function saveManual() {
    tieBreak.mutate(
      side === 'winners'
        ? { pick: 'manual', winners: keptIds }
        : { pick: 'manual', losers: keptIds },
      {
        onSuccess: () =>
          toast({ type: 'success', message: t('tieResolved') }),
        onError,
      },
    );
  }

  return (
    <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-4" />
          {t('tieBreakNeeded')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {t('tiedOnBoundary', {
            count: tiedUserIds.length,
            side: side === 'winners' ? t('sideWinning') : t('sideLosing'),
          })}
        </p>
        <ul className="space-y-1 text-sm font-medium">
          {tiedUserIds.map((id) => (
            <li key={id}>{nameOf(id)}</li>
          ))}
        </ul>

        {!manual ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={includeAll}
              disabled={tieBreak.isPending}
            >
              {t('includeAllTied')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setManual(true)}
              disabled={tieBreak.isPending}
            >
              {t('chooseManually')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              {t('selectWhoStays', {
                role:
                  side === 'winners' ? t('roleWinner') : t('roleLoser'),
              })}
            </p>
            <div className="space-y-2">
              {tiedUserIds.map((id) => (
                <label
                  key={id}
                  className="flex items-center gap-2 text-sm"
                  htmlFor={`tie-${id}`}
                >
                  <Checkbox
                    id={`tie-${id}`}
                    checked={!!kept[id]}
                    onCheckedChange={(checked) =>
                      setKept((prev) => ({ ...prev, [id]: checked }))
                    }
                  />
                  {nameOf(id)}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={saveManual}
                disabled={tieBreak.isPending}
              >
                {t('save')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setManual(false)}
                disabled={tieBreak.isPending}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ShareResults({
  cycleId,
  roomName,
}: {
  cycleId: string;
  roomName: string;
}) {
  const t = useTranslations('results');
  const { toast } = useToast();

  function buildShare() {
    const url = `${window.location.origin}/results/${cycleId}`;
    const title = t('shareTitle', { room: roomName });
    const text = t('shareText', { room: roomName });
    return { url, title, text };
  }

  async function onShare() {
    const { url, title, text } = buildShare();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        // User cancelled the native share sheet -- not an error.
        if ((e as { name?: string })?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ type: 'success', message: t('linkCopied') });
    } catch {
      toast({ type: 'error', message: t('couldNotShare') });
    }
  }

  const { url, text } = (() => {
    if (typeof window === 'undefined') {
      return { url: '', text: t('shareText', { room: roomName }) };
    }
    return buildShare();
  })();

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${text} ${url}`,
  )}`;
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={onShare}>
        <Share2 className="me-1.5 size-4" />
        {t('share')}
      </Button>
      <span className="text-xs text-muted-foreground">{t('shareVia')}</span>
      <Button
        size="sm"
        variant="ghost"
        render={
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" />
        }
      >
        {t('shareWhatsApp')}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        render={
          <a href={twitterHref} target="_blank" rel="noopener noreferrer" />
        }
      >
        {t('shareTwitter')}
      </Button>
    </div>
  );
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = use(params);
  const t = useTranslations('results');
  const { data: cycle, isLoading } = useCycle(cycleId);
  const { data: room } = useRoomQuery(cycle?.roomId ?? '');

  const someone = t('someone');
  const nameOf = useMemo(() => {
    const board = cycle?.leaderboard ?? [];
    return (userId: string) =>
      board.find((r) => r.userId === userId)?.displayName ?? someone;
  }, [cycle?.leaderboard, someone]);

  if (isLoading || !cycle) {
    return (
      <div className="p-6">
        <SkeletonCard />
      </div>
    );
  }

  const result = cycle.resultJson;
  const isAdmin = room?.myRole === 'admin';
  const tieBreakRequired = result?.tieBreakRequired;

  return (
    <div>
      <PageHeader
        title={t('cycleResults', { number: cycle.cycleNumber })}
        action={
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/rooms/${cycle.roomId}`} />}
          >
            <ArrowLeft className="me-1.5 size-4 rtl:rotate-180" />
            {t('backToRoom')}
          </Button>
        }
      />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {!result && (
          <p className="text-sm text-muted-foreground">
            {t('notEndedYet')}
          </p>
        )}

        {result && (
          <>
            {tieBreakRequired && isAdmin && (
              <TieBreakBanner
                cycleId={cycle.id}
                tiedUserIds={tieBreakRequired.tiedUserIds}
                kind={tieBreakRequired.kind}
                nameOf={nameOf}
              />
            )}
            {tieBreakRequired && !isAdmin && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {t('tieBreakPending')}
              </p>
            )}

            <ShareResults
              cycleId={cycle.id}
              roomName={room?.name ?? t('someone')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-600">
                    <Trophy className="size-4" />
                    {result.winners.length > 1 ? t('winners') : t('winner')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.winners.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('noWinner')}
                    </p>
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
                    {result.losers.length > 1 ? t('losers') : t('loser')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.losers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('noLoser')}
                    </p>
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
                {t('loserSkipped')}
              </p>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t('finalStandings')}</CardTitle>
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
