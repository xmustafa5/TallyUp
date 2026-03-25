import { View, Text, Pressable, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { selectionFeedback } from '@/lib/haptics';
import { colors } from '@/constants/theme';

const menuItems = [
  {
    title: 'Calendar',
    subtitle: 'Monthly prayer overview',
    icon: 'calendar' as const,
    route: '/(tabs)/(more)/calendar',
  },
  {
    title: 'Gap Periods',
    subtitle: 'Manage your prayer gaps',
    icon: 'time' as const,
    route: '/(tabs)/(more)/gap-periods',
  },
  {
    title: 'Goals',
    subtitle: 'Daily and weekly targets',
    icon: 'trophy' as const,
    route: '/(tabs)/(more)/schedule',
  },
  {
    title: 'Settings',
    subtitle: 'Profile, notifications, account',
    icon: 'settings' as const,
    route: '/(tabs)/(more)/settings',
  },
];

export default function MoreScreen() {
  const theme = colors.light;

  return (
    <>
      <Stack.Screen options={{ title: 'More' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 20,
          gap: 12,
        }}
      >
        {menuItems.map((item, index) => (
          <Animated.View
            key={item.title}
            entering={FadeInDown.duration(300).delay(index * 80)}
          >
            <Pressable
              onPress={() => {
                selectionFeedback();
                router.push(item.route as any);
              }}
              style={({ pressed }) => ({
                backgroundColor: theme.card,
                borderRadius: 14,
                borderCurve: 'continuous',
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                opacity: pressed ? 0.7 : 1,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: theme.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={item.icon} size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: theme.text,
                  }}
                >
                  {item.title}
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.textTertiary}
              />
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </>
  );
}
