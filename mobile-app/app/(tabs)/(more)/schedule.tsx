import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import {
  useSchedule,
  useUpdateSchedule,
  useTodayProgress,
} from '@/hooks/use-schedule';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { BrandCard } from '@/components/ui/brand-card';
import { SectionHeader } from '@/components/ui/section-header';
import { colors, format, radii, spacing, typography } from '@/constants/theme';

export default function ScheduleScreen() {
  const theme = colors.light;
  const { data: schedule } = useSchedule();
  const { data: progress } = useTodayProgress();
  const updateSchedule = useUpdateSchedule();

  const [dailyGoal, setDailyGoal] = useState('5');
  const [weeklyGoal, setWeeklyGoal] = useState('35');

  useEffect(() => {
    if (schedule) {
      setDailyGoal(String(schedule.dailyGoal));
      setWeeklyGoal(String(schedule.weeklyGoal));
    }
  }, [schedule]);

  const handleSave = async () => {
    const dg = parseInt(dailyGoal);
    const wg = parseInt(weeklyGoal);
    if (isNaN(dg) || dg < 1 || dg > 50) {
      Alert.alert('خطأ', 'الهدف اليومي يجب أن يكون بين ١ و ٥٠');
      return;
    }
    if (isNaN(wg) || wg < 1 || wg > 350) {
      Alert.alert('خطأ', 'الهدف الأسبوعي يجب أن يكون بين ١ و ٣٥٠');
      return;
    }
    updateSchedule.mutate({ dailyGoal: dg, weeklyGoal: wg });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'الأهداف' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: spacing.lg }}>
          <SectionHeader title="أهداف الصلاة" />
          <TextInput
            label="الهدف اليومي"
            value={dailyGoal}
            onChangeText={setDailyGoal}
            keyboardType="number-pad"
            placeholder="١–٥٠"
          />
          <TextInput
            label="الهدف الأسبوعي"
            value={weeklyGoal}
            onChangeText={setWeeklyGoal}
            keyboardType="number-pad"
            placeholder="١–٣٥٠"
          />
          <Button
            title="حفظ الأهداف"
            onPress={handleSave}
            loading={updateSchedule.isPending}
            fullWidth
          />
        </View>

        {progress && (
          <BrandCard>
            <Text
              style={[
                typography.h3,
                {
                  color: theme.text,
                  marginBottom: spacing.md,
                  textAlign: 'right',
                },
              ]}
            >
              تقدّم اليوم
            </Text>
            <View style={{ gap: spacing.md }}>
              <GoalBar
                label="يومي"
                completed={progress.dailyCompleted}
                goal={progress.dailyGoal}
                percentage={progress.dailyPercentage}
                color={theme.accent}
              />
              <GoalBar
                label="أسبوعي"
                completed={progress.weeklyCompleted}
                goal={progress.weeklyGoal}
                percentage={progress.weeklyPercentage}
                color={theme.primary}
              />
            </View>
          </BrandCard>
        )}
      </ScrollView>
    </>
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
          {format.toArabicDigits(completed)}/{format.toArabicDigits(goal)} (
          {format.toArabicDigits(Math.round(percentage))}٪)
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
