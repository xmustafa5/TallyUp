export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushNotificationResult {
  success: boolean;
  shouldDeactivate: boolean;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Sends a push notification via the Expo Push API.
 * Returns whether the send succeeded and whether the device token
 * should be deactivated (e.g. DeviceNotRegistered).
 */
export async function sendPushNotification(
  token: string,
  payload: PushNotificationPayload,
): Promise<PushNotificationResult> {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
      }),
    });

    if (!response.ok) {
      return { success: false, shouldDeactivate: false };
    }

    const result = (await response.json()) as {
      data?: { status?: string; details?: { error?: string } };
    };
    const ticket = result.data;

    if (ticket?.status === 'error') {
      const shouldDeactivate =
        ticket.details?.error === 'DeviceNotRegistered' ||
        ticket.details?.error === 'InvalidCredentials';
      return { success: false, shouldDeactivate };
    }

    return { success: true, shouldDeactivate: false };
  } catch {
    return { success: false, shouldDeactivate: false };
  }
}
