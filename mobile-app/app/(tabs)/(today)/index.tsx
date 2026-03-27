import { useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import {
  useTodayTracker,
  useMarkPrayers,
  useWeekTrackers,
  useStreak,
} from '@/hooks/use-daily-tracker';
import { PrayerToggleCard } from '@/components/prayer/prayer-toggle-card';
import { WeeklyStrip } from '@/components/prayer/weekly-strip';
import { StreakCard } from '@/components/dashboard/streak-card';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import { colors } from '@/constants/theme';
import type { MarkPrayersPayload } from '@/services/daily-tracker';

export default function DailyTrackerScreen() {
  const theme = colors.light;
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: tracker, isLoading, refetch } = useTodayTracker();
  const { data: weekData } = useWeekTrackers();
  const { data: streak } = useStreak();
  const markPrayers = useMarkPrayers();

  const completedCount = tracker
    ? PRAYER_TYPES.filter(
        (t) => tracker[t.toLowerCase() as keyof typeof tracker] === true,
      ).length
    : 0;

  const handleToggle = useCallback(
    (prayerType: string) => {
      if (!tracker) return;
      const key = prayerType.toLowerCase() as keyof typeof tracker;
      const current = tracker[key] as boolean;
      const prayers: MarkPrayersPayload = { [key]: !current };
      markPrayers.mutate({ date: today, prayers });
    },
    [tracker, today],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Daily Tracker' }} />
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
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, color: theme.textSecondary }}>
            {format(new Date(), 'EEEE, MMMM d')}
          </Text>
          <View
            style={{
              backgroundColor: theme.primaryLight,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              borderCurve: 'continuous',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: theme.primary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {completedCount}/5
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {PRAYER_TYPES.map((type) => {
            const key = type.toLowerCase() as keyof NonNullable<typeof tracker>;
            const isCompleted = tracker ? (tracker[key] as boolean) : false;

            return (
              <PrayerToggleCard
                key={type}
                name={PRAYER_NAMES[type].en}
                completed={isCompleted}
                loading={
                  markPrayers.isPending &&
                  markPrayers.variables?.prayers &&
                  key in markPrayers.variables.prayers
                }
                onToggle={() => handleToggle(type)}
              />
            );
          })}
        </View>

        {weekData && weekData.length > 0 && (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 16,
              gap: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <Text
              style={{ fontSize: 15, fontWeight: '600', color: theme.text }}
            >
              This Week
            </Text>
            <WeeklyStrip weekData={weekData} today={today} />
          </View>
        )}

        {streak && (
          <StreakCard
            currentStreak={streak.currentStreak}
            longestStreak={streak.longestStreak}
          />
        )}
      </ScrollView>
    </>
  );
}
