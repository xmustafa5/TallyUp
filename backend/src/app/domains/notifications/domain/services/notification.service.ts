export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Stub for sending push notifications.
 * Logs instead of sending. Replace with FCM when credentials are available.
 */
export async function sendPushNotification(
  token: string,
  payload: PushNotificationPayload,
): Promise<boolean> {
  // TODO: Integrate with Firebase Cloud Messaging
  console.log(`[Push Notification] To: ${token}, Title: ${payload.title}, Body: ${payload.body}`);
  return true;
}
