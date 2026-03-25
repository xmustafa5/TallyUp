import { ScrollView, View, Text } from 'react-native';
import { format, parseISO } from 'date-fns';
import type { DailyTrackerData } from '@/services/daily-tracker';
import { colors } from '@/constants/theme';

interface WeeklyStripProps {
  weekData: DailyTrackerData[];
  today: string;
}

export function WeeklyStrip({ weekData, today }: WeeklyStripProps) {
  const theme = colors.light;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: 8,
        paddingHorizontal: 4,
      }}
    >
      {weekData.map((day) => {
        const completed = [
          day.fajr,
          day.dhuhr,
          day.asr,
          day.maghrib,
          day.isha,
        ].filter(Boolean).length;
        const isToday = day.date === today;
        const bgColor =
          completed === 5
            ? theme.successLight
            : completed > 0
              ? theme.warningLight
              : theme.surfaceAlt;
        const textColor =
          completed === 5
            ? theme.success
            : completed > 0
              ? theme.warning
              : theme.textTertiary;

        return (
          <View
            key={day.date}
            style={{
              alignItems: 'center',
              gap: 4,
              width: 44,
            }}
          >
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>
              {format(parseISO(day.date), 'EEE')}
            </Text>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: bgColor,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: isToday ? 2 : 0,
                borderColor: isToday ? theme.primary : undefined,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: textColor,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {completed}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 10,
                color: theme.textTertiary,
              }}
            >
              /5
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
