'use client';

import Link from 'next/link';
import { Bell, LogOut, User as UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { useIncomingInvitations } from '@/hooks/use-invitations';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Topbar() {
  const t = useTranslations('nav');
  const { user, logout } = useAuth();
  const { data: notifications } = useNotifications(true);
  const { data: invites } = useIncomingInvitations();

  const unread =
    (notifications?.meta.total ?? 0) + (invites?.length ?? 0);

  return (
    <header className="flex items-center justify-between border-b bg-card px-4 py-2.5">
      <div className="text-sm text-muted-foreground">
        {user ? t('hello', { name: user.displayName }) : ''}
      </div>
      <div className="flex items-center gap-1">
        <Button
          render={<Link href="/notifications" aria-label={t('notifications')} />}
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={t('profileMenu')} />
            }
          >
            <UserIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{user?.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {user?.publicId}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/profile" />}>
              <UserIcon className="me-2 size-4" />
              {t('profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="me-2 size-4" />
              {t('logOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
