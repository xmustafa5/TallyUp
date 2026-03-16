import { Type } from '@sinclair/typebox';
import { SuccessResponse } from '../../../../common/schemas/shared.schemas';

const DailyTrackerData = Type.Object({
  id: Type.String({ format: 'uuid' }),
  date: Type.String({ format: 'date' }),
  fajr: Type.Boolean(),
  dhuhr: Type.Boolean(),
  asr: Type.Boolean(),
  maghrib: Type.Boolean(),
  isha: Type.Boolean(),
  isFinalized: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

const StreakData = Type.Object({
  currentStreak: Type.Integer(),
  longestStreak: Type.Integer(),
  lastActiveDate: Type.Union([Type.String({ format: 'date' }), Type.Null()]),
});

const DateParams = Type.Object({
  date: Type.String({ format: 'date' }),
});

export const getTodaySchema = {
  tags: ['Daily Tracker'],
  summary: 'Get today\'s prayer tracker',
  description: `
Returns the daily tracker for today. Creates a new tracker with all prayers
set to false if one does not already exist.

**Behavior**
- Uses UTC date for "today"
- Auto-creates tracker on first access each day
  `,
  response: {
    200: SuccessResponse(DailyTrackerData),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const getDateSchema = {
  tags: ['Daily Tracker'],
  summary: 'Get tracker for a specific date',
  description: `
Returns the daily tracker for the given date.

**Returns**
- 404 if no tracker exists for that date
  `,
  params: DateParams,
  response: {
    200: SuccessResponse(DailyTrackerData),
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const markPrayerSchema = {
  tags: ['Daily Tracker'],
  summary: 'Mark prayers for a date',
  description: `
Update prayer completion status for a specific date. Only non-finalized
trackers can be updated.

**Body**
- All fields are optional; only provided fields are updated
- Each field is a boolean indicating whether the prayer was performed

**Restrictions**
- Cannot update a finalized tracker (returns 400)
  `,
  params: DateParams,
  body: Type.Object({
    fajr: Type.Optional(Type.Boolean()),
    dhuhr: Type.Optional(Type.Boolean()),
    asr: Type.Optional(Type.Boolean()),
    maghrib: Type.Optional(Type.Boolean()),
    isha: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: SuccessResponse(DailyTrackerData),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const finalizeSchema = {
  tags: ['Daily Tracker'],
  summary: 'Finalize a day\'s tracker',
  description: `
Manually finalize a daily tracker. Creates MakeupLog entries for each
missed prayer with source DAILY_MISSED.

**Restrictions**
- Only past dates or today can be finalized
- Cannot finalize an already-finalized tracker
- Recalculates prayer balance and updates streak after finalization
  `,
  params: DateParams,
  response: {
    200: SuccessResponse(DailyTrackerData),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const getWeekSchema = {
  tags: ['Daily Tracker'],
  summary: 'Get weekly prayer trackers',
  description: `
Returns trackers for a 7-day range ending on the given date (or today if
no date is provided). The range includes the end date and goes back 6 days.

**Query Parameters**
- date (optional): End date of the range in YYYY-MM-DD format. Defaults to today.
  `,
  querystring: Type.Object({
    date: Type.Optional(Type.String({ format: 'date' })),
  }),
  response: {
    200: SuccessResponse(Type.Array(DailyTrackerData)),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const getStreakSchema = {
  tags: ['Daily Tracker'],
  summary: 'Get current streak data',
  description: `
Returns the user's current and longest prayer streak, along with the
last active date.

**Returns**
- currentStreak: number of consecutive days with all 5 prayers completed
- longestStreak: highest streak ever achieved
- lastActiveDate: the most recent date with all prayers completed (or null)
  `,
  response: {
    200: SuccessResponse(StreakData),
    401: { $ref: 'UnauthorizedError#' },
  },
};
