import { Type } from '@sinclair/typebox';
import { SuccessResponse, MessageResponse } from '../../../../common/schemas/shared.schemas';

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
