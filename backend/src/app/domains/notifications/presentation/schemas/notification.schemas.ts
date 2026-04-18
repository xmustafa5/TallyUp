import { Type } from '@sinclair/typebox';
import {
  SuccessResponse,
  MessageResponse,
  PaginatedResponse,
} from '../../../../common/schemas/shared.schemas';

const NotificationData = Type.Object({
  id: Type.String({ format: 'uuid' }),
  type: Type.Union([
    Type.Literal('PRAYER_REMINDER'),
    Type.Literal('GOAL_REMINDER'),
    Type.Literal('STREAK_REMINDER'),
    Type.Literal('MILESTONE'),
  ]),
  title: Type.String(),
  body: Type.String(),
  data: Type.Union([Type.Any(), Type.Null()]),
  readAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
});

const UnreadCountData = Type.Object({
  unreadCount: Type.Integer({ minimum: 0 }),
});

const NotificationPreferencesData = Type.Object({
  id: Type.String({ format: 'uuid' }),
  prayerReminders: Type.Boolean(),
  goalReminders: Type.Boolean(),
  streakReminders: Type.Boolean(),
  milestones: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export const registerDeviceSchema = {
  tags: ['Notifications'],
  summary: 'Register a device token for push notifications',
  description: `
Registers a device token for the authenticated user. If the token already
exists, it will be reactivated and associated with the current user.

**Body**
- token: The device push notification token
- platform: The device platform (web, android, or ios)
  `,
  body: Type.Object({
    token: Type.String({ minLength: 1, maxLength: 500 }),
    platform: Type.Union([
      Type.Literal('web'),
      Type.Literal('android'),
      Type.Literal('ios'),
    ]),
  }),
  response: {
    200: MessageResponse,
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const removeDeviceSchema = {
  tags: ['Notifications'],
  summary: 'Remove a device token',
  description: `
Deactivates a device token so it no longer receives push notifications.
The token is not deleted, but marked as inactive.
  `,
  params: Type.Object({
    token: Type.String({ minLength: 1 }),
  }),
  response: {
    200: MessageResponse,
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const getPreferencesSchema = {
  tags: ['Notifications'],
  summary: 'Get notification preferences',
  description: `
Returns the notification preferences for the authenticated user.
If no preferences exist yet, default preferences are created with
all notification types enabled.
  `,
  response: {
    200: SuccessResponse(NotificationPreferencesData),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const updatePreferencesSchema = {
  tags: ['Notifications'],
  summary: 'Update notification preferences',
  description: `
Updates notification preferences for the authenticated user.
All fields are optional; only provided fields are updated.

**Body**
- prayerReminders: Enable daily prayer reminders
- goalReminders: Enable goal reminder notifications
- streakReminders: Enable streak maintenance reminders
- milestones: Enable milestone celebration notifications
  `,
  body: Type.Object({
    prayerReminders: Type.Optional(Type.Boolean()),
    goalReminders: Type.Optional(Type.Boolean()),
    streakReminders: Type.Optional(Type.Boolean()),
    milestones: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: SuccessResponse(NotificationPreferencesData),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const listNotificationsSchema = {
  tags: ['Notifications'],
  summary: 'List notifications for the authenticated user',
  description: `
Returns a paginated list of notifications, newest first.

**Query**
- page: Page number (default 1)
- pageSize: Items per page (default 20, max 100)
- onlyUnread: If true, only returns unread notifications
  `,
  querystring: Type.Object({
    page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
    onlyUnread: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: PaginatedResponse(NotificationData),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const getUnreadCountSchema = {
  tags: ['Notifications'],
  summary: 'Get unread notification count',
  description: `
Returns the number of unread notifications for the authenticated user.
Used to render the unread badge on the notification bell / tab icon.
  `,
  response: {
    200: SuccessResponse(UnreadCountData),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const markNotificationReadSchema = {
  tags: ['Notifications'],
  summary: 'Mark a notification as read',
  description: `
Marks a single notification as read. Idempotent — re-marking an already-read
notification returns the existing record unchanged.
  `,
  params: Type.Object({
    id: Type.String({ format: 'uuid' }),
  }),
  response: {
    200: SuccessResponse(NotificationData),
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const markAllReadSchema = {
  tags: ['Notifications'],
  summary: 'Mark all notifications as read',
  description: `
Marks every unread notification for the authenticated user as read.
Returns the count of notifications that were updated.
  `,
  response: {
    200: SuccessResponse(Type.Object({ updated: Type.Integer({ minimum: 0 }) })),
    401: { $ref: 'UnauthorizedError#' },
  },
};
