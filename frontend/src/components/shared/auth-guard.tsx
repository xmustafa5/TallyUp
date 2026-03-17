'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand persist to hydrate from localStorage
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (e.g. navigating between pages)
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  // Don't render or redirect until hydration is complete
  if (!hydrated) {
    return null;
  }

  const isProfileIncomplete = isAuthenticated && user && !user.birthdate;
  const isOnSetupPage = pathname === '/setup';

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (isProfileIncomplete && !isOnSetupPage) {
    router.push('/setup');
    return null;
  }

  return <>{children}</>;
}
