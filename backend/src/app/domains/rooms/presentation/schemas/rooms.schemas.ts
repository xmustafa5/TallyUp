import { Type } from '@sinclair/typebox';
import {
  SuccessResponse,
  UserSummary,
} from '../../../../common/schemas/shared.schemas';

const PeriodType = Type.Union([
  Type.Literal('week'),
  Type.Literal('month'),
  Type.Literal('custom'),
  Type.Literal('oneshot'),
]);
const WinnerRule = Type.Union([
  Type.Literal('none'),
  Type.Literal('highest'),
  Type.Literal('lowest'),
  Type.Literal('top_n'),
  Type.Literal('threshold'),
]);
const LoserRule = Type.Union([
  Type.Literal('none'),
  Type.Literal('lowest'),
  Type.Literal('highest'),
  Type.Literal('bottom_n'),
  Type.Literal('threshold'),
]);

const MemberRow = Type.Object({
  user: UserSummary,
  target: Type.Integer(),
  role: Type.Union([Type.Literal('admin'), Type.Literal('member')]),
  joinedLate: Type.Boolean(),
  includeInCurrentCycle: Type.Union([Type.Boolean(), Type.Null()]),
  leftAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

const RoomCore = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  icon: Type.Union([Type.String(), Type.Null()]),
  description: Type.Union([Type.String(), Type.Null()]),
  adminUserId: Type.String({ format: 'uuid' }),
  timezone: Type.String(),
  periodType: PeriodType,
  customDays: Type.Union([Type.Integer(), Type.Null()]),
  startDayOfWeek: Type.Union([Type.Integer(), Type.Null()]),
  startDayOfMonth: Type.Union([Type.Integer(), Type.Null()]),
  winnerRule: WinnerRule,
  winnerN: Type.Union([Type.Integer(), Type.Null()]),
  loserRule: LoserRule,
  loserN: Type.Union([Type.Integer(), Type.Null()]),
  capAtTarget: Type.Boolean(),
  stake: Type.Union([Type.String(), Type.Null()]),
  status: Type.String(),
  currentCycleId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
});

const RoomDetail = Type.Intersect([
  RoomCore,
  Type.Object({
    members: Type.Array(MemberRow),
    myRole: Type.Union([Type.Literal('admin'), Type.Literal('member')]),
    currentCycle: Type.Union([
      Type.Object({
        id: Type.String({ format: 'uuid' }),
        cycleNumber: Type.Integer(),
        startsAt: Type.String({ format: 'date-time' }),
        endsAt: Type.String({ format: 'date-time' }),
        status: Type.String(),
      }),
      Type.Null(),
    ]),
  }),
]);

const RoomListItem = Type.Intersect([
  RoomCore,
  Type.Object({
    myRole: Type.Union([Type.Literal('admin'), Type.Literal('member')]),
    memberCount: Type.Integer(),
    currentCycle: Type.Union([
      Type.Object({
        id: Type.String({ format: 'uuid' }),
        cycleNumber: Type.Integer(),
        startsAt: Type.String({ format: 'date-time' }),
        endsAt: Type.String({ format: 'date-time' }),
        status: Type.String(),
      }),
      Type.Null(),
    ]),
  }),
]);

const CreateRoomBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 80 }),
  icon: Type.Optional(Type.Union([Type.String({ maxLength: 16 }), Type.Null()])),
  description: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  timezone: Type.Optional(Type.String({ maxLength: 64 })),
  periodType: PeriodType,
  customDays: Type.Optional(Type.Union([Type.Integer({ minimum: 1, maximum: 365 }), Type.Null()])),
  startDayOfWeek: Type.Optional(Type.Union([Type.Integer({ minimum: 0, maximum: 6 }), Type.Null()])),
  startDayOfMonth: Type.Optional(Type.Union([Type.Integer({ minimum: 1, maximum: 28 }), Type.Null()])),
  winnerRule: Type.Optional(WinnerRule),
  winnerN: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  loserRule: Type.Optional(LoserRule),
  loserN: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  capAtTarget: Type.Optional(Type.Boolean()),
  stake: Type.Optional(Type.Union([Type.String({ maxLength: 280 }), Type.Null()])),
});

const PatchRoomBody = Type.Partial(CreateRoomBody);

const RoomParams = Type.Object({ id: Type.String({ format: 'uuid' }) });

