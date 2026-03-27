import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  const theme = colors.light;
  const isActive = currentStreak > 0;

  return (
    <View
      style={{
        backgroundColor: isActive ? theme.streakLight : theme.card,
        borderRadius: 16,
        borderCurve: 'continuous',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: isActive ? theme.streak : theme.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name="flame"
          size={24}
          color={isActive ? '#FFFFFF' : theme.textTertiary}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text
            selectable
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: isActive ? theme.streak : theme.text,
              fontVariant: ['tabular-nums'],
            }}
          >
            {currentStreak}
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>
            day{currentStreak !== 1 ? 's' : ''} streak
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: theme.textTertiary }}>
          Longest: {longestStreak} day{longestStreak !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}
