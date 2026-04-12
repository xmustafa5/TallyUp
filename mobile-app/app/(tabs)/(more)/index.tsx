import { View, Text, Pressable, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { selectionFeedback } from '@/lib/haptics';
import { ScreenHeader } from '@/components/ui/screen-header';
import { colors, radii, spacing, typography } from '@/constants/theme';

const menuItems = [
  {
    title: 'التقويم',
    subtitle: 'نظرة شهرية على الصلوات',
    icon: 'calendar' as const,
    route: '/(tabs)/(more)/calendar',
  },
  {
    title: 'فترات الانقطاع',
    subtitle: 'إدارة فترات الانقطاع عن الصلاة',
    icon: 'time' as const,
    route: '/(tabs)/(more)/gap-periods',
  },
  {
    title: 'الأهداف',
    subtitle: 'أهداف يومية وأسبوعية',
    icon: 'trophy' as const,
    route: '/(tabs)/(more)/schedule',
  },
  {
    title: 'الإعدادات',
    subtitle: 'الملف الشخصي، الإشعارات، الحساب',
    icon: 'settings' as const,
    route: '/(tabs)/(more)/settings',
  },
];

export default function MoreScreen() {
  const theme = colors.light;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="المزيد" />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{
          padding: spacing.xl,
          paddingTop: spacing.sm,
          gap: spacing.md,
          paddingBottom: spacing['4xl'],
        }}
      >
        {menuItems.map((item) => (
          <Pressable
            key={item.title}
            onPress={() => {
              selectionFeedback();
              router.push(item.route as any);
            }}
            style={({ pressed }) => ({
              backgroundColor: theme.card,
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              padding: spacing.lg,
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: spacing.md,
              opacity: pressed ? 0.75 : 1,
              boxShadow: '0 4px 16px rgba(26,54,93,0.06)',
            })}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radii.md,
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
                style={[typography.h3, { color: theme.text, textAlign: 'right' }]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: theme.textSecondary, textAlign: 'right' },
                ]}
              >
                {item.subtitle}
              </Text>
            </View>
            <Ionicons
              name="chevron-back"
              size={20}
              color={theme.textTertiary}
            />
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}
