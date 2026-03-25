import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { useGapPeriods, useUpdateGapPeriod } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { colors } from '@/constants/theme';

export default function EditGapPeriodScreen() {
  const theme = colors.light;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: periods } = useGapPeriods();
  const updateGapPeriod = useUpdateGapPeriod();

  const period = periods?.find((p) => p.id === id);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(process.env.EXPO_OS === 'ios');
  const [showEndPicker, setShowEndPicker] = useState(process.env.EXPO_OS === 'ios');

  useEffect(() => {
    if (period) {
      setStartDate(parseISO(period.startDate));
      setEndDate(parseISO(period.endDate));
    }
  }, [period]);

  const onSubmit = async () => {
    if (!id) return;
    try {
      await updateGapPeriod.mutateAsync({
        id,
        payload: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        },
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update.');
    }
  };

  if (!period) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Gap Period' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        <View
          style={{
            backgroundColor: theme.primaryLight,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            borderCurve: 'continuous',
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.primary }}>
            {period.inputMethod === 'DATE_RANGE' ? 'Date Range' : 'Age Range'}
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text }}>Start Date</Text>
            {process.env.EXPO_OS !== 'ios' && (
              <Button title={format(startDate, 'MMMM d, yyyy')} variant="secondary" onPress={() => setShowStartPicker(true)} />
            )}
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={process.env.EXPO_OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={endDate}
                onChange={(_, date) => {
                  if (process.env.EXPO_OS !== 'ios') setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text }}>End Date</Text>
            {process.env.EXPO_OS !== 'ios' && (
              <Button title={format(endDate, 'MMMM d, yyyy')} variant="secondary" onPress={() => setShowEndPicker(true)} />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={process.env.EXPO_OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={startDate}
                onChange={(_, date) => {
                  if (process.env.EXPO_OS !== 'ios') setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}
          </View>
        </View>

        <Button title="Save Changes" onPress={onSubmit} loading={updateGapPeriod.isPending} />
      </ScrollView>
    </>
  );
}
