import { Stack } from 'expo-router/stack';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="gap-periods" />
      <Stack.Screen name="summary" />
    </Stack>
  );
}
