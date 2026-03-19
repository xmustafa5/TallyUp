import type { PrismaClient, PrayerType } from '@prisma/client';
import { MakeupLog } from '../../domain/entities/makeup-log.entity';
import type {
  CreateMakeupLogData,
  MakeupLogRepository,
} from '../../domain/repositories/makeup-log.repository';

export class PrismaMakeupLogRepository implements MakeupLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<MakeupLog | null> {
    const record = await this.prisma.makeupLog.findUnique({ where: { id } });
    return record ? MakeupLog.fromPrisma(record) : null;
  }

  async findByUserId(
    userId: string,
    options?: { prayerType?: PrayerType; limit?: number; offset?: number },
  ): Promise<MakeupLog[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const where: Record<string, unknown> = { userId };
    if (options?.prayerType) {
      where.prayerType = options.prayerType;
    }

    const records = await this.prisma.makeupLog.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return records.map((r) => MakeupLog.fromPrisma(r));
  }

  async findByUserAndTargetDate(userId: string, targetDate: Date): Promise<MakeupLog[]> {
    const records = await this.prisma.makeupLog.findMany({
      where: { userId, targetDate },
    });
    return records.map((r) => MakeupLog.fromPrisma(r));
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.makeupLog.count({ where: { userId } });
  }

  async countByUserIdAndType(
    userId: string,
    prayerType?: PrayerType,
  ): Promise<Record<string, number>> {
    const where: Record<string, unknown> = { userId, source: 'MANUAL' };
    if (prayerType) {
      where.prayerType = prayerType;
    }

    const counts = await this.prisma.makeupLog.groupBy({
      by: ['prayerType'],
      where,
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const c of counts) {
      result[c.prayerType] = c._count;
    }

    return result;
  }

  async create(data: CreateMakeupLogData): Promise<MakeupLog> {
    const record = await this.prisma.makeupLog.create({ data });
    return MakeupLog.fromPrisma(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.makeupLog.delete({ where: { id } });
  }
}
