import { Type } from '@sinclair/typebox';
import { SuccessResponse } from '../../../../common/schemas/shared.schemas';

const GapPeriodData = Type.Object({
  id: Type.String({ format: 'uuid' }),
  startDate: Type.String({ format: 'date' }),
  endDate: Type.String({ format: 'date' }),
  inputMethod: Type.Union([Type.Literal('DATE_RANGE'), Type.Literal('AGE_RANGE')]),
  originalStartAge: Type.Union([Type.Integer(), Type.Null()]),
  originalEndAge: Type.Union([Type.Integer(), Type.Null()]),
  totalDays: Type.Integer(),
  totalPrayers: Type.Integer(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

const PrayerBalanceData = Type.Object({
  fajr: Type.Integer(),
  dhuhr: Type.Integer(),
  asr: Type.Integer(),
  maghrib: Type.Integer(),
  isha: Type.Integer(),
  totalRemaining: Type.Integer(),
  totalCompleted: Type.Integer(),
});

const CalculationResult = Type.Object({
  totalDays: Type.Integer(),
  totalPrayers: Type.Integer(),
  perType: Type.Object({
    fajr: Type.Integer(),
    dhuhr: Type.Integer(),
    asr: Type.Integer(),
    maghrib: Type.Integer(),
    isha: Type.Integer(),
  }),
  mergedPeriods: Type.Array(
    Type.Object({
      startDate: Type.String({ format: 'date' }),
      endDate: Type.String({ format: 'date' }),
      days: Type.Integer(),
    }),
  ),
  balance: PrayerBalanceData,
});

const IdParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const listGapPeriodsSchema = {
  tags: ['Gap Periods'],
  summary: 'List all gap periods',
  description: `
Returns all gap periods for the authenticated user, ordered by start date.

**Returns**
- Array of gap periods with calculated days and prayer counts
  `,
  response: {
    200: SuccessResponse(Type.Array(GapPeriodData)),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const createGapPeriodSchema = {
  tags: ['Gap Periods'],
  summary: 'Create a new gap period',
  description: `
Add a new period of missed prayers. Supports two input methods:

**Date Range** -- Provide startDate and endDate directly
**Age Range** -- Provide startAge and endAge (requires birthdate in profile)

The system automatically:
- Calculates total days and prayers (days x 5)
- Recalculates the user's prayer balance
- Handles overlap with existing periods during calculation
  `,
  body: Type.Object({
    inputMethod: Type.Union([Type.Literal('DATE_RANGE'), Type.Literal('AGE_RANGE')]),
    startDate: Type.Optional(Type.String({ format: 'date' })),
    endDate: Type.Optional(Type.String({ format: 'date' })),
    startAge: Type.Optional(Type.Integer({ minimum: 0 })),
    endAge: Type.Optional(Type.Integer({ minimum: 0 })),
  }),
  response: {
    201: SuccessResponse(GapPeriodData),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const updateGapPeriodSchema = {
  tags: ['Gap Periods'],
  summary: 'Update a gap period',
  description: `
Update an existing gap period's date range. Recalculates totals and prayer balance.

**Restrictions**
- Can only update own gap periods
- End date must be after start date
  `,
  params: IdParams,
  body: Type.Object({
    startDate: Type.Optional(Type.String({ format: 'date' })),
    endDate: Type.Optional(Type.String({ format: 'date' })),
  }),
  response: {
    200: SuccessResponse(GapPeriodData),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const deleteGapPeriodSchema = {
  tags: ['Gap Periods'],
  summary: 'Delete a gap period',
  description: `
Remove a gap period. The user's prayer balance is recalculated after deletion.

**Side Effects**
- Prayer balance is recalculated
- This action is irreversible
  `,
  params: IdParams,
  response: {
    200: Type.Object({
      success: Type.Literal(true),
      message: Type.String(),
    }),
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const calculateSchema = {
  tags: ['Gap Periods'],
  summary: 'Calculate total missed prayers',
  description: `
Runs the full calculation across all gap periods for the authenticated user.

**Behavior**
- Merges overlapping periods to prevent double-counting
- Returns total days, total prayers, per-type breakdown, and current balance
  `,
  response: {
    200: SuccessResponse(CalculationResult),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const getBalanceSchema = {
  tags: ['Gap Periods'],
  summary: 'Get current prayer balance',
  description: `
Returns the user's current prayer balance (remaining and completed counts per type).
  `,
  response: {
    200: SuccessResponse(PrayerBalanceData),
    401: { $ref: 'UnauthorizedError#' },
  },
};
