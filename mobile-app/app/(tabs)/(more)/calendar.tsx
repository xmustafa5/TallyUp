import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, getDaysInMonth, getDay, parseISO } from 'date-fns';
import { useCalendarMonth, useCalendarDayDetail } from '@/hooks/use-progress';
import { useDateTracker, useMarkPrayers } from '@/hooks/use-daily-tracker';
import { useLogMakeupForDay } from '@/hooks/use-makeup';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import { colors } from '@/constants/theme';
import { lightImpact, successNotification } from '@/lib/haptics';
import type { CalendarDay } from '@/services/progress';
import type { MarkPrayersPayload } from '@/services/daily-tracker';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const dayMap = new Map(days.map((d) => [d.date, d]));

  const cells: (CalendarDay | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      return dayMap.get(dateStr) ?? {
        date: dateStr,
        prayedCount: 0,
        makeupCount: 0,
        isFinalized: false,
        status: 'no-data' as const,
      };
    }),
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case 'complete': return theme.success;
      case 'partial': return theme.warning;
      case 'missed': return theme.error;
      default: return theme.textTertiary;
    }
  };

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, color: theme.textTertiary, fontWeight: '500' }}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((cell, i) => {
          if (!cell) {
            return <View key={`empty-${i}`} style={{ width: '14.28%', height: 44 }} />;
          }

          const dayNum = parseISO(cell.date).getDate();
          const isToday = cell.date === todayStr;
          const isFuture = cell.status === 'future';

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
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : isFuture ? 0.3 : 1,
              })}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: isToday ? theme.primary : undefined,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isToday ? '700' : '400',
                    color: theme.text,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {dayNum}
                </Text>
              </View>
              {cell.status !== 'no-data' && cell.status !== 'future' && (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: statusColor(cell.status),
                    marginTop: -2,
                  }}
                />
              )}
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
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isToday = date === todayStr;

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
    [tracker, date],
  );

  const handleLogMakeup = useCallback(
    (prayerType: string) => {
      successNotification();
      logMakeupForDay.mutate({ date, prayerType });
    },
    [date],
  );

  const isLoading = detailLoading || trackerLoading;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return { label: 'Fully made up', bg: theme.successLight, color: theme.success };
      case 'partial':
        return { label: 'In progress', bg: theme.warningLight, color: theme.warning };
      default:
        return { label: 'Not yet made up', bg: theme.errorLight, color: theme.error };
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: theme.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 40,
          maxHeight: '70%',
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.border,
            }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
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
          <ScrollView style={{ gap: 12 }} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 12 }}>
              {(() => {
                const badge = statusBadge(dayDetail.status);
                return (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: badge.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: badge.color }}>
                      {badge.label}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
              Qadha Prayers
            </Text>
            <View style={{ gap: 8 }}>
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
                      backgroundColor: completed ? theme.successLight : theme.card,
                      borderRadius: 12,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: pressed ? 0.7 : 1,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '500',
                        color: completed ? theme.success : theme.text,
                      }}
                    >
                      {PRAYER_NAMES[type].en}
                    </Text>
                    {isLogging ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : completed ? (
                      <Ionicons name="checkmark-circle" size={22} color={theme.success} />
                    ) : (
                      <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '500' }}>
                        Tap to log
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : tracker ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
              Daily Prayers
            </Text>
            <View style={{ gap: 8 }}>
              {PRAYER_TYPES.map((type) => {
                const key = type.toLowerCase() as keyof typeof tracker;
                const completed = tracker[key] as boolean;
                const isToggling =
                  markPrayers.isPending &&
                  markPrayers.variables?.prayers &&
                  key in markPrayers.variables.prayers;

                return (
                  <Pressable
                    key={type}
                    onPress={() => handleTogglePrayer(type)}
                    disabled={isToggling}
                    style={({ pressed }) => ({
                      backgroundColor: completed ? theme.successLight : theme.card,
                      borderRadius: 12,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: pressed ? 0.7 : 1,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '500',
                        color: completed ? theme.success : theme.text,
                      }}
                    >
                      {PRAYER_NAMES[type].en}
                    </Text>
                    {isToggling ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons
                        name={completed ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={completed ? theme.success : theme.textTertiary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: theme.textSecondary }}>
              No tracking data for this date.
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
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Calendar' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Pressable onPress={prevMonth} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>
            {format(new Date(year, month - 1), 'MMMM yyyy')}
          </Text>
          <Pressable onPress={nextMonth} style={{ padding: 8 }}>
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </Pressable>
        </View>

        <View>
          <CalendarGrid
            year={year}
            month={month}
            days={calendarDays ?? []}
            onDayPress={setSelectedDate}
          />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          {[
            { label: 'Complete', color: theme.success },
            { label: 'Partial', color: theme.warning },
            { label: 'Missed', color: theme.error },
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: item.color,
                }}
              />
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>{item.label}</Text>
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
