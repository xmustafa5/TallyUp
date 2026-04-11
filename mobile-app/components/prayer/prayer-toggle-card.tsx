import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightImpact } from '@/lib/haptics';
import { colors, radii, typography } from '@/constants/theme';
import { PrayerIcon, type PrayerName } from '@/components/ui/prayer-icon';

interface PrayerToggleCardProps {
  name: string;
  prayerKey?: PrayerName;
  completed: boolean;
  loading?: boolean;
  onToggle: () => void;
}

export function PrayerToggleCard({
  name,
  prayerKey,
  completed,
  loading = false,
  onToggle,
}: PrayerToggleCardProps) {
  const theme = colors.light;

  const handlePress = () => {
    lightImpact();
    onToggle();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={({ pressed }) => ({
        backgroundColor: theme.card,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1.5,
        borderColor: completed ? theme.accent : theme.border,
        boxShadow: '0 2px 8px rgba(26,54,93,0.05)',
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: completed ? theme.accent : theme.borderStrong,
          backgroundColor: completed ? theme.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={completed ? '#FFFFFF' : theme.textTertiary}
          />
        ) : completed ? (
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
        ) : null}
      </View>
      <Text
        style={{
          ...typography.bodyLg,
          flex: 1,
          fontWeight: '700',
          color: theme.text,
          textAlign: 'right',
        }}
      >
        {name}
      </Text>
      {prayerKey && (
        <PrayerIcon
          name={prayerKey}
          size={40}
          tone={completed ? 'gold' : 'muted'}
        />
      )}
    </Pressable>
  );
}
