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
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useCreateGapPeriod } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { colors } from '@/constants/theme';
import { format } from 'date-fns';
import type { InputMethod } from '@/services/gap-periods';

export default function GapPeriodsOnboarding() {
  const insets = useSafeAreaInsets();
  const theme = colors.light;
  const createGapPeriod = useCreateGapPeriod();

  const [inputMethod, setInputMethod] = useState<InputMethod>('DATE_RANGE');
  const [startDate, setStartDate] = useState<Date>(new Date(2015, 0, 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startAge, setStartAge] = useState('');
  const [endAge, setEndAge] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(
    process.env.EXPO_OS === 'ios',
  );
  const [showEndPicker, setShowEndPicker] = useState(
    process.env.EXPO_OS === 'ios',
  );

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
      <Animated.View
        entering={FadeInDown.duration(600).delay(200)}
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
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(600).delay(400)}
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
            <View style={{ gap: 8 }}>
              <Text
                style={{ fontSize: 14, fontWeight: '500', color: theme.text }}
              >
                Start Date
              </Text>
              {process.env.EXPO_OS !== 'ios' && (
                <Button
                  title={format(startDate, 'MMMM d, yyyy')}
                  variant="secondary"
                  onPress={() => setShowStartPicker(true)}
                />
              )}
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={
                    process.env.EXPO_OS === 'ios' ? 'spinner' : 'default'
                  }
                  maximumDate={endDate}
                  onChange={(_, date) => {
                    if (process.env.EXPO_OS !== 'ios')
                      setShowStartPicker(false);
                    if (date) setStartDate(date);
                  }}
                />
              )}
            </View>
            <View style={{ gap: 8 }}>
              <Text
                style={{ fontSize: 14, fontWeight: '500', color: theme.text }}
              >
                End Date
              </Text>
              {process.env.EXPO_OS !== 'ios' && (
                <Button
                  title={format(endDate, 'MMMM d, yyyy')}
                  variant="secondary"
                  onPress={() => setShowEndPicker(true)}
                />
              )}
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display={
                    process.env.EXPO_OS === 'ios' ? 'spinner' : 'default'
                  }
                  maximumDate={new Date()}
                  minimumDate={startDate}
                  onChange={(_, date) => {
                    if (process.env.EXPO_OS !== 'ios')
                      setShowEndPicker(false);
                    if (date) setEndDate(date);
                  }}
                />
              )}
            </View>
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
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(600).delay(600)}
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
      </Animated.View>
    </ScrollView>
  );
}
