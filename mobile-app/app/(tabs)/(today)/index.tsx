import { useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { format as dfFormat } from 'date-fns';
import { arWeekday } from '@/lib/arabic-date';
import {
  useTodayTracker,
  useMarkPrayers,
  useWeekTrackers,
  useStreak,
} from '@/hooks/use-daily-tracker';
import { PrayerToggleCard } from '@/components/prayer/prayer-toggle-card';
import { WeeklyStrip } from '@/components/prayer/weekly-strip';
import { StreakCard } from '@/components/dashboard/streak-card';
import { BrandCard } from '@/components/ui/brand-card';
import { SectionHeader } from '@/components/ui/section-header';
import { ScreenHeader } from '@/components/ui/screen-header';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import { colors, format, radii, spacing, typography } from '@/constants/theme';
import type { MarkPrayersPayload } from '@/services/daily-tracker';
import type { PrayerName } from '@/components/ui/prayer-icon';

export default function DailyTrackerScreen() {
  const theme = colors.light;
  const today = dfFormat(new Date(), 'yyyy-MM-dd');

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
    [tracker, today, markPrayers],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="صلوات اليوم"
        subtitle={arWeekday(new Date())}
        left={
          <View
            style={{
              backgroundColor: theme.accentLight,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radii.pill,
            }}
          >
            <Text
              style={{
                ...typography.label,
                color: theme.accent,
                fontVariant: ['tabular-nums'],
              }}
            >
              {format.toArabicDigits(completedCount)}/{format.toArabicDigits(5)}
            </Text>
          </View>
        }
      />
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

        <View style={{ gap: spacing.md }}>
          {PRAYER_TYPES.map((type) => {
            const key = type.toLowerCase() as keyof NonNullable<typeof tracker>;
            const isCompleted = tracker ? (tracker[key] as boolean) : false;

            return (
              <PrayerToggleCard
                key={type}
                name={PRAYER_NAMES[type].ar}
                prayerKey={key as PrayerName}
                completed={isCompleted}
                loading={
                  markPrayers.isPending &&
                  !!markPrayers.variables?.prayers &&
                  key in markPrayers.variables.prayers
                }
                onToggle={() => handleToggle(type)}
              />
            );
          })}
        </View>

        {weekData && weekData.length > 0 && (
          <BrandCard>
            <SectionHeader title="هذا الأسبوع" />
            <WeeklyStrip weekData={weekData} today={today} />
          </BrandCard>
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
