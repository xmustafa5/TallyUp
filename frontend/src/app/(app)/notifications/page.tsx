'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/shared/skeleton';
import {
  useNotificationsInbox,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-notifications';
import type { NotificationItem, NotificationType } from '@/services/notifications';

type RelativeTranslator = (k: string, v?: Record<string, number>) => string;

function formatRelative(isoDate: string, t: RelativeTranslator): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return t('justNow');
  if (min < 60) return t('minutesAgo', { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t('hoursAgo', { count: hr });
  const day = Math.floor(hr / 24);
  return t('daysAgo', { count: day });
}

function typeBadgeStyle(type: NotificationType): string {
  switch (type) {
    case 'PRAYER_REMINDER':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
    case 'STREAK_REMINDER':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400';
    case 'GOAL_REMINDER':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400';
    case 'MILESTONE':
      return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400';
  }
}

function NotificationRow({
  notification,
  onMarkRead,
  marking,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
  marking: boolean;
}) {
  const t = useTranslations('notifications');
  const isRead = notification.readAt !== null;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
        isRead ? 'bg-card' : 'bg-primary/5 border-primary/20'
      }`}
    >
      <div
        className={`mt-1 size-2 shrink-0 rounded-full ${isRead ? 'bg-transparent' : 'bg-primary'}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${typeBadgeStyle(notification.type)}`}
          >
            {notification.type.replace('_', ' ').toLowerCase()}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelative(notification.createdAt, t)}
          </span>
        </div>
        <h3 className="text-sm font-semibold">{notification.title}</h3>
        <p className="text-sm text-muted-foreground">{notification.body}</p>
      </div>
      {!isRead && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMarkRead(notification.id)}
          disabled={marking}
        >
          {t('markRead')}
        </Button>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const [onlyUnread, setOnlyUnread] = useState(false);

  const { data, isLoading } = useNotificationsInbox({ pageSize: 50, onlyUnread });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setOnlyUnread(false)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                !onlyUnread ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {t('all')}
            </button>
            <button
              type="button"
              onClick={() => setOnlyUnread(true)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                onlyUnread ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {t('unread')}
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={!hasUnread || markAllRead.isPending}
          >
            <CheckCheck className="mr-2 size-4" />
            {t('markAllRead')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : total === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Bell className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onMarkRead={(id) => markRead.mutate(id)}
              marking={markRead.isPending && markRead.variables === n.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
