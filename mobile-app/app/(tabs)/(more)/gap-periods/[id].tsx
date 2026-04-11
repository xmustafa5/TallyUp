import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useGapPeriods, useUpdateGapPeriod } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { colors, radii, spacing, typography } from '@/constants/theme';

export default function EditGapPeriodScreen() {
  const theme = colors.light;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: periods } = useGapPeriods();
  const updateGapPeriod = useUpdateGapPeriod();

  const period = periods?.find((p) => p.id === id);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    if (period) {
      setStartDate(parseISO(period.startDate));
      setEndDate(parseISO(period.endDate));
    }
  }, [period]);

  const onSubmit = async () => {
    if (!id) return;
    if (!startDate || !endDate) {
      Alert.alert('تنبيه', 'يرجى اختيار تاريخي البداية والنهاية.');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('خطأ', 'تاريخ البداية يجب أن يسبق تاريخ النهاية.');
      return;
    }

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
      Alert.alert(
        'خطأ',
        error?.response?.data?.message || 'تعذّر الحفظ.',
      );
    }
  };

  if (!period) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ color: theme.textSecondary }}>جارِ التحميل...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'تعديل الفترة' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            backgroundColor: theme.primaryLight,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: radii.pill,
            borderCurve: 'continuous',
            alignSelf: 'flex-start',
          }}
        >
          <Text
            style={{
              ...typography.caption,
              fontWeight: '700',
              color: theme.primary,
            }}
          >
            {period.inputMethod === 'DATE_RANGE' ? 'بالتاريخ' : 'بالعمر'}
          </Text>
        </View>

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

        <Button
          title="حفظ التغييرات"
          onPress={onSubmit}
          loading={updateGapPeriod.isPending}
          fullWidth
        />
      </ScrollView>
    </>
  );
}
