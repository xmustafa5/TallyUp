import { View, Text, ScrollView, RefreshControl, Pressable, Image } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '@/hooks/use-progress';
import { useTodayProgress } from '@/hooks/use-schedule';
import { useTodayTracker, useMarkPrayers } from '@/hooks/use-daily-tracker';
import { ProgressRing } from '@/components/dashboard/progress-ring';
import { BrandCard } from '@/components/ui/brand-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { PrayerIcon, type PrayerName } from '@/components/ui/prayer-icon';
import { Button } from '@/components/ui/button';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import { colors, format, radii, spacing, typography } from '@/constants/theme';
import { lightImpact } from '@/lib/haptics';
import { format as dfFormat } from 'date-fns';

export default function DashboardScreen() {
  const theme = colors.light;
  const { data: dashboard, isLoading, refetch } = useDashboard();
  const { data: todayProgress } = useTodayProgress();

  const today = dfFormat(new Date(), 'yyyy-MM-dd');
  const { data: dailyTracker } = useTodayTracker();
  const markPrayers = useMarkPrayers();

  const togglePrayer = (key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha') => {
    if (!dailyTracker) return;
    lightImpact();
    markPrayers.mutate({
      date: today,
      prayers: { [key]: !dailyTracker[key] },
    });
  };

  const completedToday = dailyTracker
    ? [
        dailyTracker.fajr,
        dailyTracker.dhuhr,
        dailyTracker.asr,
        dailyTracker.maghrib,
        dailyTracker.isha,
      ].filter(Boolean).length
    : 0;
  const todayPct = Math.round((completedToday / 5) * 100);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="متتبع صلاة القضاء"
        left={
          <Image
            source={require('@/assets/icon.png')}
            style={{ width: 44, height: 44, borderRadius: radii.pill }}
          />
        }
      />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />
        }
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{
          padding: spacing.xl,
          paddingTop: spacing.sm,
          gap: spacing.xl,
          paddingBottom: spacing['4xl'],
        }}
      >

        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <ProgressRing
            percentage={dashboard?.completionPercentage ?? 0}
            centerValue={dashboard?.totalRemaining ?? 0}
            centerLabel="صلاة متبقية"
          />
          <View
            style={{
              flexDirection: 'row',
              gap: spacing['3xl'],
              marginTop: spacing.lg,
            }}
          >
            <StatBlock
              value={dashboard?.totalCompleted ?? 0}
              label="منجزة"
              tone="accent"
            />
            <View
              style={{
                width: 1,
                backgroundColor: theme.border,
              }}
            />
            <StatBlock
              value={dashboard?.totalRemaining ?? 0}
              label="متبقية"
              tone="primary"
            />
          </View>
        </View>

        <BrandCard padding={0}>
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            {PRAYER_TYPES.map((type, idx) => {
              const key = type.toLowerCase() as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
              const done = dailyTracker ? dailyTracker[key] : false;
              return (
                <Pressable
                  key={type}
                  onPress={() => togglePrayer(key)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: spacing.md,
                    borderBottomWidth: idx < PRAYER_TYPES.length - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      borderWidth: 2,
                      borderColor: done ? theme.accent : theme.borderStrong,
                      backgroundColor: done ? theme.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {done && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={{
                      ...typography.bodyLg,
                      flex: 1,
                      fontWeight: '700',
                      color: theme.text,
                      textAlign: 'right',
                    }}
                  >
                    {PRAYER_NAMES[type].ar}
                  </Text>
                  <PrayerIcon
                    name={key as PrayerName}
                    size={40}
                    tone={done ? 'gold' : 'muted'}
                  />
                </Pressable>
              );
            })}
          </View>
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={[typography.caption, { color: theme.textSecondary }]}
              >
                تقدّم اليوم
              </Text>
              <Text
                style={{
                  ...typography.caption,
                  color: theme.accent,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {format.toArabicDigits(todayPct)}٪ مكتملة
              </Text>
            </View>
            <View
              style={{
                height: 8,
                backgroundColor: theme.surfaceAlt,
                borderRadius: radii.pill,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${todayPct}%`,
                  backgroundColor: theme.accent,
                  borderRadius: radii.pill,
                }}
              />
            </View>
          </View>
        </BrandCard>

        <View style={{ flexDirection: 'row-reverse', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Button
              title="إضافة قضاء"
              variant="primary"
              onPress={() => router.push('/(tabs)/(makeup)')}
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="سجل القضاء"
              variant="secondary"
              onPress={() => router.push('/(tabs)/(more)/calendar')}
              fullWidth
            />
          </View>
        </View>

        {todayProgress && (
          <BrandCard>
            <Text style={[typography.h3, { color: theme.text, marginBottom: spacing.md }]}>
              الأهداف
            </Text>
            <GoalBar
              label="يومي"
              completed={todayProgress.dailyCompleted}
              goal={todayProgress.dailyGoal}
              percentage={todayProgress.dailyPercentage}
              color={theme.accent}
            />
            <View style={{ height: spacing.md }} />
            <GoalBar
              label="أسبوعي"
              completed={todayProgress.weeklyCompleted}
              goal={todayProgress.weeklyGoal}
              percentage={todayProgress.weeklyPercentage}
              color={theme.primary}
            />
          </BrandCard>
        )}

        {dashboard?.milestone && (
          <View
            style={{
              backgroundColor: theme.primaryLight,
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              padding: spacing.lg,
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <Ionicons name="ribbon" size={24} color={theme.primary} />
            <Text
              style={{
                ...typography.body,
                color: theme.primary,
                flex: 1,
                fontWeight: '700',
                textAlign: 'right',
              }}
            >
              {dashboard.milestone}
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function StatBlock({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'primary' | 'accent';
}) {
  const theme = colors.light;
  const color = tone === 'primary' ? theme.primary : theme.accent;
  return (
    <View style={{ alignItems: 'center', minWidth: 80 }}>
      <Text
        selectable
        style={{
          ...typography.h2,
          color,
          fontVariant: ['tabular-nums'],
        }}
      >
        {format.toArabicDigits(value)}
      </Text>
      <Text style={[typography.caption, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

function GoalBar({
  label,
  completed,
  goal,
  percentage,
  color,
}: {
  label: string;
  completed: number;
  goal: number;
  percentage: number;
  color: string;
}) {
  const theme = colors.light;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[typography.caption, { color: theme.textSecondary }]}>
          {label}
        </Text>
        <Text
          style={{
            ...typography.caption,
            color: theme.textSecondary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {format.toArabicDigits(completed)}/{format.toArabicDigits(goal)}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: theme.surfaceAlt,
          borderRadius: radii.pill,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            backgroundColor: color,
            width: `${Math.min(percentage, 100)}%`,
          }}
        />
      </View>
    </View>
  );
}
