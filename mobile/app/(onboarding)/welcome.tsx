import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { colors } from '@/constants/theme';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = colors.light;

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
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <Animated.View
          entering={FadeInDown.duration(600).delay(200)}
          style={{ alignItems: 'center', gap: 16 }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              borderCurve: 'continuous',
              backgroundColor: theme.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 36 }}>&#x1F54C;</Text>
          </View>
          <Text
            style={{
              fontSize: 34,
              fontWeight: '700',
              color: theme.text,
              textAlign: 'center',
            }}
          >
            Welcome to Qatha
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={{ gap: 20 }}
        >
          <Text
            style={{
              fontSize: 17,
              color: theme.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
            Track and make up your missed prayers systematically. We'll help you
            calculate what you owe and track your progress.
          </Text>

          <View style={{ gap: 12 }}>
            {[
              'Calculate your missed prayers',
              'Track daily prayers',
              'Log makeup prayers with one tap',
              'See your progress over time',
            ].map((item, index) => (
              <Animated.View
                key={item}
                entering={FadeInDown.duration(400).delay(600 + index * 100)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 8,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: theme.successLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: theme.success, fontSize: 14, fontWeight: '600' }}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, color: theme.text, flex: 1 }}>
                  {item}
                </Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.duration(600).delay(1000)}>
        <Button
          title="Get Started"
          onPress={() => router.push('/(onboarding)/setup')}
        />
      </Animated.View>
    </View>
  );
}
