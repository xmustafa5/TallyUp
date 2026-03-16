import type { PrismaClient } from '@prisma/client';
import { DailyTracker } from '../../domain/entities/daily-tracker.entity';
import type {
  UpsertDailyTrackerData,
  DailyTrackerRepository,
} from '../../domain/repositories/daily-tracker.repository';

export class PrismaDailyTrackerRepository implements DailyTrackerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserAndDate(userId: string, date: Date): Promise<DailyTracker | null> {
    const record = await this.prisma.dailyTracker.findUnique({
      where: { userId_date: { userId, date } },
    });
    return record ? DailyTracker.fromPrisma(record) : null;
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyTracker[]> {
    const records = await this.prisma.dailyTracker.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });
    return records.map((r) => DailyTracker.fromPrisma(r));
  }

  async upsert(
    userId: string,
    date: Date,
    data: UpsertDailyTrackerData,
  ): Promise<DailyTracker> {
    const record = await this.prisma.dailyTracker.upsert({
      where: { userId_date: { userId, date } },
      update: data,
      create: {
        userId,
        date,
        fajr: data.fajr ?? false,
        dhuhr: data.dhuhr ?? false,
        asr: data.asr ?? false,
        maghrib: data.maghrib ?? false,
        isha: data.isha ?? false,
      },
    });
    return DailyTracker.fromPrisma(record);
  }

  async findUnfinalizedBefore(date: Date): Promise<DailyTracker[]> {
    const records = await this.prisma.dailyTracker.findMany({
      where: {
        isFinalized: false,
        date: { lt: date },
      },
      orderBy: { date: 'asc' },
    });
    return records.map((r) => DailyTracker.fromPrisma(r));
  }

  async finalize(id: string): Promise<DailyTracker> {
    const record = await this.prisma.dailyTracker.update({
      where: { id },
      data: { isFinalized: true },
    });
    return DailyTracker.fromPrisma(record);
  }
}
