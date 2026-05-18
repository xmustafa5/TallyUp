import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, radii } from '@/constants/theme';

/**
 * Animated progress bar. `percent` is 0-100. The fill animates with a
 * cubic ease-out (Reanimated, per project rules -- never RN Animated).
 */
export function ProgressBar({
  percent,
  height = 8,
  trackColor,
  fillColor,
}: {
  percent: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
}) {
  const t = colors.light;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(100, percent)), {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View
      style={{
        height,
        backgroundColor: trackColor ?? t.surfaceAlt,
        borderRadius: radii.pill,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            backgroundColor: fillColor ?? t.primary,
            borderRadius: radii.pill,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}
