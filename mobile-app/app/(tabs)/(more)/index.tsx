import { View, Text, Pressable, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { selectionFeedback } from '@/lib/haptics';
import { ScreenHeader } from '@/components/ui/screen-header';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';

interface MenuItem {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
}

export default function MoreScreen() {
  const theme = colors.light;
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const menuItems: MenuItem[] = [
    {
      title: 'الإشعارات',
      subtitle: 'تنبيهات الصلاة والأهداف',
      icon: 'notifications',
      route: '/(tabs)/(more)/notifications',
      badge: unreadCount,
    },
    {
      title: 'التقويم',
      subtitle: 'نظرة شهرية على الصلوات',
      icon: 'calendar',
      route: '/(tabs)/(more)/calendar',
    },
    {
      title: 'فترات الانقطاع',
      subtitle: 'إدارة فترات الانقطاع عن الصلاة',
      icon: 'time',
      route: '/(tabs)/(more)/gap-periods',
    },
    {
      title: 'الأهداف',
      subtitle: 'أهداف يومية وأسبوعية',
      icon: 'trophy',
      route: '/(tabs)/(more)/schedule',
    },
    {
      title: 'الإعدادات',
      subtitle: 'الملف الشخصي، الإشعارات، الحساب',
      icon: 'settings',
      route: '/(tabs)/(more)/settings',
    },
  ];

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
              {item.badge !== undefined && item.badge > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 4,
                    borderRadius: 10,
                    backgroundColor: theme.error,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: '700',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Text>
                </View>
              )}
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
