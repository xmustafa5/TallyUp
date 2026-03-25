import { View, Text, ScrollView, FlatList, Pressable, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutLeft } from 'react-native-reanimated';
import { format, parseISO } from 'date-fns';
import { useMakeupStats, useLogMakeup, useMakeupHistory, useUndoMakeup } from '@/hooks/use-makeup';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import { colors } from '@/constants/theme';
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

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 14,
        borderCurve: 'continuous',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
          {PRAYER_NAMES[type as keyof typeof PRAYER_NAMES]?.en ?? type}
        </Text>
        <View
          style={{
            height: 5,
            backgroundColor: theme.surfaceAlt,
            borderRadius: 3,
          }}
        >
          <View
            style={{
              height: 5,
              backgroundColor: theme.success,
              borderRadius: 3,
              width: `${Math.min(pct, 100)}%`,
            }}
          />
        </View>
        <Text
          style={{
            fontSize: 12,
            color: theme.textSecondary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {remaining.toLocaleString()} left
        </Text>
      </View>
      <Pressable
        onPress={() => {
          successNotification();
          onLog();
        }}
        disabled={logging || remaining === 0}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: remaining === 0 ? theme.surfaceAlt : theme.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : logging ? 0.5 : 1,
        })}
      >
        <Ionicons
          name="add"
          size={22}
          color={remaining === 0 ? theme.textTertiary : '#FFFFFF'}
        />
      </Pressable>
    </View>
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
        ? theme.warningLight
        : theme.surfaceAlt;
  const sourceColor =
    item.source === 'MANUAL'
      ? theme.primary
      : item.source === 'DAILY_MISSED'
        ? theme.warning
        : theme.textSecondary;

  return (
    <Animated.View
      exiting={FadeOutLeft.duration(300)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text }}>
            {PRAYER_NAMES[item.prayerType as keyof typeof PRAYER_NAMES]?.en ??
              item.prayerType}
          </Text>
          <View
            style={{
              backgroundColor: sourceBg,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 6,
              borderCurve: 'continuous',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '500', color: sourceColor }}>
              {item.source.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: theme.textTertiary }}>
          {format(parseISO(item.completedAt), 'MMM d, h:mm a')}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          warningNotification();
          onUndo();
        }}
        style={({ pressed }) => ({
          padding: 6,
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Ionicons name="arrow-undo" size={18} color={theme.textTertiary} />
      </Pressable>
    </Animated.View>
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
      <Stack.Screen options={{ title: 'Makeup Prayers' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={{
          padding: 20,
          gap: 20,
          paddingBottom: 40,
        }}
      >
        {stats && (
          <>
            <Animated.View
              entering={FadeInDown.duration(400).delay(100)}
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 24,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text
                  selectable
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: theme.success,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {stats.totalCompleted.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  Completed
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  selectable
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: theme.text,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {stats.totalRemaining.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  Remaining
                </Text>
              </View>
            </Animated.View>

            <View style={{ gap: 8 }}>
              {PRAYER_TYPES.map((type, index) => {
                const key = type.toLowerCase() as keyof typeof stats.perType;
                const stat = stats.perType[key];

                return (
                  <Animated.View
                    key={type}
                    entering={FadeInDown.duration(300).delay(200 + index * 80)}
                  >
                    <PrayerStatRow
                      type={type}
                      completed={stat.completed}
                      remaining={stat.remaining}
                      onLog={() => logMakeup.mutate(type)}
                      logging={
                        logMakeup.isPending &&
                        logMakeup.variables === type
                      }
                    />
                  </Animated.View>
                );
              })}
            </View>
          </>
        )}

        {history && history.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(700)}
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 16,
              gap: 4,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <Text
              style={{ fontSize: 15, fontWeight: '600', color: theme.text }}
            >
              Recent History
            </Text>
            {history.slice(0, 20).map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                onUndo={() => undoMakeup.mutate(item.id)}
              />
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </>
  );
}
