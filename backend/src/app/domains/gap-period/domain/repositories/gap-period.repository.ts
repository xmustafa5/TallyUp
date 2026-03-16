import type { GapPeriod } from '../entities/gap-period.entity';
import type { InputMethod } from '@prisma/client';

export interface CreateGapPeriodData {
  userId: string;
  startDate: Date;
  endDate: Date;
  inputMethod: InputMethod;
  originalStartAge: number | null;
  originalEndAge: number | null;
  totalDays: number;
  totalPrayers: number;
}

export interface UpdateGapPeriodData {
  startDate?: Date;
  endDate?: Date;
  inputMethod?: InputMethod;
  originalStartAge?: number | null;
  originalEndAge?: number | null;
  totalDays?: number;
  totalPrayers?: number;
}

export interface GapPeriodRepository {
  findById(id: string): Promise<GapPeriod | null>;
  findByUserId(userId: string): Promise<GapPeriod[]>;
  create(data: CreateGapPeriodData): Promise<GapPeriod>;
  update(id: string, data: UpdateGapPeriodData): Promise<GapPeriod>;
  delete(id: string): Promise<void>;
}
