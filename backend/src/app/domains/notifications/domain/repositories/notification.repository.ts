import type { NotificationType, Prisma } from '@prisma/client';
import type { Notification } from '../entities/notification.entity';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
}

export interface ListNotificationsOptions {
  limit?: number;
  offset?: number;
  onlyUnread?: boolean;
}

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  listByUserId(userId: string, options?: ListNotificationsOptions): Promise<Notification[]>;
  countByUserId(userId: string, options?: { onlyUnread?: boolean }): Promise<number>;
  create(data: CreateNotificationData): Promise<Notification>;
  createMany(data: CreateNotificationData[]): Promise<number>;
  markRead(id: string, userId: string): Promise<Notification | null>;
  markAllRead(userId: string): Promise<number>;
}
