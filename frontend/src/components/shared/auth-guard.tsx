'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Use useSyncExternalStore to reliably track hydration state
function useHydrated() {
  return useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false, // server snapshot
  );
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // Don't render or redirect until hydration is complete
  if (!hydrated) {
    return null;
  }

  const isOnSetupPage = pathname === '/setup';

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (isAuthenticated && user && !user.birthdate && !isOnSetupPage) {
    router.push('/setup');
    return null;
  }

  return <>{children}</>;
}
