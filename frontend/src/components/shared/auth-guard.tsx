'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { authStorage } from '@/lib/auth-storage';

/**
 * Client-side route protection for the (app) group. Tokens live in
 * localStorage, so this cannot run in middleware -- we gate render here.
 * Redirects to /login when there is no token or the `me` query fails.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const hasToken =
    typeof window !== 'undefined' && !!authStorage.getAccess();

  useEffect(() => {
    if (!hasToken) {
      router.replace('/login');
    }
  }, [hasToken, router]);

  useEffect(() => {
    if (hasToken && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hasToken, isLoading, isAuthenticated, router]);

  if (!hasToken || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
