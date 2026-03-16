import { Type } from '@sinclair/typebox';
import { SuccessResponse } from '../../../../common/schemas/shared.schemas';

const ProfileData = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  name: Type.String(),
  birthdate: Type.Union([Type.String({ format: 'date' }), Type.Null()]),
  pubertyAge: Type.Union([Type.Integer(), Type.Null()]),
  provider: Type.Union([Type.Literal('LOCAL'), Type.Literal('GOOGLE'), Type.Literal('APPLE')]),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export const getProfileSchema = {
  tags: ['Profile'],
  summary: 'Get current user profile',
  description: `
Returns the authenticated user's profile including birthdate and puberty age settings.

**Restrictions**
- Requires valid Bearer token
  `,
  response: {
    200: SuccessResponse(ProfileData),
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
  },
};

export const updateProfileSchema = {
  tags: ['Profile'],
  summary: 'Update user profile',
  description: `
Update the user's profile settings including birthdate and puberty age.

**Updatable Fields**
- name: Display name (1-255 characters)
- birthdate: Date of birth in YYYY-MM-DD format
- pubertyAge: Age of puberty (9-17) for accurate prayer calculation

**Behavior**
- Only provided fields are updated
- Birthdate is required before using the prayer calculator
  `,
  body: Type.Object({
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    birthdate: Type.Optional(Type.String({ format: 'date' })),
    pubertyAge: Type.Optional(
      Type.Union([Type.Integer({ minimum: 9, maximum: 17 }), Type.Null()]),
    ),
  }),
  response: {
    200: SuccessResponse(ProfileData),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
    404: { $ref: 'NotFoundError#' },
  },
};
