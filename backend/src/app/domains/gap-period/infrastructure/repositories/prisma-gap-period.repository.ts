import type { PrismaClient } from '@prisma/client';
import { GapPeriod } from '../../domain/entities/gap-period.entity';
import type {
  CreateGapPeriodData,
  UpdateGapPeriodData,
  GapPeriodRepository,
} from '../../domain/repositories/gap-period.repository';

export class PrismaGapPeriodRepository implements GapPeriodRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<GapPeriod | null> {
    const record = await this.prisma.gapPeriod.findUnique({ where: { id } });
    return record ? GapPeriod.fromPrisma(record) : null;
  }

  async findByUserId(userId: string): Promise<GapPeriod[]> {
    const records = await this.prisma.gapPeriod.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
    });
    return records.map((r) => GapPeriod.fromPrisma(r));
  }

  async create(data: CreateGapPeriodData): Promise<GapPeriod> {
    const record = await this.prisma.gapPeriod.create({ data });
    return GapPeriod.fromPrisma(record);
  }

  async update(id: string, data: UpdateGapPeriodData): Promise<GapPeriod> {
    const record = await this.prisma.gapPeriod.update({ where: { id }, data });
    return GapPeriod.fromPrisma(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.gapPeriod.delete({ where: { id } });
  }
}
