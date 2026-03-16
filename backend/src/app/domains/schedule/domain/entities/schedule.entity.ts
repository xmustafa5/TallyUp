export interface ScheduleProps {
  id: string;
  userId: string;
  dailyGoal: number;
  weeklyGoal: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleResponse {
  id: string;
  dailyGoal: number;
  weeklyGoal: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class Schedule {
  private constructor(private readonly props: ScheduleProps) {}

  static fromPrisma(data: ScheduleProps): Schedule {
    return new Schedule(data);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get dailyGoal(): number {
    return this.props.dailyGoal;
  }

  get weeklyGoal(): number {
    return this.props.weeklyGoal;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toResponse(): ScheduleResponse {
    return {
      id: this.props.id,
      dailyGoal: this.props.dailyGoal,
      weeklyGoal: this.props.weeklyGoal,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
