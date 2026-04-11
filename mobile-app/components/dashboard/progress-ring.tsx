import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, format, typography } from '@/constants/theme';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  centerValue?: string | number;
  centerLabel?: string;
}

export function ProgressRing({
  percentage,
  size = 200,
  strokeWidth = 16,
  centerValue,
  centerLabel,
}: ProgressRingProps) {
  const theme = colors.light;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const display =
    centerValue !== undefined
      ? typeof centerValue === 'number'
        ? format.toArabicDigits(centerValue)
        : centerValue
      : `${format.toArabicDigits(Math.round(pct))}٪`;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E8BF5A" />
            <Stop offset="100%" stopColor="#A67716" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.surfaceAlt}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGold)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Text
          selectable
          style={{
            ...typography.display,
            color: theme.text,
            fontVariant: ['tabular-nums'],
          }}
        >
          {display}
        </Text>
        {centerLabel && (
          <Text
            style={{
              ...typography.caption,
              color: theme.textSecondary,
            }}
          >
            {centerLabel}
          </Text>
        )}
      </View>
    </View>
  );
}
