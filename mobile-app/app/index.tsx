import { Redirect } from 'expo-router';

// Entry route. AuthGate (root layout) redirects unauthenticated users to
// /(auth)/login; authenticated users fall through to the tabs.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
