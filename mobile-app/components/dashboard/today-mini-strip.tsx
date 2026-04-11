import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import { colors, format, radii, typography } from '@/constants/theme';
import { PrayerIcon, type PrayerName } from '@/components/ui/prayer-icon';

interface TodayMiniStripProps {
  todayStatus: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
    completedCount: number;
  } | null;
}

export function TodayMiniStrip({ todayStatus }: TodayMiniStripProps) {
  const theme = colors.light;

  return (
    <Pressable
      onPress={() => router.navigate('/(tabs)/(today)')}
      style={{
        backgroundColor: theme.card,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        padding: 18,
        gap: 14,
        boxShadow: '0 4px 16px rgba(26,54,93,0.06)',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={[typography.h3, { color: theme.text }]}>
          صلوات اليوم
        </Text>
        <Text
          style={{
            ...typography.caption,
            color: theme.textSecondary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {format.toArabicDigits(todayStatus?.completedCount ?? 0)}/{format.toArabicDigits(5)}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        {PRAYER_TYPES.map((type) => {
          const key = type.toLowerCase() as keyof NonNullable<typeof todayStatus>;
          const isDone = todayStatus ? (todayStatus[key] as boolean) : false;

          return (
            <View key={type} style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ position: 'relative' }}>
                <PrayerIcon
                  name={type.toLowerCase() as PrayerName}
                  size={44}
                  tone={isDone ? 'gold' : 'muted'}
                />
                {isDone && (
                  <View
                    style={{
                      position: 'absolute',
                      right: -2,
                      bottom: -2,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: theme.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: theme.card,
                    }}
                  >
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text
                style={{
                  ...typography.caption,
                  color: isDone ? theme.text : theme.textSecondary,
                  fontSize: 11,
                }}
              >
                {PRAYER_NAMES[type].ar}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}
