import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useRoomsQuery } from '@/hooks/use-rooms';
import { useI18n } from '@/hooks/use-i18n';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, typography, radii, shadows } from '@/constants/theme';

export default function ActivityScreen() {
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
          <Text
            style={[
              typography.body,
              { color: t.textSecondary, marginBottom: spacing.sm },
            ]}
          >
            {tr('activityTab.subtitle')}
          </Text>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: spacing['4xl'],
                gap: spacing.md,
              }}
            >
              <Icon name="pulse-outline" size={40} tone="muted" />
              <Text style={[typography.h3, { color: t.text }]}>
                {tr('activityTab.emptyTitle')}
              </Text>
              <Text
                style={[
                  typography.body,
                  { color: t.textSecondary, textAlign: 'center' },
                ]}
              >
                {tr('activityTab.emptyDescription')}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/rooms/${item.id}/activity`)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: t.card,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                padding: spacing.lg,
                opacity: pressed ? 0.9 : 1,
              },
              shadows.sm,
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                flex: 1,
              }}
            >
              <Text style={{ fontSize: 28 }}>{item.icon ?? '🎯'}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[typography.h3, { color: t.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={[typography.caption, { color: t.textTertiary }]}
                >
                  {tr('rooms.memberCount', { count: item.memberCount })}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={18} tone="muted" />
          </Pressable>
        )}
      />
    </View>
  );
}
