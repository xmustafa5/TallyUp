import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '@/hooks/use-progress';
import { useTodayProgress } from '@/hooks/use-schedule';
import { useAuthStore } from '@/stores/auth.store';
import { ProgressRing } from '@/components/dashboard/progress-ring';
import { TodayMiniStrip } from '@/components/dashboard/today-mini-strip';
import { StreakCard } from '@/components/dashboard/streak-card';
import { colors } from '@/constants/theme';

export default function DashboardScreen() {
  const theme = colors.light;
  const userName = useAuthStore((state) => state.user?.name ?? '');
  const { data: dashboard, isLoading, refetch } = useDashboard();
  const { data: todayProgress } = useTodayProgress();

  const quickActions = [
    { title: 'Gap Periods', icon: 'time' as const, route: '/(tabs)/(more)/gap-periods' },
    { title: 'Calendar', icon: 'calendar' as const, route: '/(tabs)/(more)/calendar' },
    { title: 'Goals', icon: 'trophy' as const, route: '/(tabs)/(more)/schedule' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Dashboard' }} />
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
        <View>
          <Text
            style={{ fontSize: 16, color: theme.textSecondary }}
          >
            Peace be upon you
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text }}>
            {userName}
          </Text>
        </View>

        <View
          style={{ alignItems: 'center', gap: 16, paddingVertical: 8 }}
        >
          <ProgressRing
            percentage={dashboard?.completionPercentage ?? 0}
          />
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <View style={{ alignItems: 'center' }}>
              <Text
                selectable
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: theme.text,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {(dashboard?.totalRemaining ?? 0).toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Remaining
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text
                selectable
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: theme.success,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {(dashboard?.totalCompleted ?? 0).toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Completed
              </Text>
            </View>
          </View>
        </View>

        <View>
          <StreakCard
            currentStreak={dashboard?.streak?.currentStreak ?? 0}
            longestStreak={dashboard?.streak?.longestStreak ?? 0}
          />
        </View>

        <View>
          <TodayMiniStrip todayStatus={dashboard?.todayStatus ?? null} />
        </View>

        {todayProgress && (
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
              Goal Progress
            </Text>
            <View style={{ gap: 8 }}>
              <View style={{ gap: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                    Daily
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.textSecondary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {todayProgress.dailyCompleted}/{todayProgress.dailyGoal}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: theme.surfaceAlt,
                    borderRadius: 3,
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      backgroundColor: theme.primary,
                      borderRadius: 3,
                      width: `${Math.min(todayProgress.dailyPercentage, 100)}%`,
                    }}
                  />
                </View>
              </View>
              <View style={{ gap: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                    Weekly
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.textSecondary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {todayProgress.weeklyCompleted}/{todayProgress.weeklyGoal}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    backgroundColor: theme.surfaceAlt,
                    borderRadius: 3,
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      backgroundColor: theme.success,
                      borderRadius: 3,
                      width: `${Math.min(todayProgress.weeklyPercentage, 100)}%`,
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {dashboard?.milestone && (
          <View
            style={{
              backgroundColor: theme.primaryLight,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Ionicons name="ribbon" size={24} color={theme.primary} />
            <Text
              style={{
                fontSize: 14,
                color: theme.primary,
                fontWeight: '500',
                flex: 1,
              }}
            >
              {dashboard.milestone}
            </Text>
          </View>
        )}

        <View
          style={{ flexDirection: 'row', gap: 12 }}
        >
          {quickActions.map((action) => (
            <Pressable
              key={action.title}
              onPress={() => router.push(action.route as any)}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: theme.card,
                borderRadius: 14,
                borderCurve: 'continuous',
                padding: 14,
                alignItems: 'center',
                gap: 8,
                opacity: pressed ? 0.7 : 1,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              })}
            >
              <Ionicons name={action.icon} size={22} color={theme.primary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: theme.text,
                }}
              >
                {action.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
