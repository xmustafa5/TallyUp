import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  useRoomQuery,
  useStartRoom,
  usePauseRoom,
  useResumeRoom,
} from '@/hooks/use-rooms';
import { useCurrentCycle, useAdvanceCycle } from '@/hooks/use-cycles';
import { useCreateCheckIn } from '@/hooks/use-checkin';
import { useAuth } from '@/hooks/use-auth';
import { useCountdown } from '@/hooks/use-countdown';
import { useCheckinQueue } from '@/stores/checkin-queue';
import { useI18n } from '@/hooks/use-i18n';
import { useCountdownLabel } from '@/hooks/use-countdown-label';
import { Leaderboard } from '@/components/ui/leaderboard';
import { ProgressBar } from '@/components/ui/progress-bar';
import { CheckinButton } from '@/components/ui/checkin-button';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, typography, radii, shadows } from '@/constants/theme';

const PRESETS = [1, 2, 3, 5];

export default function RoomOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t: tr } = useI18n();
  const t = colors.light;
  const { user } = useAuth();
  const { data: room, isLoading } = useRoomQuery(id);
  const { data: cycle } = useCurrentCycle(id);
  const start = useStartRoom();
  const pause = usePauseRoom();
  const resume = useResumeRoom();
  const advance = useAdvanceCycle(id);
  const checkIn = useCreateCheckIn(id, user?.id);
  const pendingCount = useCheckinQueue(
    (s) => s.pending.filter((p) => p.roomId === id).length,
  );
  const cd = useCountdown(room?.currentCycle?.endsAt);
  const cdLabel = useCountdownLabel(cd);

  if (isLoading || !room) {
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

  const isAdmin = room.myRole === 'admin';
  const me = cycle?.leaderboard.find((r) => r.userId === user?.id);
  const isActive = room.status === 'active';

  function doCheckIn(points: number) {
    checkIn.mutate(points, {
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? tr('room.couldNotRecordCheckin');
        Alert.alert(tr('room.checkinFailed'), msg);
      },
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <Stack.Screen
        options={{
          title: room.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <Pressable onPress={() => router.push(`/rooms/${id}/activity`)}>
                <Icon name="pulse-outline" size={22} tone="primary" />
              </Pressable>
              <Pressable onPress={() => router.push(`/rooms/${id}/history`)}>
                <Icon name="time-outline" size={22} tone="primary" />
              </Pressable>
              {isAdmin && (
                <Pressable
                  onPress={() => router.push(`/rooms/${id}/settings`)}
                >
                  <Icon name="settings-outline" size={22} tone="primary" />
                </Pressable>
              )}
            </View>
          ),
        }}
      />

      {/* Status row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          flexWrap: 'wrap',
        }}
      >
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: 4,
            borderRadius: radii.pill,
            backgroundColor: isActive ? t.primaryLight : t.surfaceAlt,
          }}
        >
          <Text
            style={[
              typography.caption,
              { color: isActive ? t.primary : t.textSecondary },
            ]}
          >
            {tr(
              `room.status${
                room.status.charAt(0).toUpperCase() + room.status.slice(1)
              }`,
            )}
          </Text>
        </View>
        {room.currentCycle && (
          <Text style={[typography.caption, { color: t.textSecondary }]}>
            {cdLabel}
          </Text>
        )}
        {pendingCount > 0 && (
          <Text style={[typography.caption, { color: t.warning }]}>
            {tr('room.pendingSync', { count: pendingCount })}
          </Text>
        )}
      </View>

      {/* Admin lifecycle */}
      {isAdmin && (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {room.status === 'draft' && (
            <Pressable
              onPress={() =>
                start.mutate(id, {
                  onError: (e: unknown) =>
                    Alert.alert(
                      tr('room.cannotStart'),
                      (e as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message ?? tr('room.error'),
                    ),
                })
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: t.primary,
                paddingHorizontal: spacing.lg,
                paddingVertical: 10,
                borderRadius: radii.md,
                borderCurve: 'continuous',
              }}
            >
              <Icon name="play" size={16} tone="inverse" />
              <Text style={[typography.label, { color: '#FFFFFF' }]}>
                {tr('room.startChallenge')}
              </Text>
            </Pressable>
          )}
          {room.status === 'active' && (
            <Pressable
              onPress={() => pause.mutate(id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: t.surfaceAlt,
                paddingHorizontal: spacing.lg,
                paddingVertical: 10,
                borderRadius: radii.md,
                borderCurve: 'continuous',
              }}
            >
              <Icon name="pause" size={16} tone="default" />
              <Text style={[typography.label, { color: t.text }]}>
                {tr('room.pause')}
              </Text>
            </Pressable>
          )}
          {room.status === 'paused' && (
            <Pressable
              onPress={() => resume.mutate(id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: t.primary,
                paddingHorizontal: spacing.lg,
                paddingVertical: 10,
                borderRadius: radii.md,
                borderCurve: 'continuous',
              }}
            >
              <Icon name="play" size={16} tone="inverse" />
              <Text style={[typography.label, { color: '#FFFFFF' }]}>
                {tr('room.resume')}
              </Text>
            </Pressable>
          )}
          {__DEV__ && cycle && isActive && (
            <Pressable
              onPress={() =>
                advance.mutate(cycle.id, {
                  onSuccess: () =>
                    Alert.alert(
                      tr('room.done'),
                      tr('room.cycleAdvanced'),
                    ),
                })
              }
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: 10,
              }}
            >
              <Text style={[typography.label, { color: t.textTertiary }]}>
                {tr('room.endCycleDev')}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* My progress */}
      {cycle && me && (
        <View
          style={[
            {
              backgroundColor: t.card,
              borderRadius: radii.lg,
              borderCurve: 'continuous',
              padding: spacing.xl,
              gap: spacing.lg,
            },
            shadows.sm,
          ]}
        >
          <Text style={[typography.label, { color: t.textSecondary }]}>
            {tr('room.yourProgress')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: spacing.sm,
            }}
          >
            <Text
              style={[
                typography.display,
                { color: t.text, fontVariant: ['tabular-nums'] },
              ]}
            >
              {me.points}
            </Text>
            <Text
              style={[
                typography.h3,
                {
                  color: t.textTertiary,
                  marginBottom: 6,
                  fontVariant: ['tabular-nums'],
                },
              ]}
            >
              / {me.target} · {me.percent}%
            </Text>
          </View>
          <ProgressBar percent={me.percent} />
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.md,
            }}
          >
            {PRESETS.map((p) => (
              <CheckinButton
                key={p}
                label={
                  p === 1
                    ? tr('room.checkin1Point')
                    : tr('room.checkinPlus', { points: p })
                }
                variant={p === 1 ? 'primary' : 'outline'}
                onPress={() => doCheckIn(p)}
                disabled={!isActive}
              />
            ))}
          </View>
          {!isActive && (
            <Text style={[typography.caption, { color: t.textTertiary }]}>
              {tr('room.checkinsDisabled', {
                status: tr(
                  `room.status${
                    room.status.charAt(0).toUpperCase() +
                    room.status.slice(1)
                  }`,
                ),
              })}
            </Text>
          )}
        </View>
      )}

      {/* Leaderboard */}
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
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Icon name="trophy" size={18} tone="primary" />
          <Text style={[typography.h3, { color: t.text }]}>
            {tr('room.leaderboard')}
          </Text>
        </View>
        {cycle ? (
          <Leaderboard
            rows={cycle.leaderboard}
            currentUserId={user?.id}
          />
        ) : (
          <Text
            style={[
              typography.body,
              {
                color: t.textTertiary,
                textAlign: 'center',
                paddingVertical: spacing.xl,
              },
            ]}
          >
            {room.status === 'draft'
              ? tr('room.startToSeeLeaderboard')
              : tr('room.noActiveCycle')}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
