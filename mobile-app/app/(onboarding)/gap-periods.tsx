import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateGapPeriod } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { colors } from '@/constants/theme';
import { parse, isValid, format } from 'date-fns';
import type { InputMethod } from '@/services/gap-periods';

export default function GapPeriodsOnboarding() {
  const insets = useSafeAreaInsets();
  const theme = colors.light;
  const createGapPeriod = useCreateGapPeriod();

  const [inputMethod, setInputMethod] = useState<InputMethod>('DATE_RANGE');
  const [startDateText, setStartDateText] = useState('2015-01-01');
  const [endDateText, setEndDateText] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startAge, setStartAge] = useState('');
  const [endAge, setEndAge] = useState('');

  const onSubmit = async () => {
    try {
      if (inputMethod === 'DATE_RANGE') {
        const parsedStart = parse(startDateText, 'yyyy-MM-dd', new Date());
        const parsedEnd = parse(endDateText, 'yyyy-MM-dd', new Date());
        if (!isValid(parsedStart) || !isValid(parsedEnd)) {
          Alert.alert('Error', 'Please enter valid dates in YYYY-MM-DD format.');
          return;
        }
        if (parsedStart >= parsedEnd) {
          Alert.alert('Error', 'Start date must be before end date.');
          return;
        }
        await createGapPeriod.mutateAsync({
          inputMethod: 'DATE_RANGE',
          startDate: format(parsedStart, 'yyyy-MM-dd'),
          endDate: format(parsedEnd, 'yyyy-MM-dd'),
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
      router.push('/(onboarding)/summary');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Failed to create gap period.';
      Alert.alert('Error', message);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 40,
        paddingBottom: insets.bottom + 24,
        gap: 28,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{ gap: 8 }}
      >
        <Text
          style={{ fontSize: 28, fontWeight: '700', color: theme.text }}
        >
          Gap Periods
        </Text>
        <Text style={{ fontSize: 16, color: theme.textSecondary, lineHeight: 22 }}>
          When did you miss prayers? Add the time periods you were not praying
          regularly.
        </Text>
      </View>

      <View
        style={{ gap: 16 }}
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
                backgroundColor:
                  inputMethod === method ? theme.background : 'transparent',
                alignItems: 'center',
                boxShadow:
                  inputMethod === method
                    ? '0 1px 3px rgba(0,0,0,0.1)'
                    : undefined,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color:
                    inputMethod === method
                      ? theme.text
                      : theme.textSecondary,
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
            <TextInput
              label="Start Age"
              placeholder="e.g., 13"
              value={startAge}
              onChangeText={setStartAge}
              keyboardType="number-pad"
            />
            <TextInput
              label="End Age"
              placeholder="e.g., 25"
              value={endAge}
              onChangeText={setEndAge}
              keyboardType="number-pad"
            />
          </View>
        )}
      </View>

      <View
        style={{ gap: 12 }}
      >
        <Button
          title="Calculate & Continue"
          onPress={onSubmit}
          loading={createGapPeriod.isPending}
        />
        <Button
          title="Skip for Now"
          variant="ghost"
          onPress={() => router.push('/(onboarding)/summary')}
        />
      </View>
    </ScrollView>
  );
}
