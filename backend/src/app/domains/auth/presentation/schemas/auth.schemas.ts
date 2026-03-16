import { Type } from '@sinclair/typebox';
import { MessageResponse, SuccessResponse } from '../../../../common/schemas/shared.schemas';

const UserData = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  name: Type.String(),
  birthdate: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  pubertyAge: Type.Union([Type.Integer(), Type.Null()]),
  provider: Type.Union([Type.Literal('LOCAL'), Type.Literal('GOOGLE'), Type.Literal('APPLE')]),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

const AuthTokens = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
});

const AuthResponse = Type.Object({
  user: UserData,
  tokens: AuthTokens,
});

export const registerSchema = {
  tags: ['Auth'],
  summary: 'Register a new user',
  description: `
Create a new user account with email and password.

**Features**
- Validates email format and uniqueness
- Hashes password with bcrypt (12 salt rounds)
- Returns JWT access and refresh tokens

**Restrictions**
- Email must be unique
- Password must be 8-128 characters
- Name is required (max 255 characters)
  `,
  body: Type.Object({
    email: Type.String({ format: 'email', maxLength: 255 }),
    name: Type.String({ minLength: 1, maxLength: 255 }),
    password: Type.String({ minLength: 8, maxLength: 128 }),
  }),
  response: {
    201: SuccessResponse(AuthResponse),
    400: { $ref: 'BadRequestError#' },
    409: { $ref: 'ConflictError#' },
  },
};

export const loginSchema = {
  tags: ['Auth'],
  summary: 'Login with email and password',
  description: `
Authenticate a user and return JWT tokens.

**Returns**
- User profile data
- Access token (short-lived)
- Refresh token (long-lived)

**Behavior**
- Returns 401 for invalid credentials
- Returns 401 for deactivated accounts
  `,
  body: Type.Object({
    email: Type.String({ format: 'email' }),
    password: Type.String({ minLength: 1 }),
  }),
  response: {
    200: SuccessResponse(AuthResponse),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const refreshSchema = {
  tags: ['Auth'],
  summary: 'Refresh access token',
  description: `
Exchange a valid refresh token for a new access/refresh token pair.

**Behavior**
- Validates the refresh token
- Issues new access and refresh tokens
- Old refresh token is invalidated (stored in Redis)
  `,
  body: Type.Object({
    refreshToken: Type.String(),
  }),
  response: {
    200: SuccessResponse(AuthTokens),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const meSchema = {
  tags: ['Auth'],
  summary: 'Get current user profile',
  description: `
Returns the authenticated user's profile data.

**Restrictions**
- Requires valid Bearer token in Authorization header
  `,
  response: {
    200: SuccessResponse(UserData),
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const changePasswordSchema = {
  tags: ['Auth'],
  summary: 'Change password',
  description: `
Change the authenticated user's password.

**Behavior**
- Validates the current password matches
- Hashes the new password with bcrypt
- Returns 401 if current password is incorrect

**Restrictions**
- Requires valid Bearer token in Authorization header
- New password must be 8-128 characters
  `,
  body: Type.Object({
    currentPassword: Type.String({ minLength: 8, maxLength: 128 }),
    newPassword: Type.String({ minLength: 8, maxLength: 128 }),
  }),
  response: {
    200: MessageResponse,
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const deleteAccountSchema = {
  tags: ['Auth'],
  summary: 'Delete account',
  description: `
Permanently delete the authenticated user's account and all associated data.

**Behavior**
- Requires password confirmation
- Cascades deletion to all related records (gap periods, prayer balances, makeup logs, etc.)
- Returns 401 if password is incorrect

**Restrictions**
- Requires valid Bearer token in Authorization header
- This action is irreversible
  `,
  body: Type.Object({
    password: Type.String({ minLength: 1 }),
  }),
  response: {
    200: MessageResponse,
    401: { $ref: 'UnauthorizedError#' },
  },
};
