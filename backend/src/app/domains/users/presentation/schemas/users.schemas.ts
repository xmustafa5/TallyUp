import { Type } from '@sinclair/typebox';
import { SuccessResponse, UserSummary } from '../../../../common/schemas/shared.schemas';

const FullProfile = Type.Intersect([
  UserSummary,
  Type.Object({
    email: Type.String(),
    timezone: Type.String(),
    locale: Type.String(),
    notifyHalfwayBehind: Type.Boolean(),
    notifyDeadline: Type.Boolean(),
    notifyResults: Type.Boolean(),
    createdAt: Type.String({ format: 'date-time' }),
  }),
]);

const UpdateMeBody = Type.Object({
  displayName: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
  avatarUrl: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  timezone: Type.Optional(Type.String({ maxLength: 64 })),
  locale: Type.Optional(Type.String({ maxLength: 8 })),
  notifyHalfwayBehind: Type.Optional(Type.Boolean()),
  notifyDeadline: Type.Optional(Type.Boolean()),
  notifyResults: Type.Optional(Type.Boolean()),
});

const PublicIdParams = Type.Object({
  publicId: Type.String({ minLength: 1, maxLength: 20 }),
});

export const getMeSchema = {
  tags: ['Users'],
  summary: 'Get my profile',
  description: 'Return the authenticated user\'s full profile including notification preferences.',
  security: [{ bearerAuth: [] }],
  response: {
    200: SuccessResponse(FullProfile),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const updateMeSchema = {
  tags: ['Users'],
  summary: 'Update my profile',
  description: `
Update editable profile fields.

**Updatable fields**
- displayName, avatarUrl, timezone, locale
- notification preferences (halfway, deadline, results)

The User ID and email are immutable here.
  `,
  security: [{ bearerAuth: [] }],
  body: UpdateMeBody,
  response: {
    200: SuccessResponse(FullProfile),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const lookupByPublicIdSchema = {
  tags: ['Users'],
  summary: 'Look up a user by User ID',
  description: `
Resolve a shareable User ID (e.g. \`ALI-2941\`) to a minimal public
profile. Used by the invite flow. Never exposes email or phone.
  `,
  security: [{ bearerAuth: [] }],
  params: PublicIdParams,
  response: {
    200: SuccessResponse(UserSummary),
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const myHistorySchema = {
  tags: ['Users'],
  summary: 'My cross-room history',
  description: `
Aggregated personal stats across every room the user is a member of
(PRD 4.6): total completed cycles participated in, wins, losses, and
average target-completion percentage.

**Returns**
- \`participations\`, \`wins\`, \`losses\`, \`avgPercent\` (0-100)
- \`recent\`: the most recent ended cycles with the user's outcome
  `,
  security: [{ bearerAuth: [] }],
  response: {
    200: SuccessResponse(
      Type.Object({
        participations: Type.Integer(),
        wins: Type.Integer(),
        losses: Type.Integer(),
        avgPercent: Type.Number(),
        recent: Type.Array(
          Type.Object({
            cycleId: Type.String({ format: 'uuid' }),
            roomId: Type.String({ format: 'uuid' }),
            roomName: Type.String(),
            cycleNumber: Type.Integer(),
            endsAt: Type.String({ format: 'date-time' }),
            outcome: Type.Union([
              Type.Literal('won'),
              Type.Literal('lost'),
              Type.Literal('participated'),
            ]),
          }),
        ),
      }),
    ),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const deleteMeSchema = {
  tags: ['Users'],
  summary: 'Delete my account',
  description: `
Permanently delete the authenticated user's account and all associated
data (GDPR-style deletion). This cascades to memberships, check-ins,
invitations, notifications and device tokens. Irreversible.
  `,
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Object({ success: Type.Literal(true), message: Type.String() }),
    401: { $ref: 'UnauthorizedError#' },
  },
};
