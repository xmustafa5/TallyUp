import type { FastifyInstance } from 'fastify';
import { getProfileSchema, updateProfileSchema } from '../schemas/profile.schemas';

export default async function profileRoutes(fastify: FastifyInstance) {
  // All profile routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /profile
  fastify.get('/', { schema: getProfileSchema }, async (request, reply) => {
    const { id } = request.user as { id: string };

    const user = await fastify.prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.notFound('User not found');
    }

    return reply.send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        birthdate: user.birthdate?.toISOString().split('T')[0] ?? null,
        pubertyAge: user.pubertyAge ?? null,
        provider: user.provider,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  });

  // PUT /profile
  fastify.put('/', { schema: updateProfileSchema }, async (request, reply) => {
    const { id } = request.user as { id: string };
    const body = request.body as {
      name?: string;
      birthdate?: string;
      pubertyAge?: number | null;
    };

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }

    if (body.birthdate !== undefined) {
      const date = new Date(body.birthdate);
      if (isNaN(date.getTime())) {
        return reply.badRequest('Invalid date format');
      }
      if (date > new Date()) {
        return reply.badRequest('Birthdate cannot be in the future');
      }
      updateData.birthdate = date;
    }

    if (body.pubertyAge !== undefined) {
      updateData.pubertyAge = body.pubertyAge;
    }

    const user = await fastify.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return reply.send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        birthdate: user.birthdate?.toISOString().split('T')[0] ?? null,
        pubertyAge: user.pubertyAge ?? null,
        provider: user.provider,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  });
}
