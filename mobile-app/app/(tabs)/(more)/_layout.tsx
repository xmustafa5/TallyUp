import { Stack } from 'expo-router/stack';

export default function MoreLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'More' }} />
      <Stack.Screen name="notifications" options={{ title: 'الإشعارات' }} />
      <Stack.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Stack.Screen name="gap-periods/index" options={{ title: 'Gap Periods' }} />
      <Stack.Screen name="gap-periods/create" options={{ title: 'Add Gap Period' }} />
      <Stack.Screen name="gap-periods/[id]" options={{ title: 'Edit Gap Period' }} />
      <Stack.Screen name="schedule" options={{ title: 'Goals' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="settings/profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="settings/password" options={{ title: 'Change Password' }} />
    </Stack>
  );
}
