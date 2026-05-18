import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { notificationsService } from '@/services/notifications';

// Foreground display behaviour (SDK 54 uses shouldShowBanner/shouldShowList).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function getExpoToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('cycle', {
      name: 'Cycle updates',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#2C7A7B',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    (Constants?.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    (Constants?.easConfig?.projectId as string | undefined);

  try {
    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return res.data;
  } catch {
    // No EAS project (e.g. plain Expo Go) -- push is best-effort; the
    // in-app notification feed still works via polling.
    return null;
  }
}

/**
 * Registers this device for push on mount (when authenticated) and wires
 * a tap handler that deep-links cycle-ended notifications to the results
 * screen. Safe to call once from the root layout.
 */
export function usePushRegistration(isAuthenticated: boolean) {
  const router = useRouter();
  const registered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registered.current) return;
    registered.current = true;

    (async () => {
      const token = await getExpoToken();
      if (!token) return;
      try {
        const { id } = await notificationsService.registerDeviceToken(
          token,
          Platform.OS === 'ios' ? 'ios' : 'android',
        );
        globalThis.__tuDeviceTokenId = id;
      } catch {
        // ignore -- non-fatal
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { type?: string; cycleId?: string; roomId?: string }
          | undefined;
        if (data?.type === 'cycle_ended' && data.cycleId) {
          router.push(`/results/${data.cycleId}`);
        } else if (data?.roomId) {
          router.push(`/rooms/${data.roomId}`);
        }
      },
    );
    return () => sub.remove();
  }, [router]);
}

declare global {
  // eslint-disable-next-line no-var
  var __tuDeviceTokenId: string | undefined;
}
