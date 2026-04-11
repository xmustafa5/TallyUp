import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '@/constants/theme';

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

interface PrayerIconProps {
  name: PrayerName;
  size?: number;
  tone?: 'gold' | 'teal' | 'muted';
}

const iconMap: Record<PrayerName, keyof typeof Ionicons.glyphMap> = {
  fajr: 'partly-sunny-outline',
  dhuhr: 'sunny',
  asr: 'sunny-outline',
  maghrib: 'moon-outline',
  isha: 'moon',
};

export function PrayerIcon({ name, size = 44, tone = 'gold' }: PrayerIconProps) {
  const theme = colors.light;
  const bg =
    tone === 'gold'
      ? theme.accentLight
      : tone === 'teal'
        ? theme.primaryLight
        : theme.surfaceAlt;
  const fg =
    tone === 'gold'
      ? theme.accent
      : tone === 'teal'
        ? theme.primary
        : theme.textSecondary;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radii.pill,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={iconMap[name]} size={Math.round(size * 0.55)} color={fg} />
    </View>
  );
}
