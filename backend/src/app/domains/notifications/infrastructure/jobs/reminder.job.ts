import type { FastifyInstance } from 'fastify';
import { Worker } from 'bullmq';
import { sendPushNotification } from '../../domain/services/notification.service';

/**
 * Sets up repeatable BullMQ jobs for push notification reminders.
 * Registers a prayer reminder (8:00 AM UTC) and a streak reminder (9:00 PM UTC).
 */
export async function setupReminderJobs(fastify: FastifyInstance): Promise<void> {
  if (!fastify.queues?.default) {
    fastify.log.warn('BullMQ queue not available, skipping reminder job setup');
    return;
  }

  const queue = fastify.queues.default;

  // Prayer reminder - runs every day at 8:00 AM UTC
  await queue.add(
    'prayer-reminder',
    {},
    {
      repeat: {
        pattern: '0 8 * * *',
      },
    },
  );

  fastify.log.info('Prayer reminder repeatable job registered (8:00 AM UTC)');

  // Streak reminder - runs every day at 9:00 PM UTC
  await queue.add(
    'streak-reminder',
    {},
    {
      repeat: {
        pattern: '0 21 * * *',
      },
    },
  );

  fastify.log.info('Streak reminder repeatable job registered (9:00 PM UTC)');

  // Create a worker to process reminder jobs
  const connection = {
    host: fastify.redis?.options.host ?? 'localhost',
    port: fastify.redis?.options.port ?? 6379,
  };

  const worker = new Worker(
    'default-jobs',
    async (job) => {
      if (job.name === 'prayer-reminder') {
        await processPrayerReminder(fastify);
      } else if (job.name === 'streak-reminder') {
        await processStreakReminder(fastify);
      }
    },
    { connection },
  );

  fastify.addHook('onClose', async () => {
    await worker.close();
    fastify.log.info('Reminder notification worker closed');
  });
}

/**
 * Deactivates a device token that Expo reported as unregistered.
 */
async function deactivateToken(fastify: FastifyInstance, deviceId: string): Promise<void> {
  try {
    await fastify.prisma.deviceToken.update({
      where: { id: deviceId },
      data: { isActive: false },
    });
    fastify.log.info({ deviceId }, 'Deactivated unregistered device token');
  } catch {
    // Swallow -- best effort
  }
}

/**
 * Finds all users with prayer reminders enabled and active device tokens,
 * then sends a push notification to each device.
 */
async function processPrayerReminder(fastify: FastifyInstance): Promise<void> {
  fastify.log.info('Processing prayer reminder job');

  const preferences = await fastify.prisma.notificationPreference.findMany({
    where: { prayerReminders: true },
    select: { userId: true },
  });

  const userIds = preferences.map((p: { userId: string }) => p.userId);

  if (userIds.length === 0) {
    fastify.log.info('No users with prayer reminders enabled');
    return;
  }

  const deviceTokens = await fastify.prisma.deviceToken.findMany({
    where: {
      userId: { in: userIds },
      isActive: true,
    },
  });

  let sent = 0;
  for (const device of deviceTokens) {
    const result = await sendPushNotification(device.token, {
      title: 'حان وقت الصلاة',
      body: 'لا تنسَ صلواتك اليوم',
      data: { type: 'PRAYER_REMINDER' },
    });

    if (result.success) {
      sent++;
    } else if (result.shouldDeactivate) {
      await deactivateToken(fastify, device.id);
    } else {
      fastify.log.error({ deviceId: device.id }, 'Failed to send prayer reminder');
    }
  }

  fastify.log.info(
    { sent, total: deviceTokens.length },
    'Prayer reminder job completed',
  );
}

/**
 * Finds users with streak reminders enabled, active device tokens, and a
 * current streak greater than 0, then sends a push notification.
 */
async function processStreakReminder(fastify: FastifyInstance): Promise<void> {
  fastify.log.info('Processing streak reminder job');

  const preferences = await fastify.prisma.notificationPreference.findMany({
    where: { streakReminders: true },
    select: { userId: true },
  });

  const userIds = preferences.map((p: { userId: string }) => p.userId);

  if (userIds.length === 0) {
    fastify.log.info('No users with streak reminders enabled');
    return;
  }

  // Find users who have an active streak
  const streaks = await fastify.prisma.streak.findMany({
    where: {
      userId: { in: userIds },
      currentStreak: { gt: 0 },
    },
  });

  if (streaks.length === 0) {
    fastify.log.info('No users with active streaks for reminder');
    return;
  }

  const streakUserIds = streaks.map((s: { userId: string }) => s.userId);

  const deviceTokens = await fastify.prisma.deviceToken.findMany({
    where: {
      userId: { in: streakUserIds },
      isActive: true,
    },
  });

  // Build a map of userId to streak count for the notification body
  const streakMap = new Map(
    streaks.map((s: { userId: string; currentStreak: number }) => [s.userId, s.currentStreak]),
  );

  let sent = 0;
  for (const device of deviceTokens) {
    const streakCount = streakMap.get(device.userId) ?? 0;
    const result = await sendPushNotification(device.token, {
      title: 'حافظ على سلسلتك!',
      body: `لديك سلسلة ${streakCount} أيام متتالية`,
      data: { type: 'STREAK_REMINDER' },
    });

    if (result.success) {
      sent++;
    } else if (result.shouldDeactivate) {
      await deactivateToken(fastify, device.id);
    } else {
      fastify.log.error({ deviceId: device.id }, 'Failed to send streak reminder');
    }
  }

  fastify.log.info(
    { sent, total: deviceTokens.length },
    'Streak reminder job completed',
  );
}
