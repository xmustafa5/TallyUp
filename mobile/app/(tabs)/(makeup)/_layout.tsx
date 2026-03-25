import { Stack } from 'expo-router/stack';

export default function MakeupLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Makeup Prayers' }} />
    </Stack>
  );
}
