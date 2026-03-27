import { useSegments } from 'expo-router';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const segments = useSegments();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const inAuthGroup = segments[0] === '(auth)';

  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isAuthenticated && inAuthGroup) {
    return <Redirect href="/(tabs)/(home)" />;
  }

  return <>{children}</>;
}
