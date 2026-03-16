import { Type } from '@sinclair/typebox';
import { SuccessResponse } from '../../../../common/schemas/shared.schemas';

const StreakData = Type.Object({
  currentStreak: Type.Integer(),
  longestStreak: Type.Integer(),
  lastActiveDate: Type.Union([Type.String({ format: 'date' }), Type.Null()]),
});

const TodayStatusData = Type.Object({
  fajr: Type.Boolean(),
  dhuhr: Type.Boolean(),
  asr: Type.Boolean(),
  maghrib: Type.Boolean(),
  isha: Type.Boolean(),
  completedCount: Type.Integer({ minimum: 0, maximum: 5 }),
  isFinalized: Type.Boolean(),
});

const DashboardData = Type.Object({
  totalRemaining: Type.Integer(),
  totalCompleted: Type.Integer(),
  completionPercentage: Type.Number({ minimum: 0, maximum: 100 }),
  streak: StreakData,
  todayStatus: TodayStatusData,
  recentActivity: Type.Integer(),
  milestone: Type.Union([Type.String(), Type.Null()]),
});

const CalendarDayData = Type.Object({
  date: Type.String({ format: 'date' }),
  prayedCount: Type.Integer({ minimum: 0, maximum: 5 }),
  makeupCount: Type.Integer({ minimum: 0 }),
  isFinalized: Type.Boolean(),
  status: Type.Union([
    Type.Literal('complete'),
    Type.Literal('partial'),
    Type.Literal('missed'),
    Type.Literal('future'),
    Type.Literal('no-data'),
  ]),
});

const CalendarParams = Type.Object({
  year: Type.Integer({ minimum: 2000, maximum: 2100 }),
  month: Type.Integer({ minimum: 1, maximum: 12 }),
});

export const getDashboardSchema = {
  tags: ['Progress'],
  summary: 'Get dashboard overview',
  description: `
Returns an aggregated dashboard view for the authenticated user, including:

**Data Included**
- Total remaining and completed prayers with completion percentage
- Current and longest streak information
- Today's prayer status
- Recent makeup prayer activity (last 7 days)
- Milestone message if at a milestone threshold (10, 25, 50, 75, 90, 100%)
  `,
  response: {
    200: SuccessResponse(DashboardData),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const getCalendarMonthSchema = {
  tags: ['Progress'],
  summary: 'Get calendar data for a month',
  description: `
Returns daily prayer and makeup data for every day in the specified month.

**Parameters**
- year: Calendar year (2000-2100)
- month: Calendar month (1-12)

**Day Status Values**
- complete: All 5 prayers were marked as prayed
- partial: 1-4 prayers were marked as prayed
- missed: 0 prayers were prayed (finalized or past date with tracker)
- future: Date is in the future
- no-data: No tracker exists for this past date
  `,
  params: CalendarParams,
  response: {
    200: SuccessResponse(Type.Array(CalendarDayData)),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const getStreakSchema = {
  tags: ['Progress'],
  summary: 'Get streak data',
  description: `
Returns the user's current and longest prayer streak, along with the
last active date.

**Returns**
- currentStreak: Number of consecutive days with all 5 prayers completed
- longestStreak: Highest streak ever achieved
- lastActiveDate: Most recent date with all prayers completed (or null)
  `,
  response: {
    200: SuccessResponse(StreakData),
    401: { $ref: 'UnauthorizedError#' },
  },
};
