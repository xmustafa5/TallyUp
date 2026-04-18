'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useGapPeriods } from '@/hooks/use-gap-periods';

interface AuthGuardProps {
  children: React.ReactNode;
}

function useHydrated() {
  return useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const needsSetup = Boolean(isAuthenticated && user && !user.birthdate);
  const isOnSetupPage = pathname === '/setup';
  const isOnGapPeriodsNew = pathname === '/gap-periods/new';

  const gapPeriodsQuery = useGapPeriods();
  const shouldCheckGapPeriods = Boolean(
    hydrated && isAuthenticated && user?.birthdate && !isOnSetupPage,
  );
  const hasZeroGapPeriods =
    shouldCheckGapPeriods &&
    gapPeriodsQuery.isSuccess &&
    (gapPeriodsQuery.data?.length ?? 0) === 0;

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (needsSetup && !isOnSetupPage) {
      router.push('/setup');
      return;
    }

    if (hasZeroGapPeriods && !isOnGapPeriodsNew) {
      router.push('/gap-periods/new');
    }
  }, [
    hydrated,
    isAuthenticated,
    needsSetup,
    isOnSetupPage,
    hasZeroGapPeriods,
    isOnGapPeriodsNew,
    router,
  ]);

  if (!hydrated) return null;
  if (!isAuthenticated) return null;
  if (needsSetup && !isOnSetupPage) return null;
  if (hasZeroGapPeriods && !isOnGapPeriodsNew) return null;

  return <>{children}</>;
}
