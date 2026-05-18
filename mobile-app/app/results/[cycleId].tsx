import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useCycle, useTieBreak } from '@/hooks/use-cycles';
import { useRoomQuery } from '@/hooks/use-rooms';
import { useI18n } from '@/hooks/use-i18n';
import { Leaderboard } from '@/components/ui/leaderboard';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, typography, radii, shadows } from '@/constants/theme';
import type { CycleResult } from '@/types/tallyup';

/**
 * The side a pending tie-break affects: highest/winner ties resolve into
 * the winners list, lowest/loser ties into the losers list.
 */
function affectedSide(
  tb: NonNullable<CycleResult['tieBreakRequired']>,
): 'winners' | 'losers' {
  return tb.kind === 'winner_boundary' || tb.kind === 'highest_tie'
    ? 'winners'
    : 'losers';
}

export default function ResultsScreen() {
  const { cycleId } = useLocalSearchParams<{ cycleId: string }>();
  const { t: tr } = useI18n();
  const t = colors.light;
  const { data: cycle, isLoading } = useCycle(cycleId);
  const { data: room } = useRoomQuery(cycle?.roomId ?? '');
  const tieBreak = useTieBreak(cycleId);
  const [manual, setManual] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  if (isLoading || !cycle) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  const result = cycle.resultJson;
  const nameOf = (userId: string) =>
    cycle.leaderboard.find((r) => r.userId === userId)?.displayName ??
    tr('results.someone');

  const tb = result?.tieBreakRequired;
  const isAdmin = room?.myRole === 'admin';
  const showTieBreak = !!tb && isAdmin;
  const side = tb ? affectedSide(tb) : 'winners';

  function toggle(userId: string) {
    setPicked((p) =>
      p.includes(userId) ? p.filter((id) => id !== userId) : [...p, userId],
    );
  }

  async function shareResults() {
    const roomName = room?.name ?? tr('results.shareFallbackRoom');
    await Share.share({
      message: tr('results.shareText', { room: roomName }),
      url: `app://results/${cycleId}`,
    });
  }

  function resolve(includeAll: boolean) {
    if (!includeAll && picked.length === 0) {
      Alert.alert(
        tr('results.pickAtLeastOne'),
        tr('results.selectWhoStays'),
      );
      return;
    }
    const body = includeAll
      ? ({ pick: 'include_all' } as const)
      : side === 'winners'
        ? ({ pick: 'manual', winners: picked } as const)
        : ({ pick: 'manual', losers: picked } as const);
    tieBreak.mutate(body, {
      onSuccess: () => {
        setManual(false);
        setPicked([]);
        Alert.alert(
          tr('results.resolved'),
          tr('results.tieBreakApplied'),
        );
      },
      onError: (e: unknown) =>
        Alert.alert(
          tr('results.error'),
          (e as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? tr('results.couldNotResolveTie'),
        ),
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <Text style={[typography.h2, { color: t.text }]}>
        {tr('results.cycleResults', { number: cycle.cycleNumber })}
      </Text>

      {!result && (
        <Text style={[typography.body, { color: t.textSecondary }]}>
          {tr('results.notEndedYet')}
        </Text>
      )}

      {result && (
        <>
          {showTieBreak && tb && (
            <View
              style={[
                {
                  backgroundColor: t.card,
                  borderRadius: radii.lg,
                  borderCurve: 'continuous',
                  borderWidth: 1.5,
                  borderColor: t.accent,
                  padding: spacing.lg,
                  gap: spacing.md,
                },
                shadows.sm,
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name="git-compare-outline" size={18} tone="primary" />
                <Text style={[typography.h3, { color: t.text }]}>
                  {tr('results.tieBreakNeeded')}
                </Text>
              </View>
              <Text
                style={[typography.body, { color: t.textSecondary }]}
              >
                {tr('results.tiedExplanation', {
                  side:
                    side === 'winners'
                      ? tr('results.sideWinner')
                      : tr('results.sideLoser'),
                })}
              </Text>

              {!manual ? (
                <>
                  {tb.tiedUserIds.map((id) => (
                    <Text
                      key={id}
                      style={[typography.body, { color: t.text }]}
                    >
                      {nameOf(id)}
                    </Text>
                  ))}
                  <View style={{ gap: spacing.sm }}>
                    <Button
                      title={tr('results.includeAllTied')}
                      onPress={() => resolve(true)}
                      loading={tieBreak.isPending}
                      fullWidth
                    />
                    <Button
                      title={tr('results.pickManually')}
                      variant="secondary"
                      onPress={() => setManual(true)}
                      fullWidth
                    />
                  </View>
                </>
              ) : (
                <>
                  {tb.tiedUserIds.map((id) => {
                    const on = picked.includes(id);
                    return (
                      <Pressable
                        key={id}
                        onPress={() => toggle(id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.md,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                          borderRadius: radii.md,
                          borderCurve: 'continuous',
                          backgroundColor: on
                            ? t.primaryLight
                            : t.surfaceAlt,
                        }}
                      >
                        <Icon
                          name={
                            on
                              ? 'checkmark-circle'
                              : 'ellipse-outline'
                          }
                          size={20}
                          tone={on ? 'primary' : 'muted'}
                        />
                        <Text
                          style={[typography.body, { color: t.text }]}
                        >
                          {nameOf(id)}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <View style={{ gap: spacing.sm }}>
                    <Button
                      title={tr('results.save')}
                      onPress={() => resolve(false)}
                      loading={tieBreak.isPending}
                      fullWidth
                    />
                    <Button
                      title={tr('results.cancel')}
                      variant="secondary"
                      onPress={() => {
                        setManual(false);
                        setPicked([]);
                      }}
                      fullWidth
                    />
                  </View>
                </>
              )}
            </View>
          )}

          <View
            style={[
              {
                backgroundColor: t.card,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                padding: spacing.lg,
                gap: spacing.sm,
              },
              shadows.sm,
            ]}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="trophy" size={18} tone="success" />
              <Text style={[typography.h3, { color: t.success }]}>
                {result.winners.length > 1
                  ? tr('results.winners')
                  : tr('results.winner')}
              </Text>
            </View>
            {result.winners.length === 0 ? (
              <Text style={[typography.body, { color: t.textTertiary }]}>
                {tr('results.noWinner')}
              </Text>
            ) : (
              result.winners.map((w) => (
                <Text
                  key={w.userId}
                  style={[typography.body, { color: t.text }]}
                >
                  {nameOf(w.userId)}{' '}
                  <Text style={{ color: t.textTertiary }}>
                    — {w.reason}
                  </Text>
                </Text>
              ))
            )}
          </View>

          <View
            style={[
              {
                backgroundColor: t.card,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                padding: spacing.lg,
                gap: spacing.sm,
              },
              shadows.sm,
            ]}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="sad-outline" size={18} tone="danger" />
              <Text style={[typography.h3, { color: t.error }]}>
                {result.losers.length > 1
                  ? tr('results.losers')
                  : tr('results.loser')}
              </Text>
            </View>
            {result.losers.length === 0 ? (
              <Text style={[typography.body, { color: t.textTertiary }]}>
                {tr('results.noLoser')}
              </Text>
            ) : (
              result.losers.map((l) => (
                <Text
                  key={l.userId}
                  style={[typography.body, { color: t.text }]}
                >
                  {nameOf(l.userId)}{' '}
                  <Text style={{ color: t.textTertiary }}>
                    — {l.reason}
                  </Text>
                </Text>
              ))
            )}
          </View>

          {result.loserSkippedDueToOverlap && (
            <Text
              style={[
                typography.caption,
                {
                  color: t.textTertiary,
                  backgroundColor: t.surfaceAlt,
                  padding: spacing.md,
                  borderRadius: radii.md,
                  borderCurve: 'continuous',
                },
              ]}
            >
              {tr('results.loserSkipped')}
            </Text>
          )}

          <View
            style={[
              {
                backgroundColor: t.card,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                padding: spacing.lg,
                gap: spacing.md,
              },
              shadows.sm,
            ]}
          >
            <Text style={[typography.h3, { color: t.text }]}>
              {tr('results.finalStandings')}
            </Text>
            <Leaderboard rows={cycle.leaderboard} />
          </View>

          <Button
            title={tr('results.share')}
            variant="secondary"
            onPress={shareResults}
            fullWidth
          />
        </>
      )}
    </ScrollView>
  );
}
