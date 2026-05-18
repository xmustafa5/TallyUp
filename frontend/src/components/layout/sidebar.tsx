'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRoomsQuery } from '@/hooks/use-rooms';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { data: rooms, isLoading } = useRoomsQuery();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-e bg-card">
      <div className="flex items-center gap-2 px-4 py-4">
        <Trophy className="size-5 text-primary" />
        <span className="text-lg font-bold tracking-tight">TallyUp</span>
      </div>

      <div className="px-3">
        <Button
          render={<Link href="/rooms/new" />}
          className="w-full"
          size="sm"
        >
          <Plus className="me-1.5 size-4" />
          {t('newRoom')}
        </Button>
      </div>

      <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
          {t('yourRooms')}
        </p>
        {isLoading && (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            {t('loading')}
          </p>
        )}
        {rooms?.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            {t('noRoomsYet')}
          </p>
        )}
        {rooms?.map((room) => {
          const href = `/rooms/${room.id}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={room.id}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                active
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <span className="text-base">{room.icon ?? '🎯'}</span>
              <span className="truncate">{room.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
