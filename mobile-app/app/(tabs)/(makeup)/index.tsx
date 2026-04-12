import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { arDateTime } from '@/lib/arabic-date';
import {
  useMakeupStats,
  useLogMakeup,
  useMakeupHistory,
  useUndoMakeup,
} from '@/hooks/use-makeup';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import { BrandCard } from '@/components/ui/brand-card';
import { SectionHeader } from '@/components/ui/section-header';
import { PrayerIcon, type PrayerName } from '@/components/ui/prayer-icon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { colors, format, radii, spacing, typography } from '@/constants/theme';
import { successNotification, warningNotification } from '@/lib/haptics';
import type { MakeupLogEntry } from '@/services/makeup';

function PrayerStatRow({
  type,
  completed,
  remaining,
  onLog,
  logging,
}: {
  type: string;
  completed: number;
  remaining: number;
  onLog: () => void;
  logging: boolean;
}) {
  const theme = colors.light;
  const total = completed + remaining;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const prayerKey = type.toLowerCase() as PrayerName;

  return (
    <BrandCard padding={16}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <PrayerIcon name={prayerKey} size={48} tone="gold" />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[typography.h3, { color: theme.text, textAlign: 'right' }]}>
            {PRAYER_NAMES[type as keyof typeof PRAYER_NAMES]?.ar ?? type}
          </Text>
          <View
            style={{
              height: 6,
              backgroundColor: theme.surfaceAlt,
              borderRadius: radii.pill,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                backgroundColor: theme.accent,
                borderRadius: radii.pill,
                width: `${Math.min(pct, 100)}%`,
              }}
            />
          </View>
          <Text
            style={{
              ...typography.caption,
              color: theme.textSecondary,
              fontVariant: ['tabular-nums'],
              textAlign: 'right',
            }}
          >
            {format.toArabicDigits(remaining)} متبقية
          </Text>
        </View>
        <Pressable
          onPress={() => {
            successNotification();
            onLog();
          }}
          disabled={logging || remaining === 0}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: radii.pill,
            backgroundColor: remaining === 0 ? theme.surfaceAlt : theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.75 : logging ? 0.5 : 1,
          })}
        >
          <Ionicons
            name="add"
            size={22}
            color={remaining === 0 ? theme.textTertiary : '#FFFFFF'}
          />
        </Pressable>
      </View>
    </BrandCard>
  );
}

function HistoryItem({
  item,
  onUndo,
}: {
  item: MakeupLogEntry;
  onUndo: () => void;
}) {
  const theme = colors.light;
  const sourceBg =
    item.source === 'MANUAL'
      ? theme.primaryLight
      : item.source === 'DAILY_MISSED'
        ? theme.accentLight
        : theme.surfaceAlt;
  const sourceColor =
    item.source === 'MANUAL'
      ? theme.primary
      : item.source === 'DAILY_MISSED'
        ? theme.accent
        : theme.textSecondary;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 12,
      }}
    >
      <PrayerIcon
        name={item.prayerType.toLowerCase() as PrayerName}
        size={36}
        tone="muted"
      />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[typography.body, { color: theme.text, fontWeight: '700' }]}>
            {PRAYER_NAMES[item.prayerType as keyof typeof PRAYER_NAMES]?.ar ??
              item.prayerType}
          </Text>
          <View
            style={{
              backgroundColor: sourceBg,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: radii.sm,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: sourceColor }}>
              {item.source === 'MANUAL'
                ? 'يدوي'
                : item.source === 'DAILY_MISSED'
                  ? 'فائتة من اليوم'
                  : item.source}
            </Text>
          </View>
        </View>
        <Text style={{ ...typography.caption, color: theme.textTertiary }}>
          {arDateTime(parseISO(item.completedAt))}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          warningNotification();
          onUndo();
        }}
        style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.5 : 1 })}
      >
        <Ionicons name="arrow-undo" size={18} color={theme.textTertiary} />
      </Pressable>
    </View>
  );
}

export default function MakeupScreen() {
  const theme = colors.light;
  const { data: stats, isLoading, refetch } = useMakeupStats();
  const { data: history } = useMakeupHistory();
  const logMakeup = useLogMakeup();
  const undoMakeup = useUndoMakeup();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="صلوات القضاء" />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />
        }
        contentContainerStyle={{
          padding: spacing.xl,
          paddingTop: spacing.sm,
          gap: spacing.xl,
          paddingBottom: spacing['4xl'],
        }}
      >

        {stats && (
          <>
            <BrandCard>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                }}
              >
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text
                    selectable
                    style={{
                      ...typography.h1,
                      color: theme.accent,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {format.toArabicDigits(stats.totalCompleted)}
                  </Text>
                  <Text style={[typography.caption, { color: theme.textSecondary }]}>
                    منجزة
                  </Text>
                </View>
                <View style={{ width: 1, backgroundColor: theme.border }} />
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text
                    selectable
                    style={{
                      ...typography.h1,
                      color: theme.primary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {format.toArabicDigits(stats.totalRemaining)}
                  </Text>
                  <Text style={[typography.caption, { color: theme.textSecondary }]}>
                    متبقية
                  </Text>
                </View>
              </View>
            </BrandCard>

            <View style={{ gap: spacing.md }}>
              {PRAYER_TYPES.map((type) => {
                const key = type.toLowerCase() as keyof typeof stats.perType;
                const stat = stats.perType[key];

                return (
                  <PrayerStatRow
                    key={type}
                    type={type}
                    completed={stat.completed}
                    remaining={stat.remaining}
                    onLog={() => logMakeup.mutate(type)}
                    logging={
                      logMakeup.isPending && logMakeup.variables === type
                    }
                  />
                );
              })}
            </View>
          </>
        )}

        {history && history.length > 0 && (
          <BrandCard>
            <SectionHeader title="السجل الأخير" />
            {history.slice(0, 20).map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                onUndo={() => undoMakeup.mutate(item.id)}
              />
            ))}
          </BrandCard>
        )}
      </ScrollView>
    </>
  );
}
