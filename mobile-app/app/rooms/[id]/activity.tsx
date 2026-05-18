import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useActivity } from '@/hooks/use-activity';
import { useI18n } from '@/hooks/use-i18n';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, typography, radii, shadows } from '@/constants/theme';

export default function RoomActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t: tr } = useI18n();
  const t = colors.light;
  const { data, isLoading } = useActivity(id);

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
        <View
          style={{
            alignItems: 'center',
            paddingVertical: spacing['2xl'],
            gap: spacing.md,
          }}
        >
          <Icon name="pulse-outline" size={40} tone="muted" />
          <Text
            style={[
              typography.body,
              { color: t.textTertiary, textAlign: 'center' },
            ]}
          >
            {tr('activity.noCheckins')}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const undone = !!item.undoneAt;
        return (
          <View
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                backgroundColor: t.card,
                borderRadius: radii.md,
                borderCurve: 'continuous',
                padding: spacing.lg,
                opacity: undone ? 0.5 : 1,
              },
              shadows.sm,
            ]}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.pill,
                backgroundColor: t.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="person" size={18} tone="muted" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[typography.body, { color: t.text }]}
                numberOfLines={1}
              >
                <Text style={{ fontWeight: '700' }}>
                  {item.user.displayName}
                </Text>{' '}
                <Text
                  style={{
                    color: undone ? t.textTertiary : t.primary,
                    textDecorationLine: undone ? 'line-through' : 'none',
                  }}
                >
                  +{item.points}
                </Text>
                {undone ? (
                  <Text style={{ color: t.textTertiary }}>
                    {tr('activity.undone')}
                  </Text>
                ) : null}
              </Text>
              <Text
                style={[typography.caption, { color: t.textTertiary }]}
              >
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}
