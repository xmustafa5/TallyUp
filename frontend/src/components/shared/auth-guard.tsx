'use client';

import { useEffect } from 'react';
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

  const isProfileIncomplete = isAuthenticated && user && !user.birthdate;
  const isOnSetupPage = pathname === '/setup';

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isProfileIncomplete && !isOnSetupPage) {
      router.push('/setup');
    }
  }, [isAuthenticated, isProfileIncomplete, isOnSetupPage, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (isProfileIncomplete && !isOnSetupPage) {
    return null;
  }

  return <>{children}</>;
}
