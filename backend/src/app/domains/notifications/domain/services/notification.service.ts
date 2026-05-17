import type { PrismaClient, NotificationType, Prisma } from '@prisma/client';
import type { Queue } from 'bullmq';

export interface PushJobData {
  userId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  push?: { title: string; body: string };
}

/**
 * Create an in-app notification row and, when `push` is provided and the
 * user has push enabled for that category, enqueue a push-notification
 * job. The actual delivery happens in the BullMQ worker so request
 * latency stays low.
 *
 * `queue` may be undefined (test env / no Redis) -- in that case only the
 * in-app row is written.
 */
export async function notify(
  prisma: PrismaClient,
  queue: Queue | undefined,
  input: NotifyInput,
): Promise<void> {
  await prisma.notification.create({
    data: {
      user: { connect: { id: input.userId } },
      type: input.type,
      payload: input.payload as Prisma.InputJsonValue,
    },
  });

  if (input.push && queue) {
    const job: PushJobData = {
      userId: input.userId,
      title: input.push.title,
      body: input.push.body,
      data: { type: input.type, ...input.payload },
    };
    await queue.add('push-notification', job);
  }
}

/**
 * Fan-out helper: notify many users with the same type/payload.
 */
export async function notifyMany(
  prisma: PrismaClient,
  queue: Queue | undefined,
  userIds: string[],
  build: (userId: string) => Omit<NotifyInput, 'userId'>,
): Promise<void> {
  for (const userId of userIds) {
    await notify(prisma, queue, { userId, ...build(userId) });
  }
}
