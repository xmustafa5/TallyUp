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
