import { Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { colors, radii, typography } from '@/constants/theme';
import { lightImpact } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Check-in button with a scale press-feedback (Reanimated) + iOS haptic.
 */
export function CheckinButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
  disabled?: boolean;
}) {
  const t = colors.light;
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={() => {
        lightImpact();
        scale.value = withSequence(
          withTiming(0.94, { duration: 90 }),
          withSpring(1),
        );
        onPress();
      }}
      style={[
        style,
        {
          flexGrow: 1,
          minWidth: 64,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          paddingHorizontal: 18,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          backgroundColor: isPrimary ? t.primary : t.surface,
          borderWidth: isPrimary ? 0 : 1.5,
          borderColor: t.primary,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text
        style={[
          typography.bodyLg,
          { color: isPrimary ? '#FFFFFF' : t.primary, fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