export const createRoomSchema = {
  tags: ['Rooms'],
  summary: 'Create a room',
  description: `
Create a new challenge room in \`draft\` status. The creator becomes the
admin and first member (target defaults to 1, editable later).

**Defaults**
- timezone copied from the creator's profile if omitted
- winnerRule/loserRule default to \`none\` (pure leaderboard)
- capAtTarget defaults to true (PRD 4.3)
  `,
  security: [{ bearerAuth: [] }],
  body: CreateRoomBody,
  response: {
    201: SuccessResponse(RoomDetail),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const listRoomsSchema = {
  tags: ['Rooms'],
  summary: 'List my rooms',
  description: 'All rooms the authenticated user is an active member of, with current-cycle summary.',
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Object({
      success: Type.Literal(true),
      data: Type.Array(RoomListItem),
    }),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const getRoomSchema = {
  tags: ['Rooms'],
  summary: 'Get room detail',
  description: 'Full room config, member list, my role, and current-cycle summary.',
  security: [{ bearerAuth: [] }],
  params: RoomParams,
  response: {
    200: SuccessResponse(RoomDetail),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const patchRoomSchema = {
  tags: ['Rooms'],
  summary: 'Update room config',
  description: `
Update room metadata, period, or rules (admin only).

**Behavior**
- Name/icon/description/stake changes take effect immediately
- Period/rule changes apply to the NEXT cycle, never the running one (PRD 6.5)
  `,
  security: [{ bearerAuth: [] }],
  params: RoomParams,
  body: PatchRoomBody,
  response: {
    200: SuccessResponse(RoomDetail),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const startRoomSchema = {
  tags: ['Rooms'],
  summary: 'Start the room',
  description: `
Transition a \`draft\` room to \`active\`, creating cycle #1 and scheduling
its end. \`startAtNextBoundary\` aligns the first cycle to the configured
weekly/monthly boundary instead of starting immediately.
  `,
  security: [{ bearerAuth: [] }],
  params: RoomParams,
  body: Type.Object({
    startAtNextBoundary: Type.Optional(Type.Boolean({ default: false })),
  }),
  response: {
    200: SuccessResponse(RoomDetail),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const roomActionSchema = (summary: string, description: string) => ({
  tags: ['Rooms'],
  summary,
  description,
  security: [{ bearerAuth: [] }],
  params: RoomParams,
  response: {
    200: SuccessResponse(RoomDetail),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
});

export const transferAdminSchema = {
  tags: ['Rooms'],
  summary: 'Transfer admin rights',
  description: 'Hand the admin role to another member of the room (admin only).',
  security: [{ bearerAuth: [] }],
  params: RoomParams,
  body: Type.Object({ toUserId: Type.String({ format: 'uuid' }) }),
  response: {
    200: SuccessResponse(RoomDetail),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const listMembersSchema = {
  tags: ['Rooms'],
  summary: 'List room members',
  description: 'All memberships for a room including targets and roles.',
  security: [{ bearerAuth: [] }],
  params: RoomParams,
  response: {
    200: Type.Object({
      success: Type.Literal(true),
      data: Type.Array(MemberRow),
    }),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const patchMemberSchema = {
  tags: ['Rooms'],
  summary: 'Update a member\'s target',
  description: `
Set a member's point target (admin only). Targets can differ per member
(PRD 2.2). Also used to opt a late-joiner into the current cycle via
\`includeInCurrentCycle\`.
  `,
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.String({ format: 'uuid' }),
    userId: Type.String({ format: 'uuid' }),
  }),
  body: Type.Object({
    target: Type.Optional(Type.Integer({ minimum: 1 })),
    includeInCurrentCycle: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  }),
  response: {
    200: SuccessResponse(MemberRow),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const removeMemberSchema = {
  tags: ['Rooms'],
  summary: 'Remove a member',
  description: 'Soft-remove a member (sets leftAt). Their data stays until the cycle ends (PRD 6.2).',
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.String({ format: 'uuid' }),
    userId: Type.String({ format: 'uuid' }),
  }),
  response: {
    200: Type.Object({ success: Type.Literal(true), message: Type.String() }),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const leaveRoomSchema = {
  tags: ['Rooms'],
  summary: 'Leave a room',
  description: 'Leave a room you are a member of. The admin must transfer rights before leaving (PRD 6.3).',
  security: [{ bearerAuth: [] }],
  params: RoomParams,
  response: {
    200: Type.Object({ success: Type.Literal(true), message: Type.String() }),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};
