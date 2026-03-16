import type { MakeupLog } from '../entities/makeup-log.entity';
import type { PrayerType, MakeupSource } from '@prisma/client';

export interface CreateMakeupLogData {
  userId: string;
  prayerType: PrayerType;
  source: MakeupSource;
  completedAt: Date;
}

export interface MakeupLogRepository {
  findById(id: string): Promise<MakeupLog | null>;
  findByUserId(
    userId: string,
    options?: { prayerType?: PrayerType; limit?: number; offset?: number },
  ): Promise<MakeupLog[]>;
  countByUserId(userId: string): Promise<number>;
  countByUserIdAndType(userId: string, prayerType?: PrayerType): Promise<Record<string, number>>;
  create(data: CreateMakeupLogData): Promise<MakeupLog>;
  delete(id: string): Promise<void>;
}
