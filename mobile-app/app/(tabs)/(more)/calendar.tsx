import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format as dfFormat, getDaysInMonth, getDay, parseISO } from 'date-fns';
import { useCalendarMonth, useCalendarDayDetail } from '@/hooks/use-progress';
import { useDateTracker, useMarkPrayers } from '@/hooks/use-daily-tracker';
import { useLogMakeupForDay } from '@/hooks/use-makeup';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import { colors, format, radii, spacing, typography } from '@/constants/theme';
import { BrandCard } from '@/components/ui/brand-card';
import { PrayerIcon, type PrayerName } from '@/components/ui/prayer-icon';
import { lightImpact, successNotification } from '@/lib/haptics';
import type { CalendarDay } from '@/services/progress';
import type { MarkPrayersPayload } from '@/services/daily-tracker';

const WEEKDAYS_AR = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

function CalendarGrid({
  year,
  month,
  days,
  onDayPress,
}: {
  year: number;
  month: number;
  days: CalendarDay[];
  onDayPress: (date: string) => void;
}) {
  const theme = colors.light;
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const firstDayOfWeek = getDay(new Date(year, month - 1, 1));
  const todayStr = dfFormat(new Date(), 'yyyy-MM-dd');

  const dayMap = new Map(days.map((d) => [d.date, d]));

  const cells: (CalendarDay | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      return (
        dayMap.get(dateStr) ?? {
          date: dateStr,
          prayedCount: 0,
          makeupCount: 0,
          isFinalized: false,
          status: 'no-data' as const,
        }
      );
    }),
  ];

  const statusBgFg = (status: string) => {
    switch (status) {
      case 'complete':
        return { bg: theme.accent, fg: '#FFFFFF' };
      case 'partial':
        return { bg: theme.accentLight, fg: theme.accent };
      case 'missed':
        return { bg: theme.errorLight, fg: theme.error };
      default:
        return { bg: 'transparent', fg: theme.text };
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS_AR.map((d) => (
          <View
            key={d}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
          >
            <Text
              style={{
                ...typography.caption,
                fontSize: 11,
                color: theme.textTertiary,
                fontWeight: '600',
              }}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((cell, i) => {
          if (!cell) {
            return <View key={`empty-${i}`} style={{ width: '14.28%', height: 46 }} />;
          }

          const dayNum = parseISO(cell.date).getDate();
          const isToday = cell.date === todayStr;
          const isFuture = cell.status === 'future';
          const { bg, fg } = statusBgFg(cell.status);

          return (
            <Pressable
              key={cell.date}
              disabled={isFuture}
              onPress={() => {
                lightImpact();
                onDayPress(cell.date);
              }}
              style={({ pressed }) => ({
                width: '14.28%',
                height: 46,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : isFuture ? 0.3 : 1,
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.pill,
                  backgroundColor: bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isToday ? 2 : 0,
                  borderColor: isToday ? theme.primary : undefined,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isToday ? '700' : '600',
                    color: bg === 'transparent' ? theme.text : fg,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {format.toArabicDigits(dayNum)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DayDetailDrawer({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const theme = colors.light;

  const { data: dayDetail, isLoading: detailLoading } = useCalendarDayDetail(date);
  const { data: tracker, isLoading: trackerLoading } = useDateTracker(
    dayDetail && !dayDetail.isGapDay ? date : '',
  );
  const markPrayers = useMarkPrayers();
  const logMakeupForDay = useLogMakeupForDay();

  const handleTogglePrayer = useCallback(
    (prayerType: string) => {
      if (!tracker) return;
      const key = prayerType.toLowerCase() as keyof typeof tracker;
      const current = tracker[key] as boolean;
      const prayers: MarkPrayersPayload = { [key]: !current };
      markPrayers.mutate({ date, prayers });
    },
    [tracker, date, markPrayers],
  );

  const handleLogMakeup = useCallback(
    (prayerType: string) => {
      successNotification();
      logMakeupForDay.mutate({ date, prayerType });
    },
    [date, logMakeupForDay],
  );

  const isLoading = detailLoading || trackerLoading;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return { label: 'مكتمل', bg: theme.accentLight, color: theme.accent };
      case 'partial':
        return { label: 'قيد التقدم', bg: theme.primaryLight, color: theme.primary };
      default:
        return { label: 'لم يبدأ', bg: theme.errorLight, color: theme.error };
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(26,54,93,0.4)' }}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: theme.background,
          borderTopLeftRadius: radii['2xl'],
          borderTopRightRadius: radii['2xl'],
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing['4xl'],
          maxHeight: '72%',
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.borderStrong,
            }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <Text style={[typography.h3, { color: theme.text }]}>
            {dfFormat(parseISO(date), 'EEEE, MMMM d')}
          </Text>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color={theme.textTertiary} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : dayDetail?.isGapDay ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: spacing.md }}>
              {(() => {
                const badge = statusBadge(dayDetail.status);
                return (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: badge.bg,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: radii.pill,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.caption,
                        fontWeight: '700',
                        color: badge.color,
                      }}
                    >
                      {badge.label}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <Text
              style={[
                typography.h3,
                { color: theme.text, marginBottom: spacing.sm, textAlign: 'right' },
              ]}
            >
              صلوات القضاء
            </Text>
            <View style={{ gap: spacing.sm }}>
              {PRAYER_TYPES.map((type) => {
                const key = type.toLowerCase() as keyof NonNullable<typeof dayDetail.prayers>;
                const completed = dayDetail.prayers ? dayDetail.prayers[key] : false;
                const isLogging =
                  logMakeupForDay.isPending &&
                  logMakeupForDay.variables?.prayerType === type;

                return (
                  <Pressable
                    key={type}
                    disabled={completed || isLogging}
                    onPress={() => handleLogMakeup(type)}
                    style={({ pressed }) => ({
                      backgroundColor: theme.card,
                      borderRadius: radii.lg,
                      padding: 14,
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      gap: spacing.md,
                      borderWidth: 1.5,
                      borderColor: completed ? theme.accent : theme.border,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <PrayerIcon
                      name={key as PrayerName}
                      size={40}
                      tone={completed ? 'gold' : 'muted'}
                    />
                    <Text
                      style={{
                        ...typography.bodyLg,
                        flex: 1,
                        fontWeight: '700',
                        color: theme.text,
                        textAlign: 'right',
                      }}
                    >
                      {PRAYER_NAMES[type].ar}
                    </Text>
                    {isLogging ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : completed ? (
                      <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
                    ) : (
                      <Text style={[typography.caption, { color: theme.primary, fontWeight: '700' }]}>
                        سجّل
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : tracker ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text
              style={[
                typography.h3,
                { color: theme.text, marginBottom: spacing.sm, textAlign: 'right' },
              ]}
            >
              صلوات اليوم
            </Text>
            <View style={{ gap: spacing.sm }}>
              {PRAYER_TYPES.map((type) => {
                const key = type.toLowerCase() as keyof typeof tracker;
                const completed = tracker[key] as boolean;
                const isToggling =
                  markPrayers.isPending &&
                  !!markPrayers.variables?.prayers &&
                  key in markPrayers.variables.prayers;

                return (
                  <Pressable
                    key={type}
                    onPress={() => handleTogglePrayer(type)}
                    disabled={isToggling}
                    style={({ pressed }) => ({
                      backgroundColor: theme.card,
                      borderRadius: radii.lg,
                      padding: 14,
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      gap: spacing.md,
                      borderWidth: 1.5,
                      borderColor: completed ? theme.accent : theme.border,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <PrayerIcon
                      name={key as PrayerName}
                      size={40}
                      tone={completed ? 'gold' : 'muted'}
                    />
                    <Text
                      style={{
                        ...typography.bodyLg,
                        flex: 1,
                        fontWeight: '700',
                        color: theme.text,
                        textAlign: 'right',
                      }}
                    >
                      {PRAYER_NAMES[type].ar}
                    </Text>
                    {isToggling ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons
                        name={completed ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={completed ? theme.accent : theme.textTertiary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <Text style={{ ...typography.body, color: theme.textSecondary }}>
              لا توجد بيانات متابعة لهذا اليوم
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

export default function CalendarScreen() {
  const theme = colors.light;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: calendarDays } = useCalendarMonth(year, month);

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else setMonth(month + 1);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'التقويم' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
      >
        <BrandCard>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Pressable onPress={prevMonth} style={{ padding: 8 }}>
              <Ionicons name="chevron-forward" size={20} color={theme.primary} />
            </Pressable>
            <Text style={[typography.h3, { color: theme.text }]}>
              {dfFormat(new Date(year, month - 1), 'MMMM yyyy')}
            </Text>
            <Pressable onPress={nextMonth} style={{ padding: 8 }}>
              <Ionicons name="chevron-back" size={20} color={theme.primary} />
            </Pressable>
          </View>

          <CalendarGrid
            year={year}
            month={month}
            days={calendarDays ?? []}
            onDayPress={setSelectedDate}
          />
        </BrandCard>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.lg,
          }}
        >
          {[
            { label: 'مكتمل', color: theme.accent },
            { label: 'جزئي', color: theme.accentLight, fg: theme.accent },
            { label: 'فائت', color: theme.errorLight, fg: theme.error },
          ].map((item) => (
            <View
              key={item.label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: item.color,
                }}
              />
              <Text style={[typography.caption, { color: theme.textSecondary }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {selectedDate && (
        <DayDetailDrawer
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </>
  );
}
