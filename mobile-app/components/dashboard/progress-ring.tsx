import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/constants/theme';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({
  percentage,
  size = 180,
  strokeWidth = 14,
}: ProgressRingProps) {
  const theme = colors.light;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
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
          stroke={theme.primary}
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
          gap: 2,
        }}
      >
        <Text
          selectable
          style={{
            fontSize: 36,
            fontWeight: '700',
            color: theme.text,
            fontVariant: ['tabular-nums'],
          }}
        >
          {Math.round(percentage)}%
        </Text>
        <Text style={{ fontSize: 13, color: theme.textSecondary }}>
          completed
        </Text>
      </View>
    </View>
  );
}
