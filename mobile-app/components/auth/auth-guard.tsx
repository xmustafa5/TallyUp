import { useSegments } from 'expo-router';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const segments = useSegments();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboardingGroup = segments[0] === '(onboarding)';

  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isAuthenticated && inAuthGroup) {
    if (user && !user.birthdate) {
      return <Redirect href="/(onboarding)/welcome" />;
    }
    return <Redirect href="/(tabs)/(home)" />;
  }

  if (isAuthenticated && user && !user.birthdate && !inOnboardingGroup) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <>{children}</>;
}
