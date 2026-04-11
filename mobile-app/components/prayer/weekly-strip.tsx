import { ScrollView, View, Text } from 'react-native';
import { parseISO } from 'date-fns';
import type { DailyTrackerData } from '@/services/daily-tracker';
import { colors, format, radii, typography } from '@/constants/theme';

const AR_WEEKDAYS_SHORT = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

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
      contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
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
        const full = completed === 5;
        const partial = completed > 0 && completed < 5;

        const bg = full
          ? theme.accent
          : partial
            ? theme.accentLight
            : theme.surfaceAlt;
        const fg = full
          ? '#FFFFFF'
          : partial
            ? theme.accent
            : theme.textTertiary;

        return (
          <View
            key={day.date}
            style={{ alignItems: 'center', gap: 6, width: 46 }}
          >
            <Text
              style={{
                ...typography.caption,
                fontSize: 11,
                color: theme.textSecondary,
              }}
            >
              {AR_WEEKDAYS_SHORT[parseISO(day.date).getDay()]}
            </Text>
            <View
              style={{
                width: 40,
                height: 40,
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
                  fontSize: 14,
                  fontWeight: '700',
                  color: fg,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {format.toArabicDigits(completed)}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
