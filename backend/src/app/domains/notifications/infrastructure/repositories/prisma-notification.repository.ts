import type { PrismaClient } from '@prisma/client';
import { Notification } from '../../domain/entities/notification.entity';
import type {
  CreateNotificationData,
  ListNotificationsOptions,
  NotificationRepository,
} from '../../domain/repositories/notification.repository';

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Notification | null> {
    const record = await this.prisma.notification.findUnique({ where: { id } });
    return record ? Notification.fromPrisma(record) : null;
  }

  async listByUserId(
    userId: string,
    options?: ListNotificationsOptions,
  ): Promise<Notification[]> {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = options?.offset ?? 0;

    const records = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(options?.onlyUnread ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return records.map((r) => Notification.fromPrisma(r));
  }

  async countByUserId(
    userId: string,
    options?: { onlyUnread?: boolean },
  ): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        ...(options?.onlyUnread ? { readAt: null } : {}),
      },
    });
  }

  async create(data: CreateNotificationData): Promise<Notification> {
    const record = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data,
      },
    });
    return Notification.fromPrisma(record);
  }

  async createMany(data: CreateNotificationData[]): Promise<number> {
    if (data.length === 0) return 0;
    const result = await this.prisma.notification.createMany({
      data: data.map((d) => ({
        userId: d.userId,
        type: d.type,
        title: d.title,
        body: d.body,
        data: d.data,
      })),
    });
    return result.count;
  }

  async markRead(id: string, userId: string): Promise<Notification | null> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      const existing = await this.prisma.notification.findFirst({
        where: { id, userId },
      });
      return existing ? Notification.fromPrisma(existing) : null;
    }

    const updated = await this.prisma.notification.findUnique({ where: { id } });
    return updated ? Notification.fromPrisma(updated) : null;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }
}
