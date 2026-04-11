import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, format, radii, typography } from '@/constants/theme';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  variant?: 'pill' | 'full';
}

export function StreakCard({
  currentStreak,
  longestStreak,
  variant = 'full',
}: StreakCardProps) {
  const theme = colors.light;
  const isActive = currentStreak > 0;

  if (variant === 'pill') {
    return (
      <View
        style={{
          backgroundColor: theme.streakLight,
          borderRadius: radii.pill,
          paddingVertical: 10,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'center',
        }}
      >
        <Ionicons name="flame" size={18} color={theme.streak} />
        <Text
          selectable
          style={[
            typography.label,
            { color: theme.streak, fontVariant: ['tabular-nums'] },
          ]}
        >
          {format.toArabicDigits(currentStreak)} أيام متتالية
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: isActive ? theme.streakLight : theme.card,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 4px 16px rgba(26,54,93,0.06)',
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radii.pill,
          backgroundColor: isActive ? theme.streak : theme.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name="flame"
          size={26}
          color={isActive ? '#FFFFFF' : theme.textTertiary}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text
            selectable
            style={{
              ...typography.h1,
              color: isActive ? theme.streak : theme.text,
              fontVariant: ['tabular-nums'],
            }}
          >
            {format.toArabicDigits(currentStreak)}
          </Text>
          <Text style={[typography.body, { color: theme.textSecondary }]}>
            أيام متتالية
          </Text>
        </View>
        <Text style={[typography.caption, { color: theme.textTertiary }]}>
          الأطول: {format.toArabicDigits(longestStreak)} يوم
        </Text>
      </View>
    </View>
  );
}
