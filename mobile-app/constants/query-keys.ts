export const queryKeys = {
  dailyTracker: {
    today: ['daily-tracker', 'today'] as const,
    week: ['daily-tracker', 'week'] as const,
    streak: ['daily-tracker', 'streak'] as const,
    date: (date: string) => ['daily-tracker', 'date', date] as const,
  },
  gapPeriods: {
    all: ['gap-periods'] as const,
    calculation: ['gap-periods', 'calculation'] as const,
    balance: ['gap-periods', 'balance'] as const,
  },
  makeup: {
    history: ['makeup', 'history'] as const,
    stats: ['makeup', 'stats'] as const,
  },
  progress: {
    dashboard: ['progress', 'dashboard'] as const,
    calendar: (year: number, month: number) => ['progress', 'calendar', year, month] as const,
    calendarDay: (date: string) => ['progress', 'calendar', 'day', date] as const,
    streaks: ['progress', 'streaks'] as const,
  },
  schedule: {
    all: ['schedule'] as const,
    todayProgress: ['schedule', 'today-progress'] as const,
  },
  notifications: {
    preferences: ['notifications', 'preferences'] as const,
    inbox: ['notifications', 'inbox'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
} as const;
