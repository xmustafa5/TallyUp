import { Type } from '@sinclair/typebox';
import {
  SuccessResponse,
  PaginatedResponse,
  PaginationQuerySchema,
} from '../../../../common/schemas/shared.schemas';

const LeaderboardRow = Type.Object({
  userId: Type.String({ format: 'uuid' }),
  publicId: Type.String(),
  displayName: Type.String(),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
  points: Type.Integer(),
  target: Type.Integer(),
  percent: Type.Number(),
});

const CycleSummary = Type.Object({
  id: Type.String({ format: 'uuid' }),
  roomId: Type.String({ format: 'uuid' }),
  cycleNumber: Type.Integer(),
  startsAt: Type.String({ format: 'date-time' }),
  endsAt: Type.String({ format: 'date-time' }),
  status: Type.String(),
});

const CycleDetail = Type.Intersect([
  CycleSummary,
  Type.Object({
    leaderboard: Type.Array(LeaderboardRow),
    resultJson: Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  }),
]);

export const listCyclesSchema = {
  tags: ['Cycles'],
  summary: 'List a room\'s cycle history',
  description: 'Paginated list of past and current cycles for a room, newest first.',
  security: [{ bearerAuth: [] }],
  params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  querystring: PaginationQuerySchema,
  response: {
    200: PaginatedResponse(
      Type.Intersect([
        CycleSummary,
        Type.Object({
          resultJson: Type.Union([
            Type.Record(Type.String(), Type.Unknown()),
            Type.Null(),
          ]),
        }),
      ]),
    ),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const getCurrentCycleSchema = {
  tags: ['Cycles'],
  summary: 'Get the current cycle + live leaderboard',
  description: `
Return the room's active cycle with a live leaderboard. Scores are the
sum of non-undone check-ins; \`percent\` is points/target capped at 100.
  `,
  security: [{ bearerAuth: [] }],
  params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  response: {
    200: SuccessResponse(CycleDetail),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const getCycleSchema = {
  tags: ['Cycles'],
  summary: 'Get a cycle by id',
  description: 'Cycle detail including the final leaderboard and stored result (if ended).',
  security: [{ bearerAuth: [] }],
  params: Type.Object({ cycleId: Type.String({ format: 'uuid' }) }),
  response: {
    200: SuccessResponse(CycleDetail),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const tieBreakSchema = {
  tags: ['Cycles'],
  summary: 'Resolve a cycle tie-break',
  description: `
Finalize a cycle whose result has a pending tie-break (PRD 6.1). Admin
only.

**Behavior**
- \`include_all\` keeps every tied member on the affected side
- \`manual\` keeps only the explicitly picked tied members
- The stored result's \`tieBreakRequired\` flag is cleared on success

**Restrictions**
- The cycle must be ended and still have an unresolved tie-break
  `,
  security: [{ bearerAuth: [] }],
  params: Type.Object({ cycleId: Type.String({ format: 'uuid' }) }),
  body: Type.Union([
    Type.Object({ pick: Type.Literal('include_all') }),
    Type.Object({
      pick: Type.Literal('manual'),
      winners: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
      losers: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
    }),
  ]),
  response: {
    200: SuccessResponse(
      Type.Object({
        resultJson: Type.Record(Type.String(), Type.Unknown()),
      }),
    ),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const advanceCycleSchema = {
  tags: ['Cycles'],
  summary: '[TEST ONLY] Force a cycle to end now',
  description: `
Test/development helper that immediately runs the end-of-cycle
processing for a cycle, bypassing the scheduled job. Disabled when
\`NODE_ENV=production\`. Requires the caller to be the room admin.
  `,
  security: [{ bearerAuth: [] }],
  params: Type.Object({ cycleId: Type.String({ format: 'uuid' }) }),
  response: {
    200: Type.Object({
      success: Type.Literal(true),
      data: Type.Object({
        processed: Type.Boolean(),
        result: Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
      }),
    }),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};
