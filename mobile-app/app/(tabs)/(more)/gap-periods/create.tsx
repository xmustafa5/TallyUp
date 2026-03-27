import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { parse, isValid } from 'date-fns';
import { useCreateGapPeriod } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { colors } from '@/constants/theme';
import type { InputMethod } from '@/services/gap-periods';

export default function CreateGapPeriodScreen() {
  const theme = colors.light;
  const createGapPeriod = useCreateGapPeriod();

  const [inputMethod, setInputMethod] = useState<InputMethod>('DATE_RANGE');
  const [startDateText, setStartDateText] = useState('2015-01-01');
  const [endDateText, setEndDateText] = useState('');
  const [startAge, setStartAge] = useState('');
  const [endAge, setEndAge] = useState('');

  const onSubmit = async () => {
    try {
      if (inputMethod === 'DATE_RANGE') {
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

        await createGapPeriod.mutateAsync({
          inputMethod: 'DATE_RANGE',
          startDate: startDateText,
          endDate: endDateText,
        });
      } else {
        const sAge = parseInt(startAge);
        const eAge = parseInt(endAge);
        if (isNaN(sAge) || isNaN(eAge) || sAge >= eAge) {
          Alert.alert('Error', 'Please enter valid ages (start < end)');
          return;
        }
        await createGapPeriod.mutateAsync({
          inputMethod: 'AGE_RANGE',
          startAge: sAge,
          endAge: eAge,
        });
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to create gap period.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Gap Period' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.surfaceAlt,
            borderRadius: 10,
            borderCurve: 'continuous',
            padding: 4,
          }}
        >
          {(['DATE_RANGE', 'AGE_RANGE'] as const).map((method) => (
            <Pressable
              key={method}
              onPress={() => setInputMethod(method)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                borderCurve: 'continuous',
                backgroundColor: inputMethod === method ? theme.background : 'transparent',
                alignItems: 'center',
                boxShadow: inputMethod === method ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: inputMethod === method ? theme.text : theme.textSecondary,
                }}
              >
                {method === 'DATE_RANGE' ? 'Date Range' : 'Age Range'}
              </Text>
            </Pressable>
          ))}
        </View>

        {inputMethod === 'DATE_RANGE' ? (
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
        ) : (
          <View style={{ gap: 16 }}>
            <TextInput label="Start Age" placeholder="e.g., 13" value={startAge} onChangeText={setStartAge} keyboardType="number-pad" />
            <TextInput label="End Age" placeholder="e.g., 25" value={endAge} onChangeText={setEndAge} keyboardType="number-pad" />
          </View>
        )}

        <Button title="Create Gap Period" onPress={onSubmit} loading={createGapPeriod.isPending} />
      </ScrollView>
    </>
  );
}
