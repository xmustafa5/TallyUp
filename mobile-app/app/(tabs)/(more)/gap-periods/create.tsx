import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { format } from 'date-fns';
import { useCreateGapPeriod } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { DateField } from '@/components/ui/date-field';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { InputMethod } from '@/services/gap-periods';

export default function CreateGapPeriodScreen() {
  const theme = colors.light;
  const createGapPeriod = useCreateGapPeriod();

  const [inputMethod, setInputMethod] = useState<InputMethod>('DATE_RANGE');
  const [startDate, setStartDate] = useState<Date | null>(new Date(2015, 0, 1));
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startAge, setStartAge] = useState('');
  const [endAge, setEndAge] = useState('');

  const onSubmit = async () => {
    try {
      if (inputMethod === 'DATE_RANGE') {
        if (!startDate) {
          Alert.alert('تنبيه', 'يرجى اختيار تاريخ البداية.');
          return;
        }
        if (!endDate) {
          Alert.alert('تنبيه', 'يرجى اختيار تاريخ النهاية.');
          return;
        }
        if (startDate > endDate) {
          Alert.alert('خطأ', 'تاريخ البداية يجب أن يسبق تاريخ النهاية.');
          return;
        }

        await createGapPeriod.mutateAsync({
          inputMethod: 'DATE_RANGE',
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        });
      } else {
        const sAge = parseInt(startAge);
        const eAge = parseInt(endAge);
        if (isNaN(sAge) || isNaN(eAge) || sAge >= eAge) {
          Alert.alert('خطأ', 'يرجى إدخال أعمار صحيحة (البداية < النهاية).');
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
      Alert.alert(
        'خطأ',
        error?.response?.data?.message || 'تعذّر إنشاء الفترة.',
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'إضافة فترة' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.surfaceAlt,
            borderRadius: radii.md,
            borderCurve: 'continuous',
            padding: 4,
          }}
        >
          {(['DATE_RANGE', 'AGE_RANGE'] as const).map((method) => {
            const active = inputMethod === method;
            return (
              <Pressable
                key={method}
                onPress={() => setInputMethod(method)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: radii.sm,
                  borderCurve: 'continuous',
                  backgroundColor: active ? theme.surface : 'transparent',
                  alignItems: 'center',
                  boxShadow: active
                    ? '0 2px 6px rgba(26,54,93,0.08)'
                    : undefined,
                }}
              >
                <Text
                  style={{
                    ...typography.label,
                    color: active ? theme.primary : theme.textSecondary,
                  }}
                >
                  {method === 'DATE_RANGE' ? 'بالتاريخ' : 'بالعمر'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {inputMethod === 'DATE_RANGE' ? (
          <View style={{ gap: spacing.lg }}>
            <DateField
              label="تاريخ البداية"
              value={startDate}
              onChange={setStartDate}
              maximumDate={new Date()}
            />
            <DateField
              label="تاريخ النهاية"
              value={endDate}
              onChange={setEndDate}
              maximumDate={new Date()}
              minimumDate={startDate ?? undefined}
            />
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            <TextInput
              label="العمر من"
              placeholder="مثال: ١٣"
              value={startAge}
              onChangeText={setStartAge}
              keyboardType="number-pad"
            />
            <TextInput
              label="إلى"
              placeholder="مثال: ٢٥"
              value={endAge}
              onChangeText={setEndAge}
              keyboardType="number-pad"
            />
          </View>
        )}

        <Button
          title="إضافة الفترة"
          onPress={onSubmit}
          loading={createGapPeriod.isPending}
          fullWidth
        />
      </ScrollView>
    </>
  );
}
