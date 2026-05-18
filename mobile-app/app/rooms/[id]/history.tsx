import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCycleHistory } from '@/hooks/use-cycles';
import { useI18n } from '@/hooks/use-i18n';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, typography, radii, shadows } from '@/constants/theme';

export default function RoomHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t: tr } = useI18n();
  const t = colors.light;
  const { data, isLoading } = useCycleHistory(id);

  if (isLoading) {
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

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: t.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      contentInsetAdjustmentBehavior="automatic"
      data={data?.items ?? []}
      keyExtractor={(c) => c.id}
      ListEmptyComponent={
        <Text
          style={[
            typography.body,
            {
              color: t.textTertiary,
              textAlign: 'center',
              paddingVertical: spacing['2xl'],
            },
          ]}
        >
          {tr('historyPage.noCycles')}
        </Text>
      }
      renderItem={({ item }) => {
        const ended = item.status === 'ended';
        return (
          <Pressable
            disabled={!ended}
            onPress={() => router.push(`/results/${item.id}`)}
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: t.card,
                borderRadius: radii.md,
                borderCurve: 'continuous',
                padding: spacing.lg,
              },
              shadows.sm,
            ]}
          >
            <View>
              <Text style={[typography.body, { color: t.text }]}>
                {tr('historyPage.cycleNumber', { number: item.cycleNumber })}
              </Text>
              <Text
                style={[typography.caption, { color: t.textTertiary }]}
              >
                {new Date(item.startsAt).toLocaleDateString()} —{' '}
                {new Date(item.endsAt).toLocaleDateString()}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: ended ? t.textSecondary : t.primary,
                  },
                ]}
              >
                {tr(
                  `historyPage.status${
                    item.status.charAt(0).toUpperCase() +
                    item.status.slice(1)
                  }`,
                )}
              </Text>
              {ended && (
                <Icon name="chevron-forward" size={16} tone="muted" />
              )}
            </View>
          </Pressable>
        );
      }}
    />
  );
}
