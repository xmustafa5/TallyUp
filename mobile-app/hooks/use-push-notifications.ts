import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { registerDevice, markNotificationRead } from '@/services/notifications';
import { queryKeys } from '@/constants/query-keys';

const STORED_TOKEN_KEY = 'expo_push_token';

// Expo Go (SDK 53+) does not support remote push notifications.
const isExpoGo = Constants.appOwnership === 'expo';

async function setupNotificationHandler(): Promise<void> {
  if (isExpoGo) return;
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Fire once at module load — safe because it's async and guarded
setupNotificationHandler();

async function getExpoPushToken(): Promise<string | null> {
  if (isExpoGo) {
    console.log('Push notifications are not supported in Expo Go (SDK 53+). Use a development build.');
    return null;
  }

  const Device = await import('expo-device');
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const Notifications = await import('expo-notifications');

  // Check / request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'الافتراضي',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.log('Missing EAS projectId for push token');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

/**
 * Hook that handles push notification setup:
 * - Requests permissions on mount
 * - Gets the Expo push token
 * - Registers the token with the backend (only if changed)
 * - Sets up foreground + tap notification listeners
 *
 * Skips entirely in Expo Go where push is unsupported.
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isExpoGo) return;

    // Get token and register with backend
    getExpoPushToken().then(async (token) => {
      if (!token) return;

      setExpoPushToken(token);

      // Only register if the token changed since last time
      const storedToken = SecureStore.getItem(STORED_TOKEN_KEY);
      if (storedToken === token) return;

      try {
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        await registerDevice(token, platform);
        SecureStore.setItem(STORED_TOKEN_KEY, token);
      } catch (err) {
        console.log('Failed to register device token:', err);
      }
    });

    // Setup listeners via lazy import
    import('expo-notifications').then((Notifications) => {
      notificationListener.current = Notifications.addNotificationReceivedListener(
        () => {
          // Foreground delivery — refresh inbox + unread count so UI stays in sync.
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox });
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.unreadCount,
          });
        },
      );

      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data as
            | { notificationId?: string }
            | undefined;

          if (data?.notificationId) {
            // Best-effort mark-as-read — don't block nav on failure.
            markNotificationRead(data.notificationId)
              .catch(() => {})
              .finally(() => {
                queryClient.invalidateQueries({
                  queryKey: queryKeys.notifications.inbox,
                });
                queryClient.invalidateQueries({
                  queryKey: queryKeys.notifications.unreadCount,
                });
              });
          }

          router.push('/(tabs)/(more)/notifications');
        },
      );
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [queryClient]);

  return { expoPushToken };
}
