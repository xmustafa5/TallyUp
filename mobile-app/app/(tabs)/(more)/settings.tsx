import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth.store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/use-notifications';
import { colors, radii, spacing, typography } from '@/constants/theme';

function SettingsRow({
  label,
  value,
  onPress,
  icon,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = colors.light;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon && <Ionicons name={icon} size={20} color={theme.primary} />}
      <Text
        style={{
          ...typography.body,
          flex: 1,
          color: theme.text,
          textAlign: 'right',
        }}
      >
        {label}
      </Text>
      {value && (
        <Text style={[typography.caption, { color: theme.textSecondary }]}>
          {value}
        </Text>
      )}
      {onPress && (
        <Ionicons name="chevron-back" size={18} color={theme.textTertiary} />
      )}
    </Pressable>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const theme = colors.light;
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={[typography.body, { color: theme.text, textAlign: 'right' }]}
        >
          {label}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: theme.textSecondary, textAlign: 'right' },
          ]}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.surfaceAlt, true: theme.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  const theme = colors.light;
  return (
    <Text
      style={{
        ...typography.caption,
        color: theme.textSecondary,
        fontWeight: '700',
        paddingHorizontal: 16,
        paddingVertical: 8,
        textAlign: 'right',
      }}
    >
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  const theme = colors.light;
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { data: prefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: () => {
          clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'الإعدادات' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{
          paddingBottom: spacing['4xl'],
          gap: spacing['2xl'],
          paddingTop: spacing.md,
        }}
      >
        <View>
          <SectionLabel>الملف الشخصي</SectionLabel>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              marginHorizontal: spacing.lg,
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(26,54,93,0.06)',
            }}
          >
            <SettingsRow
              label="الاسم"
              value={user?.name}
              icon="person"
              onPress={() =>
                router.push('/(tabs)/(more)/settings/profile' as any)
              }
            />
            <View
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginLeft: 16,
                marginRight: 48,
              }}
            />
            <SettingsRow label="البريد الإلكتروني" value={user?.email} icon="mail" />
          </View>
        </View>

        {prefs && (
          <View>
            <SectionLabel>الإشعارات</SectionLabel>
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: radii.xl,
                borderCurve: 'continuous',
                marginHorizontal: spacing.lg,
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(26,54,93,0.06)',
              }}
            >
              <ToggleRow
                label="تذكيرات الصلاة"
                description="تذكير يومي بأوقات الصلاة"
                value={prefs.prayerReminders}
                onValueChange={(v) =>
                  updatePrefs.mutate({ prayerReminders: v })
                }
              />
              <View
                style={{
                  height: 1,
                  backgroundColor: theme.border,
                  marginHorizontal: 16,
                }}
              />
              <ToggleRow
                label="تذكيرات الأهداف"
                description="عند التأخر عن الأهداف"
                value={prefs.goalReminders}
                onValueChange={(v) =>
                  updatePrefs.mutate({ goalReminders: v })
                }
              />
              <View
                style={{
                  height: 1,
                  backgroundColor: theme.border,
                  marginHorizontal: 16,
                }}
              />
              <ToggleRow
                label="تذكيرات السلسلة"
                description="تذكيرات مسائية"
                value={prefs.streakReminders}
                onValueChange={(v) =>
                  updatePrefs.mutate({ streakReminders: v })
                }
              />
              <View
                style={{
                  height: 1,
                  backgroundColor: theme.border,
                  marginHorizontal: 16,
                }}
              />
              <ToggleRow
                label="الإنجازات"
                description="إشعارات عند بلوغ المراحل"
                value={prefs.milestones}
                onValueChange={(v) => updatePrefs.mutate({ milestones: v })}
              />
            </View>
          </View>
        )}

        <View>
          <SectionLabel>الحساب</SectionLabel>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              marginHorizontal: spacing.lg,
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(26,54,93,0.06)',
            }}
          >
            <SettingsRow
              label="تغيير كلمة المرور"
              icon="lock-closed"
              onPress={() =>
                router.push('/(tabs)/(more)/settings/password' as any)
              }
            />
            <View
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginLeft: 16,
                marginRight: 48,
              }}
            />
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => ({
                flexDirection: 'row-reverse',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 16,
                gap: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="log-out" size={20} color={theme.error} />
              <Text
                style={[
                  typography.body,
                  { color: theme.error, flex: 1, textAlign: 'right' },
                ]}
              >
                تسجيل الخروج
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
