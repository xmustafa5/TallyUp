import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useSchedule, useUpdateSchedule, useTodayProgress } from '@/hooks/use-schedule';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { colors } from '@/constants/theme';

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
      Alert.alert('Error', 'Daily goal must be between 1 and 50');
      return;
    }
    if (isNaN(wg) || wg < 1 || wg > 350) {
      Alert.alert('Error', 'Weekly goal must be between 1 and 350');
      return;
    }
    updateSchedule.mutate({ dailyGoal: dg, weeklyGoal: wg });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Goals' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, gap: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>
            Prayer Goals
          </Text>
          <TextInput
            label="Daily Goal"
            value={dailyGoal}
            onChangeText={setDailyGoal}
            keyboardType="number-pad"
            placeholder="1-50"
          />
          <TextInput
            label="Weekly Goal"
            value={weeklyGoal}
            onChangeText={setWeeklyGoal}
            keyboardType="number-pad"
            placeholder="1-350"
          />
          <Button title="Save Goals" onPress={handleSave} loading={updateSchedule.isPending} />
        </View>

        {progress && (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 16,
              gap: 14,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
              Today's Progress
            </Text>
            <View style={{ gap: 10 }}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>Daily</Text>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, fontVariant: ['tabular-nums'] }}>
                    {progress.dailyCompleted}/{progress.dailyGoal} ({Math.round(progress.dailyPercentage)}%)
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: theme.surfaceAlt, borderRadius: 4 }}>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: theme.primary,
                      borderRadius: 4,
                      width: `${Math.min(progress.dailyPercentage, 100)}%`,
                    }}
                  />
                </View>
              </View>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>Weekly</Text>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, fontVariant: ['tabular-nums'] }}>
                    {progress.weeklyCompleted}/{progress.weeklyGoal} ({Math.round(progress.weeklyPercentage)}%)
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: theme.surfaceAlt, borderRadius: 4 }}>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: theme.success,
                      borderRadius: 4,
                      width: `${Math.min(progress.weeklyPercentage, 100)}%`,
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}
