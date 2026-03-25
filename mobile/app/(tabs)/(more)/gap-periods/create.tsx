import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useCreateGapPeriod } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { colors } from '@/constants/theme';
import type { InputMethod } from '@/services/gap-periods';

export default function CreateGapPeriodScreen() {
  const theme = colors.light;
  const createGapPeriod = useCreateGapPeriod();

  const [inputMethod, setInputMethod] = useState<InputMethod>('DATE_RANGE');
  const [startDate, setStartDate] = useState(new Date(2015, 0, 1));
  const [endDate, setEndDate] = useState(new Date());
  const [startAge, setStartAge] = useState('');
  const [endAge, setEndAge] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(process.env.EXPO_OS === 'ios');
  const [showEndPicker, setShowEndPicker] = useState(process.env.EXPO_OS === 'ios');

  const onSubmit = async () => {
    try {
      if (inputMethod === 'DATE_RANGE') {
        await createGapPeriod.mutateAsync({
          inputMethod: 'DATE_RANGE',
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
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
