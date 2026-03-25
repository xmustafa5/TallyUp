import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRAYER_TYPES, PRAYER_NAMES } from '@/constants/prayers';
import { colors } from '@/constants/theme';

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
        borderRadius: 16,
        borderCurve: 'continuous',
        padding: 16,
        gap: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
          Today's Prayers
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: theme.textSecondary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {todayStatus?.completedCount ?? 0}/5
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
        }}
      >
        {PRAYER_TYPES.map((type) => {
          const key = type.toLowerCase() as keyof NonNullable<typeof todayStatus>;
          const isDone = todayStatus ? (todayStatus[key] as boolean) : false;

          return (
            <View key={type} style={{ alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDone
                    ? theme.successLight
                    : theme.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={18} color={theme.success} />
                ) : (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.textTertiary,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 11,
                  color: theme.textSecondary,
                }}
              >
                {PRAYER_NAMES[type].en.slice(0, 3)}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}
