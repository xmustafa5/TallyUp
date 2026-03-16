export class DateRange {
  constructor(
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {
    if (startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }
  }

  get totalDays(): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffMs = this.endDate.getTime() - this.startDate.getTime();
    return Math.floor(diffMs / msPerDay) + 1;
  }

  overlaps(other: DateRange): boolean {
    return this.startDate <= other.endDate && other.startDate <= this.endDate;
  }

  merge(other: DateRange): DateRange {
    if (!this.overlaps(other)) {
      throw new Error('Cannot merge non-overlapping date ranges');
    }
    return new DateRange(
      this.startDate < other.startDate ? this.startDate : other.startDate,
      this.endDate > other.endDate ? this.endDate : other.endDate,
    );
  }

  static fromDates(start: Date, end: Date): DateRange {
    return new DateRange(start, end);
  }

  static fromAges(birthdate: Date, startAge: number, endAge: number): DateRange {
    if (startAge < 0 || endAge < 0) {
      throw new Error('Ages must be non-negative');
    }
    if (startAge > endAge) {
      throw new Error('Start age must be less than or equal to end age');
    }

    const startDate = new Date(birthdate);
    startDate.setFullYear(startDate.getFullYear() + startAge);

    const endDate = new Date(birthdate);
    endDate.setFullYear(endDate.getFullYear() + endAge + 1);
    endDate.setDate(endDate.getDate() - 1);

    return new DateRange(startDate, endDate);
  }
}
