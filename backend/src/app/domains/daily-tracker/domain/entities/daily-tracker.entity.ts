export interface DailyTrackerProps {
  id: string;
  userId: string;
  date: Date;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  isFinalized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyTrackerResponse {
  id: string;
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
}

const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

const PRAYER_TYPE_MAP: Record<(typeof PRAYER_KEYS)[number], string> = {
  fajr: 'FAJR',
  dhuhr: 'DHUHR',
  asr: 'ASR',
  maghrib: 'MAGHRIB',
  isha: 'ISHA',
};

export class DailyTracker {
  private constructor(private readonly props: DailyTrackerProps) {}

  static fromPrisma(data: DailyTrackerProps): DailyTracker {
    return new DailyTracker(data);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get date(): Date {
    return this.props.date;
  }

  get isFinalized(): boolean {
    return this.props.isFinalized;
  }

  /**
   * Returns an array of PrayerType strings for prayers that were not performed.
   */
  getMissedPrayers(): string[] {
    const missed: string[] = [];
    for (const key of PRAYER_KEYS) {
      if (!this.props[key]) {
        missed.push(PRAYER_TYPE_MAP[key]);
      }
    }
    return missed;
  }

  /**
   * Returns the count of prayers marked as completed (0-5).
   */
  getCompletedCount(): number {
    let count = 0;
    for (const key of PRAYER_KEYS) {
      if (this.props[key]) {
        count++;
      }
    }
    return count;
  }

  toResponse(): DailyTrackerResponse {
    return {
      id: this.props.id,
      date: this.props.date.toISOString().split('T')[0],
      fajr: this.props.fajr,
      dhuhr: this.props.dhuhr,
      asr: this.props.asr,
      maghrib: this.props.maghrib,
      isha: this.props.isha,
      isFinalized: this.props.isFinalized,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
