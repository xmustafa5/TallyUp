import { describe, it, expect, vi } from 'vitest';
import { sendPushNotification } from '../../../src/app/domains/notifications/domain/services/notification.service';

describe('Notification Service', () => {
  describe('sendPushNotification', () => {
    it('should return true when sending a notification', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sendPushNotification('test-token-123', {
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(result).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should log the notification details', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendPushNotification('device-abc', {
        title: 'Prayer Reminder',
        body: 'Time to pray',
        data: { type: 'PRAYER_REMINDER' },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Push Notification] To: device-abc, Title: Prayer Reminder, Body: Time to pray',
      );

      consoleSpy.mockRestore();
    });

    it('should handle notifications without optional data field', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sendPushNotification('token-xyz', {
        title: 'Streak Alert',
        body: 'Keep going!',
      });

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });
});
