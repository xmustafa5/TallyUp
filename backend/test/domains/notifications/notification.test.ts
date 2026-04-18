import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendPushNotification } from '../../../src/app/domains/notifications/domain/services/notification.service';
import { Notification } from '../../../src/app/domains/notifications/domain/entities/notification.entity';

describe('Notification Entity', () => {
  const baseProps = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '660e8400-e29b-41d4-a716-446655440000',
    type: 'PRAYER_REMINDER' as const,
    title: 'Prayer Reminder',
    body: 'Time to pray',
    data: { type: 'PRAYER_REMINDER' },
    readAt: null,
    createdAt: new Date('2026-04-18T08:00:00.000Z'),
  };

  describe('fromPrisma', () => {
    it('creates instance from Prisma data', () => {
      const n = Notification.fromPrisma(baseProps);
      expect(n.id).toBe(baseProps.id);
      expect(n.userId).toBe(baseProps.userId);
      expect(n.isRead).toBe(false);
    });

    it('marks as read when readAt is set', () => {
      const n = Notification.fromPrisma({
        ...baseProps,
        readAt: new Date('2026-04-18T09:00:00.000Z'),
      });
      expect(n.isRead).toBe(true);
    });
  });

  describe('toResponse', () => {
    it('serializes dates to ISO strings', () => {
      const n = Notification.fromPrisma(baseProps);
      const res = n.toResponse();
      expect(res.createdAt).toBe('2026-04-18T08:00:00.000Z');
      expect(res.readAt).toBe(null);
    });

    it('serializes readAt to ISO string when set', () => {
      const n = Notification.fromPrisma({
        ...baseProps,
        readAt: new Date('2026-04-18T09:00:00.000Z'),
      });
      expect(n.toResponse().readAt).toBe('2026-04-18T09:00:00.000Z');
    });

    it('preserves structured data field', () => {
      const n = Notification.fromPrisma({
        ...baseProps,
        data: { streakCount: 7 },
      });
      expect(n.toResponse().data).toEqual({ streakCount: 7 });
    });

    it('defaults null data to null', () => {
      const n = Notification.fromPrisma({ ...baseProps, data: null });
      expect(n.toResponse().data).toBe(null);
    });
  });
});

describe('Notification Service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  describe('sendPushNotification', () => {
    it('returns success=true when Expo responds with a non-error ticket', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: 'ok' } }),
      });

      const result = await sendPushNotification('ExponentPushToken[abc]', {
        title: 'Hello',
        body: 'World',
      });

      expect(result).toEqual({ success: true, shouldDeactivate: false });
    });

    it('marks token for deactivation on DeviceNotRegistered', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { status: 'error', details: { error: 'DeviceNotRegistered' } },
        }),
      });

      const result = await sendPushNotification('bad-token', {
        title: 'x',
        body: 'y',
      });

      expect(result).toEqual({ success: false, shouldDeactivate: true });
    });

    it('marks token for deactivation on InvalidCredentials', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { status: 'error', details: { error: 'InvalidCredentials' } },
        }),
      });

      const result = await sendPushNotification('token', { title: 'x', body: 'y' });

      expect(result.success).toBe(false);
      expect(result.shouldDeactivate).toBe(true);
    });

    it('returns success=false without deactivation on generic HTTP errors', async () => {
      fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

      const result = await sendPushNotification('token', { title: 'x', body: 'y' });

      expect(result).toEqual({ success: false, shouldDeactivate: false });
    });

    it('swallows network exceptions', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const result = await sendPushNotification('token', { title: 'x', body: 'y' });

      expect(result).toEqual({ success: false, shouldDeactivate: false });
    });

    it('posts the payload to Expo with the correct shape', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: 'ok' } }),
      });

      await sendPushNotification('TOKEN', {
        title: 'Hi',
        body: 'Body',
        data: { type: 'PRAYER_REMINDER', notificationId: 'n-1' },
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://exp.host/--/api/v2/push/send');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body.to).toBe('TOKEN');
      expect(body.data).toEqual({ type: 'PRAYER_REMINDER', notificationId: 'n-1' });
    });
  });
});
