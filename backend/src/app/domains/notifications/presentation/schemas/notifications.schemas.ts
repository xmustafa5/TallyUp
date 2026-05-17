import { Type } from '@sinclair/typebox';
import {
  SuccessResponse,
  PaginatedResponse,
  PaginationQuerySchema,
} from '../../../../common/schemas/shared.schemas';

const NotificationItem = Type.Object({
  id: Type.String({ format: 'uuid' }),
  type: Type.String(),
  payload: Type.Record(Type.String(), Type.Unknown()),
  readAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
});

const ListQuery = Type.Intersect([
  PaginationQuerySchema,
  Type.Object({ unread: Type.Optional(Type.Boolean()) }),
]);

const MarkReadBody = Type.Object({
  ids: Type.Union([Type.Array(Type.String({ format: 'uuid' })), Type.Literal('all')]),
});

const RegisterTokenBody = Type.Object({
  token: Type.String({ minLength: 1, maxLength: 255 }),
  platform: Type.Union([
    Type.Literal('ios'),
    Type.Literal('android'),
    Type.Literal('web'),
  ]),
});

const DeviceTokenData = Type.Object({
  id: Type.String({ format: 'uuid' }),
  platform: Type.String(),
});

export const listNotificationsSchema = {
  tags: ['Notifications'],
  summary: 'List my notifications',
  description: `
Paginated list of the authenticated user's notifications, newest first.

**Filtering**
- \`unread=true\` returns only unread notifications
  `,
  security: [{ bearerAuth: [] }],
  querystring: ListQuery,
  response: {
    200: PaginatedResponse(NotificationItem),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const markReadSchema = {
  tags: ['Notifications'],
  summary: 'Mark notifications as read',
  description: 'Mark a specific set of notifications as read, or all of them with `"all"`.',
  security: [{ bearerAuth: [] }],
  body: MarkReadBody,
  response: {
    200: Type.Object({ success: Type.Literal(true), message: Type.String() }),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const registerDeviceTokenSchema = {
  tags: ['Notifications'],
  summary: 'Register an Expo push token',
  description: `
Upsert the caller's Expo push token for this device. Re-registering the
same token updates its \`lastSeenAt\`. Tokens are used to deliver push
notifications for invites and cycle events.
  `,
  security: [{ bearerAuth: [] }],
  body: RegisterTokenBody,
  response: {
    200: SuccessResponse(DeviceTokenData),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const deleteDeviceTokenSchema = {
  tags: ['Notifications'],
  summary: 'Remove a device token',
  description: 'Delete a device token (called on sign-out). Idempotent.',
  security: [{ bearerAuth: [] }],
  params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  response: {
    200: Type.Object({ success: Type.Literal(true), message: Type.String() }),
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
  },
};
