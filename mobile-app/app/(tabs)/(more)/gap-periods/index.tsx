import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import {
  useGapPeriods,
  useDeleteGapPeriod,
  useCalculation,
} from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { BrandCard } from '@/components/ui/brand-card';
import { arFullDate } from '@/lib/arabic-date';
import { colors, format, radii, spacing, typography } from '@/constants/theme';

export default function GapPeriodsScreen() {
  const theme = colors.light;
  const { data: periods, isLoading, refetch } = useGapPeriods();
  const { data: calculation } = useCalculation();
  const deletePeriod = useDeleteGapPeriod();

  const handleDelete = (id: string) => {
    Alert.alert('حذف الفترة', 'هل أنت متأكد من حذف هذه الفترة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => deletePeriod.mutate(id),
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'فترات الانقطاع',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/(tabs)/(more)/gap-periods/create')}
              style={{ padding: 4 }}
            >
              <Ionicons name="add-circle" size={28} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.lg,
          paddingBottom: spacing['4xl'],
        }}
      >
        {(!periods || periods.length === 0) && !isLoading && (
          <BrandCard padding={32}>
            <View style={{ alignItems: 'center', gap: spacing.md }}>
              <Ionicons
                name="time-outline"
                size={48}
                color={theme.textTertiary}
              />
              <Text style={[typography.h3, { color: theme.text }]}>
                لا توجد فترات بعد
              </Text>
              <Text
                style={{
                  ...typography.body,
                  color: theme.textSecondary,
                  textAlign: 'center',
                }}
              >
                أضف الفترات الزمنية التي انقطعت فيها عن الصلاة.
              </Text>
              <Button
                title="أضف أول فترة"
                onPress={() => router.push('/(tabs)/(more)/gap-periods/create')}
              />
            </View>
          </BrandCard>
        )}

        {periods?.map((period) => (
          <BrandCard key={period.id} padding={16}>
            <View
              style={{
                flexDirection: 'row-reverse',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  style={{
                    ...typography.body,
                    fontWeight: '700',
                    color: theme.text,
                    textAlign: 'right',
                  }}
                >
                  {arFullDate(parseISO(period.startDate))} —{' '}
                  {arFullDate(parseISO(period.endDate))}
                </Text>
                <View
                  style={{
                    flexDirection: 'row-reverse',
                    gap: spacing.sm,
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: theme.primaryLight,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: radii.sm,
                      borderCurve: 'continuous',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: theme.primary,
                      }}
                    >
                      {period.inputMethod === 'DATE_RANGE'
                        ? 'بالتاريخ'
                        : 'بالعمر'}
                    </Text>
                  </View>
                  <Text
                    style={{
                      ...typography.caption,
                      color: theme.textSecondary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {format.toArabicDigits(period.totalDays)} يوم
                  </Text>
                  <Text
                    style={{
                      ...typography.caption,
                      color: theme.textSecondary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {format.toArabicDigits(period.totalPrayers)} صلاة
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable
                  onPress={() =>
                    router.push(
                      `/(tabs)/(more)/gap-periods/${period.id}` as any,
                    )
                  }
                  style={{ padding: 8 }}
                >
                  <Ionicons
                    name="pencil"
                    size={18}
                    color={theme.textSecondary}
                  />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(period.id)}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="trash" size={18} color={theme.error} />
                </Pressable>
              </View>
            </View>
          </BrandCard>
        ))}

        {calculation && periods && periods.length > 0 && (
          <View
            style={{
              backgroundColor: theme.primaryLight,
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              padding: spacing.lg,
              gap: 6,
            }}
          >
            <Text
              style={[
                typography.h3,
                { color: theme.primary, textAlign: 'right' },
              ]}
            >
              الإجمالي
            </Text>
            <Text
              selectable
              style={{
                ...typography.body,
                color: theme.primary,
                fontVariant: ['tabular-nums'],
                textAlign: 'right',
              }}
            >
              {format.toArabicDigits(calculation.totalDays)} يوم ={' '}
              {format.toArabicDigits(calculation.totalPrayers)} صلاة
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}
