export const CACHE_KEYS = {
  dashboard: (userId: string) => `dashboard:${userId}`,
  balance: (userId: string) => `balance:${userId}`,
  calendar: (userId: string, year: number, month: number) => `calendar:${userId}:${year}:${month}`,
  makeupStats: (userId: string) => `makeup-stats:${userId}`,
} as const;

export const CACHE_TTL = {
  dashboard: 30,      // 30 seconds
  balance: 60,        // 1 minute
  calendar: 120,      // 2 minutes
  makeupStats: 60,    // 1 minute
} as const;
