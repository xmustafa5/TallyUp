import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { format, parseISO, isValid, parse } from 'date-fns';
import { useGapPeriods, useUpdateGapPeriod } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { colors } from '@/constants/theme';

export default function EditGapPeriodScreen() {
  const theme = colors.light;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: periods } = useGapPeriods();
  const updateGapPeriod = useUpdateGapPeriod();

  const period = periods?.find((p) => p.id === id);

  const [startDateText, setStartDateText] = useState('');
  const [endDateText, setEndDateText] = useState('');

  useEffect(() => {
    if (period) {
      setStartDateText(format(parseISO(period.startDate), 'yyyy-MM-dd'));
      setEndDateText(format(parseISO(period.endDate), 'yyyy-MM-dd'));
    }
  }, [period]);

  const onSubmit = async () => {
    if (!id) return;

    const parsedStart = parse(startDateText, 'yyyy-MM-dd', new Date());
    const parsedEnd = parse(endDateText, 'yyyy-MM-dd', new Date());

    if (!isValid(parsedStart)) {
      Alert.alert('Error', 'Start date must be in YYYY-MM-DD format.');
      return;
    }
    if (!isValid(parsedEnd)) {
      Alert.alert('Error', 'End date must be in YYYY-MM-DD format.');
      return;
    }
    if (parsedStart > parsedEnd) {
      Alert.alert('Error', 'Start date must be before end date.');
      return;
    }

    try {
      await updateGapPeriod.mutateAsync({
        id,
        payload: {
          startDate: startDateText,
          endDate: endDateText,
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
        keyboardShouldPersistTaps="handled"
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
          <TextInput
            label="Start Date"
            placeholder="YYYY-MM-DD"
            value={startDateText}
            onChangeText={setStartDateText}
          />
          <TextInput
            label="End Date"
            placeholder="YYYY-MM-DD"
            value={endDateText}
            onChangeText={setEndDateText}
          />
        </View>

        <Button title="Save Changes" onPress={onSubmit} loading={updateGapPeriod.isPending} />
      </ScrollView>
    </>
  );
}
