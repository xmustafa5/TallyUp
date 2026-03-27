import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth.store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/use-notifications';
import { colors } from '@/constants/theme';

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
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon && <Ionicons name={icon} size={20} color={theme.textSecondary} />}
      <Text style={{ flex: 1, fontSize: 15, color: theme.text }}>{label}</Text>
      {value && (
        <Text style={{ fontSize: 14, color: theme.textSecondary }}>{value}</Text>
      )}
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, color: theme.text }}>{label}</Text>
        <Text style={{ fontSize: 12, color: theme.textSecondary }}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export default function SettingsScreen() {
  const theme = colors.light;
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { data: prefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
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
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40, gap: 24, paddingTop: 12 }}
      >
        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: theme.textSecondary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              textTransform: 'uppercase',
            }}
          >
            Profile
          </Text>
          <View style={{ backgroundColor: theme.card }}>
            <SettingsRow
              label="Name"
              value={user?.name}
              icon="person"
              onPress={() => router.push('/(tabs)/(more)/settings/profile' as any)}
            />
            <View style={{ height: 0.5, backgroundColor: theme.border, marginLeft: 48 }} />
            <SettingsRow label="Email" value={user?.email} icon="mail" />
          </View>
        </View>

        {prefs && (
          <View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: theme.textSecondary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                textTransform: 'uppercase',
              }}
            >
              Notifications
            </Text>
            <View style={{ backgroundColor: theme.card }}>
              <ToggleRow
                label="Prayer Reminders"
                description="Daily prayer reminders"
                value={prefs.prayerReminders}
                onValueChange={(v) =>
                  updatePrefs.mutate({ prayerReminders: v })
                }
              />
              <View style={{ height: 0.5, backgroundColor: theme.border, marginLeft: 16 }} />
              <ToggleRow
                label="Goal Reminders"
                description="When behind on goals"
                value={prefs.goalReminders}
                onValueChange={(v) =>
                  updatePrefs.mutate({ goalReminders: v })
                }
              />
              <View style={{ height: 0.5, backgroundColor: theme.border, marginLeft: 16 }} />
              <ToggleRow
                label="Streak Reminders"
                description="Evening reminders"
                value={prefs.streakReminders}
                onValueChange={(v) =>
                  updatePrefs.mutate({ streakReminders: v })
                }
              />
              <View style={{ height: 0.5, backgroundColor: theme.border, marginLeft: 16 }} />
              <ToggleRow
                label="Milestones"
                description="Celebration notifications"
                value={prefs.milestones}
                onValueChange={(v) =>
                  updatePrefs.mutate({ milestones: v })
                }
              />
            </View>
          </View>
        )}

        <View>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: theme.textSecondary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              textTransform: 'uppercase',
            }}
          >
            Account
          </Text>
          <View style={{ backgroundColor: theme.card }}>
            <SettingsRow
              label="Change Password"
              icon="lock-closed"
              onPress={() => router.push('/(tabs)/(more)/settings/password' as any)}
            />
            <View style={{ height: 0.5, backgroundColor: theme.border, marginLeft: 48 }} />
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 16,
                gap: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="log-out" size={20} color={theme.error} />
              <Text style={{ fontSize: 15, color: theme.error }}>Sign Out</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
