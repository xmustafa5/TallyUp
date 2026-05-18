import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useRoomsQuery } from '@/hooks/use-rooms';
import { useCountdown } from '@/hooks/use-countdown';
import { useCountdownLabel } from '@/hooks/use-countdown-label';
import { useI18n } from '@/hooks/use-i18n';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, typography, radii, shadows } from '@/constants/theme';
import type { RoomListItem } from '@/types/tallyup';

function RoomCard({ room, onPress }: { room: RoomListItem; onPress: () => void }) {
  const t = colors.light;
  const { t: tr } = useI18n();
  const cd = useCountdown(room.currentCycle?.endsAt);
  const cdLabel = useCountdownLabel(cd);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: t.card,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          padding: spacing.lg,
          gap: spacing.md,
          opacity: pressed ? 0.9 : 1,
        },
        shadows.sm,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            flex: 1,
          }}
        >
          <Text style={{ fontSize: 28 }}>{room.icon ?? '🎯'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h3, { color: t.text }]} numberOfLines={1}>
              {room.name}
            </Text>
            <Text style={[typography.caption, { color: t.textTertiary }]}>
              {tr('rooms.roleAndMembers', {
                role:
                  room.myRole === 'admin'
                    ? tr('rooms.admin')
                    : tr('rooms.member'),
                members: tr('rooms.memberCount', {
                  count: room.memberCount,
                }),
              })}
            </Text>
          </View>
        </View>
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: 4,
            borderRadius: radii.pill,
            backgroundColor:
              room.status === 'active' ? t.primaryLight : t.surfaceAlt,
          }}
        >
          <Text
            style={[
              typography.caption,
              {
                color:
                  room.status === 'active' ? t.primary : t.textSecondary,
              },
            ]}
          >
            {tr(
              `rooms.status${
                room.status.charAt(0).toUpperCase() + room.status.slice(1)
              }`,
            )}
          </Text>
        </View>
      </View>
      {room.currentCycle && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Icon name="time-outline" size={14} tone="muted" />
          <Text style={[typography.caption, { color: t.textSecondary }]}>
            {cdLabel}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function RoomsScreen() {
  const router = useRouter();
  const { t: tr } = useI18n();
  const t = colors.light;
  const { data: rooms, isLoading, refetch, isRefetching } = useRoomsQuery();

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <FlatList
        data={rooms ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={t.primary}
          />
        }
        ListHeaderComponent={
          <Pressable
            onPress={() => router.push('/rooms/new')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: t.primary,
              paddingVertical: 14,
              borderRadius: radii.lg,
              borderCurve: 'continuous',
              marginBottom: spacing.md,
            }}
          >
            <Icon name="add" size={20} tone="inverse" />
            <Text
              style={[
                typography.bodyLg,
                { color: '#FFFFFF', fontWeight: '700' },
              ]}
            >
              {tr('rooms.newRoom')}
            </Text>
          </Pressable>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View
              style={{ alignItems: 'center', paddingVertical: spacing['4xl'] }}
            >
              <Text style={{ fontSize: 40 }}>🎯</Text>
              <Text
                style={[
                  typography.h3,
                  { color: t.text, marginTop: spacing.md },
                ]}
              >
                {tr('rooms.emptyTitle')}
              </Text>
              <Text
                style={[
                  typography.body,
                  {
                    color: t.textSecondary,
                    textAlign: 'center',
                    marginTop: 4,
                  },
                ]}
              >
                {tr('rooms.emptyDescription')}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            onPress={() => router.push(`/rooms/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
