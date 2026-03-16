import type { FastifyInstance } from 'fastify';
import {
  registerDeviceSchema,
  removeDeviceSchema,
  getPreferencesSchema,
  updatePreferencesSchema,
} from '../schemas/notification.schemas';

export default async function notificationRoutes(fastify: FastifyInstance) {
  // All notification routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /notifications/devices
  fastify.post('/devices', { schema: registerDeviceSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { token, platform } = request.body as { token: string; platform: string };

    await fastify.prisma.deviceToken.upsert({
      where: { token },
      update: {
        userId,
        platform,
        isActive: true,
      },
      create: {
        userId,
        token,
        platform,
        isActive: true,
      },
    });

    return reply.send({
      success: true,
      message: 'Device token registered successfully',
    });
  });

  // DELETE /notifications/devices/:token
  fastify.delete('/devices/:token', { schema: removeDeviceSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { token } = request.params as { token: string };

    const deviceToken = await fastify.prisma.deviceToken.findFirst({
      where: { token, userId },
    });

    if (!deviceToken) {
      return reply.notFound('Device token not found');
    }

    await fastify.prisma.deviceToken.update({
      where: { id: deviceToken.id },
      data: { isActive: false },
    });

    return reply.send({
      success: true,
      message: 'Device token removed successfully',
    });
  });

  // GET /notifications/preferences
  fastify.get('/preferences', { schema: getPreferencesSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const preferences = await fastify.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        prayerReminders: true,
        goalReminders: true,
        streakReminders: true,
        milestones: true,
      },
    });

    return reply.send({
      success: true,
      data: {
        id: preferences.id,
        prayerReminders: preferences.prayerReminders,
        goalReminders: preferences.goalReminders,
        streakReminders: preferences.streakReminders,
        milestones: preferences.milestones,
        createdAt: preferences.createdAt.toISOString(),
        updatedAt: preferences.updatedAt.toISOString(),
      },
    });
  });

  // PUT /notifications/preferences
  fastify.put('/preferences', { schema: updatePreferencesSchema }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const body = request.body as {
      prayerReminders?: boolean;
      goalReminders?: boolean;
      streakReminders?: boolean;
      milestones?: boolean;
    };

    const preferences = await fastify.prisma.notificationPreference.upsert({
      where: { userId },
      update: body,
      create: {
        userId,
        prayerReminders: body.prayerReminders ?? true,
        goalReminders: body.goalReminders ?? true,
        streakReminders: body.streakReminders ?? true,
        milestones: body.milestones ?? true,
      },
    });

    return reply.send({
      success: true,
      data: {
        id: preferences.id,
        prayerReminders: preferences.prayerReminders,
        goalReminders: preferences.goalReminders,
        streakReminders: preferences.streakReminders,
        milestones: preferences.milestones,
        createdAt: preferences.createdAt.toISOString(),
        updatedAt: preferences.updatedAt.toISOString(),
      },
    });
  });
}
