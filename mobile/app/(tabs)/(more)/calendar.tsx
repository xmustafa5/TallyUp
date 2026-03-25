import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { format, getDaysInMonth, getDay, parseISO } from 'date-fns';
import { useCalendarMonth } from '@/hooks/use-progress';
import { colors } from '@/constants/theme';
import type { CalendarDay } from '@/services/progress';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarGrid({
  year,
  month,
  days,
}: {
  year: number;
  month: number;
  days: CalendarDay[];
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

          return (
            <View
              key={cell.date}
              style={{
                width: '14.28%',
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function CalendarScreen() {
  const theme = colors.light;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

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

        <Animated.View entering={FadeIn.duration(300)}>
          <CalendarGrid
            year={year}
            month={month}
            days={calendarDays ?? []}
          />
        </Animated.View>

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
    </>
  );
}
