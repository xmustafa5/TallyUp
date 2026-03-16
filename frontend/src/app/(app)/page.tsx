'use client';

import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Qatha Dashboard</h1>
      <p className="text-muted-foreground">Welcome, {user?.name}</p>
      <p className="text-sm text-muted-foreground">
        Dashboard, prayer tracker, and more coming in Phase 2-4.
      </p>
      <Button variant="outline" onClick={clearAuth}>
        Sign out
      </Button>
    </div>
  );
}
