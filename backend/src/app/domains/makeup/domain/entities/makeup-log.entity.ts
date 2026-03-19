import type { PrayerType, MakeupSource } from '@prisma/client';

export interface MakeupLogProps {
  id: string;
  userId: string;
  prayerType: PrayerType;
  source: MakeupSource;
  targetDate: Date | null;
  completedAt: Date;
  createdAt: Date;
}

export interface MakeupLogResponse {
  id: string;
  prayerType: PrayerType;
  source: MakeupSource;
  completedAt: string;
  createdAt: string;
}

export class MakeupLog {
  private constructor(private readonly props: MakeupLogProps) {}

  static fromPrisma(data: MakeupLogProps): MakeupLog {
    return new MakeupLog(data);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get prayerType(): PrayerType {
    return this.props.prayerType;
  }

  get source(): MakeupSource {
    return this.props.source;
  }

  get targetDate(): Date | null {
    return this.props.targetDate;
  }

  toResponse(): MakeupLogResponse {
    return {
      id: this.props.id,
      prayerType: this.props.prayerType,
      source: this.props.source,
      completedAt: this.props.completedAt.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
