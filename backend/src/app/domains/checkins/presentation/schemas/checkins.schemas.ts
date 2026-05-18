import { Type } from '@sinclair/typebox';
import {
  SuccessResponse,
  PaginatedResponse,
  PaginationQuerySchema,
} from '../../../../common/schemas/shared.schemas';

const CheckInItem = Type.Object({
  id: Type.String({ format: 'uuid' }),
  cycleId: Type.String({ format: 'uuid' }),
  userId: Type.String({ format: 'uuid' }),
  points: Type.Integer(),
  note: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  undoneAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

// Activity-feed row: a check-in joined with its author's public profile.
const ActivityItem = Type.Intersect([
  CheckInItem,
  Type.Object({
    user: Type.Object({
      id: Type.String({ format: 'uuid' }),
      publicId: Type.String(),
      displayName: Type.String(),
      avatarUrl: Type.Union([Type.String(), Type.Null()]),
    }),
  }),
]);

const CreateResult = Type.Object({
  checkIn: CheckInItem,
  myPoints: Type.Integer(),
  target: Type.Integer(),
  percent: Type.Number(),
});

export const createCheckInSchema = {
  tags: ['CheckIns'],
  summary: 'Record a check-in',
  description: `
Add points to the current cycle for the authenticated user.

**Behavior**
- \`points\` may be 1 (single) or more (e.g. catching up several at once, PRD 4.3)
- Capped at the user's target when the room has \`capAtTarget\` on
- Idempotent on \`clientId\` (safe offline-queue replay from mobile)
- Rate limited to 50 check-ins per user per room per day (PRD 6.5)

**Restrictions**
- The room must have an active cycle
- Returns 429 when the daily limit is exceeded
  `,
  security: [{ bearerAuth: [] }],
  params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  body: Type.Object({
    points: Type.Integer({ minimum: 1, maximum: 1000 }),
    note: Type.Optional(Type.Union([Type.String({ maxLength: 280 }), Type.Null()])),
    clientId: Type.Optional(Type.String({ maxLength: 64 })),
  }),
  response: {
    201: SuccessResponse(CreateResult),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
    409: { $ref: 'ConflictError#' },
    429: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 429 },
        error: { type: 'string', example: 'Too Many Requests' },
        message: { type: 'string', example: 'Daily check-in limit reached' },
      },
    },
  },
};

export const listCheckInsSchema = {
  tags: ['CheckIns'],
  summary: 'List check-ins',
  description: `
Paginated activity feed of check-ins for a room. Defaults to the current
cycle; filter by \`cycleId\` or \`userId\`. Undone check-ins are included
with \`undoneAt\` set.
  `,
  security: [{ bearerAuth: [] }],
  params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  querystring: Type.Intersect([
    PaginationQuerySchema,
    Type.Object({
      cycleId: Type.Optional(Type.String({ format: 'uuid' })),
      userId: Type.Optional(Type.String({ format: 'uuid' })),
    }),
  ]),
  response: {
    200: PaginatedResponse(ActivityItem),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const undoCheckInSchema = {
  tags: ['CheckIns'],
  summary: 'Undo a check-in',
  description: `
Undo one of your own check-ins. Allowed only within 24 hours of the
original action (PRD 6.5); older check-ins return 409. Backdating is not
permitted -- only undo.
  `,
  security: [{ bearerAuth: [] }],
  params: Type.Object({ checkInId: Type.String({ format: 'uuid' }) }),
  response: {
    200: Type.Object({ success: Type.Literal(true), message: Type.String() }),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
    409: { $ref: 'ConflictError#' },
  },
};
