import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { usePrayerBalance } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { colors } from '@/constants/theme';
import { PRAYER_NAMES, PRAYER_TYPES } from '@/constants/prayers';

function AnimatedNumber({ target }: { target: number }) {
  const theme = colors.light;
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(target, { duration: 1500 });
  }, [target]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  return (
    <Animated.Text
      style={[
        {
          fontSize: 48,
          fontWeight: '700',
          color: theme.primary,
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
        },
        animatedStyle,
      ]}
      selectable
    >
      {target.toLocaleString()}
    </Animated.Text>
  );
}

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const theme = colors.light;
  const { data: balance } = usePrayerBalance();

  const totalRemaining = balance?.totalRemaining ?? 0;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        paddingHorizontal: 24,
        paddingTop: insets.top + 60,
        paddingBottom: insets.bottom + 24,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 32 }}>
        <Animated.View
          entering={FadeInDown.duration(600).delay(200)}
          style={{ alignItems: 'center', gap: 8 }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '500',
              color: theme.textSecondary,
            }}
          >
            Your total missed prayers
          </Text>
          <AnimatedNumber target={totalRemaining} />
          <Text
            style={{
              fontSize: 16,
              color: theme.textSecondary,
            }}
          >
            prayers to make up
          </Text>
        </Animated.View>

        {balance && (
          <Animated.View
            entering={FadeInDown.duration(600).delay(800)}
            style={{
              backgroundColor: theme.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 20,
              gap: 12,
            }}
          >
            {PRAYER_TYPES.map((type) => {
              const key = type.toLowerCase() as keyof typeof balance;
              const count = (balance[key] as number) ?? 0;

              return (
                <View
                  key={type}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: theme.text,
                      fontWeight: '500',
                    }}
                  >
                    {PRAYER_NAMES[type].en}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: theme.primary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {count.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(600).delay(1200)}>
          <Text
            style={{
              fontSize: 16,
              color: theme.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            Let us help you make these up, one prayer at a time.
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.duration(600).delay(1500)}>
        <Button
          title="Start Your Journey"
          onPress={() => router.replace('/(tabs)/(home)')}
        />
      </Animated.View>
    </View>
  );
}
