import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Membership } from '@prisma/client';

/**
 * Extend the request with the resolved membership so handlers don't
 * have to re-query it.
 */
declare module 'fastify' {
  interface FastifyRequest {
    membership?: Membership;
  }
}

function extractRoomId(request: FastifyRequest): string | undefined {
  const params = request.params as Record<string, string> | undefined;
  const body = request.body as Record<string, unknown> | undefined;
  return params?.id ?? params?.roomId ?? (body?.roomId as string | undefined);
}

/**
 * Verify the JWT if it has not been verified yet on this request. Makes
 * the membership/admin preHandlers self-contained so routes only need to
 * declare a single preHandler.
 */
async function ensureAuthenticated(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  if (request.user) return true;
  let payload: { type?: 'access' | 'refresh' };
  try {
    payload = await request.jwtVerify();
  } catch {
    reply.unauthorized('Invalid or expired token');
    return false;
  }
  if (payload.type === 'refresh') {
    reply.unauthorized('Refresh token cannot be used to access resources');
    return false;
  }
  return true;
}

/**
 * preHandler: ensure the authenticated user is an active member of the
 * room identified by `:id` / `:roomId` (params) or `roomId` (body).
 *
 * - 401 if the request is not authenticated
 * - 400 if no room id is present on the request
 * - 404 if the user has no membership in that room
 * - 403 if the membership exists but the user has left the room
 *
 * On success, attaches `request.membership`.
 */
export async function requireMembership(request: FastifyRequest, reply: FastifyReply) {
  if (!(await ensureAuthenticated(request, reply))) return;

  const roomId = extractRoomId(request);
  if (!roomId) {
    return reply.badRequest('Room id is required');
  }

  const membership = await request.server.prisma.membership.findUnique({
    where: { roomId_userId: { roomId, userId: request.user.id } },
  });

  if (!membership) {
    return reply.notFound('Room not found or you are not a member');
  }

  if (membership.leftAt) {
    return reply.forbidden('You have left this room');
  }

  request.membership = membership;
}

/**
 * preHandler: same as requireMembership, but additionally requires the
 * membership role to be `admin`.
 *
 * - 403 if the user is a member but not an admin
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireMembership(request, reply);
  if (reply.sent) return;

  if (request.membership?.role !== 'admin') {
    return reply.forbidden('Only the room admin can perform this action');
  }
}
