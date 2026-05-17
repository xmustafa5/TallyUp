import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { User } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Parse a duration string like `30d`, `15m`, `24h`, `45s` or a raw number
 * of seconds into milliseconds. Used to compute the refresh-token row's
 * expiry; @fastify/jwt itself handles the JWT `exp` claim.
 */
export function durationToMs(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return 30 * 24 * 60 * 60 * 1000; // safe default: 30d
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * unitMs[unit];
}

/**
 * Issue a fresh access + refresh token pair for a user and persist the
 * refresh token's jti so it can be revoked on logout.
 */
export async function issueTokenPair(
  fastify: FastifyInstance,
  user: Pick<User, 'id' | 'publicId' | 'email'>,
): Promise<TokenPair> {
  const accessToken = await fastify.jwt.sign({
    id: user.id,
    publicId: user.publicId,
    email: user.email,
    type: 'access',
  });

  const jti = randomUUID();
  const refreshTtlMs = durationToMs(fastify.config.JWT_REFRESH_EXPIRES_IN);

  const refreshToken = await fastify.jwt.sign(
    { id: user.id, type: 'refresh', jti },
    { expiresIn: fastify.config.JWT_REFRESH_EXPIRES_IN },
  );

  await fastify.prisma.refreshToken.create({
    data: {
      jti,
      user: { connect: { id: user.id } },
      expiresAt: new Date(Date.now() + refreshTtlMs),
    },
  });

  return { accessToken, refreshToken };
}

/**
 * Rotate a refresh token: validate the presented jti is active and not
 * expired, revoke it, then issue a brand-new pair.
 */
export async function rotateRefreshToken(
  fastify: FastifyInstance,
  payload: { id: string; jti?: string; type?: string },
): Promise<TokenPair | null> {
  if (payload.type !== 'refresh' || !payload.jti) return null;

  const stored = await fastify.prisma.refreshToken.findUnique({
    where: { jti: payload.jti },
  });

  if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    return null;
  }

  const user = await fastify.prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, publicId: true, email: true },
  });
  if (!user) return null;

  await fastify.prisma.refreshToken.update({
    where: { jti: payload.jti },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(fastify, user);
}

/**
 * Revoke a refresh token by jti (used on logout). Idempotent.
 */
export async function revokeRefreshToken(
  fastify: FastifyInstance,
  jti: string | undefined,
): Promise<void> {
  if (!jti) return;
  await fastify.prisma.refreshToken.updateMany({
    where: { jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
