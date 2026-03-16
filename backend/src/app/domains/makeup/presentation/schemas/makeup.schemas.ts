import { Type } from '@sinclair/typebox';
import { SuccessResponse } from '../../../../common/schemas/shared.schemas';

const PrayerTypeEnum = Type.Union([
  Type.Literal('FAJR'),
  Type.Literal('DHUHR'),
  Type.Literal('ASR'),
  Type.Literal('MAGHRIB'),
  Type.Literal('ISHA'),
]);

const MakeupSourceEnum = Type.Union([
  Type.Literal('MANUAL'),
  Type.Literal('GAP_PERIOD'),
  Type.Literal('DAILY_MISSED'),
]);

const MakeupLogData = Type.Object({
  id: Type.String({ format: 'uuid' }),
  prayerType: PrayerTypeEnum,
  source: MakeupSourceEnum,
  completedAt: Type.String({ format: 'date-time' }),
  createdAt: Type.String({ format: 'date-time' }),
});

const IdParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

const PerTypeStats = Type.Object({
  completed: Type.Integer(),
  remaining: Type.Integer(),
});

const MakeupStatsData = Type.Object({
  perType: Type.Object({
    fajr: PerTypeStats,
    dhuhr: PerTypeStats,
    asr: PerTypeStats,
    maghrib: PerTypeStats,
    isha: PerTypeStats,
  }),
  totalCompleted: Type.Integer(),
  totalRemaining: Type.Integer(),
});

export const logMakeupSchema = {
  tags: ['Makeup'],
  summary: 'Log a completed makeup prayer',
  description: `
Log a makeup prayer as completed. The user's prayer balance is recalculated after logging.

**Body**
- \`prayerType\` -- One of FAJR, DHUHR, ASR, MAGHRIB, ISHA

**Side Effects**
- Prayer balance is recalculated to reflect the new completion
  `,
  body: Type.Object({
    prayerType: PrayerTypeEnum,
  }),
  response: {
    201: SuccessResponse(MakeupLogData),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const undoMakeupSchema = {
  tags: ['Makeup'],
  summary: 'Undo a makeup prayer log',
  description: `
Delete a previously logged makeup prayer. Only the owner can undo their own logs.

**Side Effects**
- Prayer balance is recalculated after deletion
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

export const listMakeupHistorySchema = {
  tags: ['Makeup'],
  summary: 'List makeup prayer history',
  description: `
Returns a paginated list of the authenticated user's makeup prayer logs, ordered by completion date (newest first).

**Query Parameters**
- \`prayerType\` -- Optional filter by prayer type
- \`limit\` -- Number of records to return (default 50, max 100)
- \`offset\` -- Number of records to skip (default 0)
  `,
  querystring: Type.Object({
    prayerType: Type.Optional(PrayerTypeEnum),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 50 })),
    offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  }),
  response: {
    200: SuccessResponse(Type.Array(MakeupLogData)),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const getMakeupStatsSchema = {
  tags: ['Makeup'],
  summary: 'Get makeup prayer statistics',
  description: `
Returns per-type completed and remaining counts for the authenticated user's makeup prayers.
  `,
  response: {
    200: SuccessResponse(MakeupStatsData),
    401: { $ref: 'UnauthorizedError#' },
  },
};
