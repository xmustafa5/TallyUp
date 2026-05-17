import { Type } from '@sinclair/typebox';
import { SuccessResponse, UserSummary } from '../../../../common/schemas/shared.schemas';

const AuthData = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  user: Type.Intersect([
    UserSummary,
    Type.Object({
      email: Type.String(),
      timezone: Type.String(),
      locale: Type.String(),
    }),
  ]),
});

const RegisterBody = Type.Object({
  email: Type.String({ format: 'email', maxLength: 255 }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
  displayName: Type.String({ minLength: 1, maxLength: 80 }),
  timezone: Type.Optional(Type.String({ maxLength: 64, default: 'UTC' })),
  locale: Type.Optional(Type.String({ maxLength: 8, default: 'en' })),
});

const LoginBody = Type.Object({
  email: Type.String({ format: 'email', maxLength: 255 }),
  password: Type.String({ minLength: 1, maxLength: 128 }),
});

const RefreshBody = Type.Object({
  refreshToken: Type.String(),
});

export const registerSchema = {
  tags: ['Auth'],
  summary: 'Register a new account',
  description: `
Create a new TallyUp account with email and password.

**Automatic features**
- A unique, human-readable User ID (e.g. \`ALI-2941\`) is generated from the display name
- Password is hashed with bcrypt before storage
- An access token (short-lived) and refresh token (long-lived) are issued immediately

**Validation**
- Email must be unique and well-formed
- Password must be at least 8 characters
  `,
  body: RegisterBody,
  response: {
    201: SuccessResponse(AuthData),
    400: { $ref: 'BadRequestError#' },
    409: { $ref: 'ConflictError#' },
  },
};

export const loginSchema = {
  tags: ['Auth'],
  summary: 'Log in',
  description: `
Authenticate with email and password.

**Returns**
- A new access + refresh token pair
- The authenticated user's public profile

**Behavior**
- Invalid credentials return 401 without revealing whether the email exists
  `,
  body: LoginBody,
  response: {
    200: SuccessResponse(AuthData),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const refreshSchema = {
  tags: ['Auth'],
  summary: 'Refresh tokens',
  description: `
Exchange a valid refresh token for a new access + refresh token pair.

**Behavior**
- The presented refresh token is rotated (revoked) and a new one issued
- Reusing a revoked or expired refresh token returns 401
  `,
  body: RefreshBody,
  response: {
    200: SuccessResponse(AuthData),
    400: { $ref: 'BadRequestError#' },
    401: { $ref: 'UnauthorizedError#' },
  },
};

export const logoutSchema = {
  tags: ['Auth'],
  summary: 'Log out',
  description: `
Revoke the current session's refresh token.

**Behavior**
- Requires a valid access token
- The refresh token jti embedded in the access token's session is revoked
- Idempotent -- logging out twice is safe
  `,
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Object({ success: Type.Literal(true), message: Type.String() }),
    401: { $ref: 'UnauthorizedError#' },
  },
};
