import { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const segments = useSegments();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (user && !user.birthdate) {
        router.replace('/(onboarding)/welcome');
      } else {
        router.replace('/(tabs)/(home)');
      }
    } else if (isAuthenticated && user && !user.birthdate && !inOnboardingGroup) {
      router.replace('/(onboarding)/welcome');
    }
  }, [isAuthenticated, segments, user]);

  return <>{children}</>;
}
