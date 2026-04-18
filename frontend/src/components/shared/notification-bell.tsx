'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';

export function NotificationBell({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const { data: count = 0 } = useUnreadNotificationsCount();
  const active = pathname === '/notifications';
  const badge = count > 99 ? '99+' : count > 0 ? String(count) : null;

  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className={`relative inline-flex size-9 items-center justify-center rounded-full transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      } ${className}`}
    >
      <Bell className="size-5" />
      {badge && (
        <span className="absolute -end-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
