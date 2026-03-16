import type { InputMethod } from '@prisma/client';

export interface GapPeriodProps {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  inputMethod: InputMethod;
  originalStartAge: number | null;
  originalEndAge: number | null;
  totalDays: number;
  totalPrayers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GapPeriodResponse {
  id: string;
  startDate: string;
  endDate: string;
  inputMethod: InputMethod;
  originalStartAge: number | null;
  originalEndAge: number | null;
  totalDays: number;
  totalPrayers: number;
  createdAt: string;
  updatedAt: string;
}

export class GapPeriod {
  private constructor(private readonly props: GapPeriodProps) {}

  static fromPrisma(data: GapPeriodProps): GapPeriod {
    return new GapPeriod(data);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date {
    return this.props.endDate;
  }

  get totalDays(): number {
    return this.props.totalDays;
  }

  get totalPrayers(): number {
    return this.props.totalPrayers;
  }

  toResponse(): GapPeriodResponse {
    return {
      id: this.props.id,
      startDate: this.props.startDate.toISOString().split('T')[0],
      endDate: this.props.endDate.toISOString().split('T')[0],
      inputMethod: this.props.inputMethod,
      originalStartAge: this.props.originalStartAge ?? null,
      originalEndAge: this.props.originalEndAge ?? null,
      totalDays: this.props.totalDays,
      totalPrayers: this.props.totalPrayers,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
