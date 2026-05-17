import { Type } from '@sinclair/typebox';
import { SuccessResponse, UserSummary } from '../../../../common/schemas/shared.schemas';

const InvitationItem = Type.Object({
  id: Type.String({ format: 'uuid' }),
  roomId: Type.String({ format: 'uuid' }),
  roomName: Type.String(),
  status: Type.String(),
  from: UserSummary,
  to: UserSummary,
  createdAt: Type.String({ format: 'date-time' }),
});

export const sendInvitationSchema = {
  tags: ['Invitations'],
  summary: 'Invite a user to a room',
  description: `
Invite a user by their shareable User ID (e.g. \`ALI-2941\`). Admin only.

**Behavior**
- Sends an in-app + push notification to the invitee
- Rejects duplicates while a pending invite already exists
- Rejects inviting an existing active member
  `,
  security: [{ bearerAuth: [] }],
  body: Type.Object({
    roomId: Type.String({ format: 'uuid' }),
    toPublicId: Type.String({ minLength: 1, maxLength: 20 }),
  }),
  response: {
    201: SuccessResponse(InvitationItem),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
    409: { $ref: 'ConflictError#' },
  },
};

export const incomingInvitationsSchema = {
  tags: ['Invitations'],
  summary: 'List my pending invitations',
  description: 'All invitations addressed to the authenticated user that are still pending.',
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Object({
      success: Type.Literal(true),
      data: Type.Array(InvitationItem),
    }),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const outgoingInvitationsSchema = {
  tags: ['Invitations'],
  summary: 'List a room\'s pending invitations',
  description: 'Pending invitations sent for a room (admin only).',
  security: [{ bearerAuth: [] }],
  params: Type.Object({ roomId: Type.String({ format: 'uuid' }) }),
  response: {
    200: Type.Object({
      success: Type.Literal(true),
      data: Type.Array(InvitationItem),
    }),
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const respondInvitationSchema = (summary: string, description: string) => ({
  tags: ['Invitations'],
  summary,
  description,
  security: [{ bearerAuth: [] }],
  params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
  response: {
    200: SuccessResponse(InvitationItem),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    403: { $ref: 'ForbiddenError#' },
    404: { $ref: 'NotFoundError#' },
  },
});
