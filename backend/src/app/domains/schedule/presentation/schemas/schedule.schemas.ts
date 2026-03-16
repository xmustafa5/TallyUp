import { Type } from '@sinclair/typebox';
import { SuccessResponse } from '../../../../common/schemas/shared.schemas';

const ScheduleData = Type.Object({
  id: Type.String({ format: 'uuid' }),
  dailyGoal: Type.Integer(),
  weeklyGoal: Type.Integer(),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

const TodayProgressData = Type.Object({
  dailyGoal: Type.Integer(),
  dailyCompleted: Type.Integer(),
  weeklyGoal: Type.Integer(),
  weeklyCompleted: Type.Integer(),
  dailyPercentage: Type.Number(),
  weeklyPercentage: Type.Number(),
});

export const getScheduleSchema = {
  tags: ['Schedule'],
  summary: 'Get user schedule',
  description: `
Returns the authenticated user's makeup prayer schedule. If no schedule exists,
one is created with default values (dailyGoal=5, weeklyGoal=35).
  `,
  response: {
    200: SuccessResponse(ScheduleData),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const upsertScheduleSchema = {
  tags: ['Schedule'],
  summary: 'Update schedule goals',
  description: `
Update the user's daily and/or weekly makeup prayer goals. Creates the schedule
if it does not exist yet.

**Constraints**
- dailyGoal: 1 to 50
- weeklyGoal: 1 to 350
  `,
  body: Type.Object({
    dailyGoal: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    weeklyGoal: Type.Optional(Type.Integer({ minimum: 1, maximum: 350 })),
  }),
  response: {
    200: SuccessResponse(ScheduleData),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const getTodayProgressSchema = {
  tags: ['Schedule'],
  summary: 'Get today progress against goals',
  description: `
Returns the user's progress against their daily and weekly makeup prayer goals.

- **dailyCompleted**: number of makeup prayers logged today (completedAt is today)
- **weeklyCompleted**: number of makeup prayers logged this week (Monday to Sunday)
- Percentages are capped at 100
  `,
  response: {
    200: SuccessResponse(TodayProgressData),
    401: { $ref: 'UnauthorizedError#' },
  },
};
