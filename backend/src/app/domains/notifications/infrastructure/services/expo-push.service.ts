import { Expo } from 'expo-server-sdk';
import type {
  ExpoPushMessage,
  ExpoPushReceiptId,
  ExpoPushTicket,
} from 'expo-server-sdk';

/**
 * Minimal logger contract this service depends on. Mirrors the shape of a
 * Fastify / Pino logger so a BullMQ worker can pass `job.log`-style or
 * `fastify.log`-style instances without coupling to Fastify here.
 */
export interface PushLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface PushMessageInput {
  /** An Expo push token string (e.g. `ExponentPushToken[xxxxxxxx]`). */
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushSendResult {
  /**
   * Tokens that came back as `DeviceNotRegistered` from either a push ticket
   * or a push receipt. The caller is responsible for pruning these from its
   * own storage so we stop targeting dead devices.
   */
  invalidTokens: string[];
}

/**
 * A single shared Expo client constructed at module load. Expo's free push
 * service does not require an access token, so we intentionally do not pass
 * one here. The instance is stateless and safe to reuse across requests and
 * across BullMQ worker invocations.
 */
const expo = new Expo();

/**
 * Validate that a string is a well-formed Expo push token. This is a cheap,
 * synchronous structural check (it does not contact Expo's servers).
 */
export function isValidExpoPushToken(token: string): boolean {
  return Expo.isExpoPushToken(token);
}

/**
 * Send a batch of push messages via the Expo push service.
 *
 * Flow:
 *  1. Filter out structurally invalid tokens (logged and skipped).
 *  2. Build `ExpoPushMessage[]` from the remaining valid tokens, keeping a
 *     parallel `messageIndex -> token` map so any later ticket/receipt error
 *     can be traced back to the originating token.
 *  3. Chunk via `expo.chunkPushNotifications` and call
 *     `expo.sendPushNotificationsAsync` per chunk. Tickets are returned in
 *     order and re-aligned to their global message index.
 *  4. Inspect tickets: a `status: 'error'` ticket whose
 *     `details.error === 'DeviceNotRegistered'` immediately yields an invalid
 *     token. Successful (`status: 'ok'`) tickets carry a receipt id which we
 *     collect for the receipt-polling pass.
 *  5. Best-effort receipt pass: chunk receipt ids via
 *     `expo.chunkPushNotificationReceiptIds`, call
 *     `expo.getPushNotificationReceiptsAsync`, and treat any receipt with
 *     `status: 'error'` and `details.error === 'DeviceNotRegistered'` as an
 *     invalid token.
 *
 * This function never throws on an individual send/receipt failure: every
 * network call is wrapped in try/catch, errors are logged via the supplied
 * logger, and the function returns whatever it has gathered so far. That makes
 * it safe to call directly from a BullMQ worker without extra guarding.
 *
 * NOTE (best-effort receipts): Expo recommends waiting ~15 minutes before
 * polling receipts so delivery to APNs/FCM has settled. For this worker
 * context we do one immediate best-effort pass instead. A Phase 2 improvement
 * would persist receipt ids and defer the receipt check to a separate
 * scheduled/repeatable job.
 */
export async function sendPushNotifications(
  messages: PushMessageInput[],
  logger: PushLogger,
): Promise<PushSendResult> {
  const invalidTokens = new Set<string>();

  // Step 1 + 2: filter invalid tokens and build the SDK messages, tracking
  // the token behind each message so tickets/receipts can be traced back.
  const expoMessages: ExpoPushMessage[] = [];
  const messageTokens: string[] = [];

  for (const message of messages) {
    if (!Expo.isExpoPushToken(message.token)) {
      logger.warn(
        { token: message.token },
        'Skipping push: not a valid Expo push token',
      );
      invalidTokens.add(message.token);
      continue;
    }

    expoMessages.push({
      to: message.token,
      title: message.title,
      body: message.body,
      sound: 'default',
      ...(message.data ? { data: message.data } : {}),
    });
    messageTokens.push(message.token);
  }

  if (expoMessages.length === 0) {
    logger.info('No valid Expo push messages to send');
    return { invalidTokens: [...invalidTokens] };
  }

  // Step 3 + 4: send chunk by chunk, collecting receipt ids from successful
  // tickets and flagging DeviceNotRegistered tickets immediately. We track a
  // global message index so each ticket maps back to its token regardless of
  // which chunk it landed in.
  const chunks = expo.chunkPushNotifications(expoMessages);
  const receiptIdToToken = new Map<ExpoPushReceiptId, string>();
  const receiptIds: ExpoPushReceiptId[] = [];

  let messageIndex = 0;

  for (const chunk of chunks) {
    let tickets: ExpoPushTicket[];

    try {
      tickets = await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      // The whole chunk failed (network/transport error). Skip it and keep
      // going with the other chunks; advance the index past this chunk so the
      // remaining tickets stay aligned to their tokens.
      logger.error(
        { err: error, chunkSize: chunk.length },
        'Failed to send Expo push notification chunk',
      );
      messageIndex += chunk.length;
      continue;
    }

    for (const ticket of tickets) {
      const token = messageTokens[messageIndex];
      messageIndex += 1;

      if (ticket.status === 'ok') {
        receiptIds.push(ticket.id);
        if (token !== undefined) {
          receiptIdToToken.set(ticket.id, token);
        }
        continue;
      }

      // status === 'error'
      logger.warn(
        {
          token,
          message: ticket.message,
          error: ticket.details?.error,
        },
        'Expo push ticket returned an error',
      );

      if (ticket.details?.error === 'DeviceNotRegistered') {
        // Prefer the token Expo echoes back; fall back to our index map.
        invalidTokens.add(ticket.details.expoPushToken ?? token ?? '');
      }
    }
  }

  // Step 5: best-effort, single immediate pass over receipts. See the NOTE in
  // the function doc comment about deferring this in Phase 2.
  if (receiptIds.length > 0) {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const receiptIdChunk of receiptIdChunks) {
      try {
        const receipts =
          await expo.getPushNotificationReceiptsAsync(receiptIdChunk);

        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (receipt.status === 'ok') continue;

          // status === 'error'
          const token = receiptIdToToken.get(receiptId);
          logger.warn(
            {
              receiptId,
              token,
              message: receipt.message,
              error: receipt.details?.error,
            },
            'Expo push receipt returned an error',
          );

          if (receipt.details?.error === 'DeviceNotRegistered') {
            invalidTokens.add(
              receipt.details.expoPushToken ?? token ?? '',
            );
          }
        }
      } catch (error) {
        // Receipt fetch failed for this chunk. Log and continue; callers can
        // re-derive invalid tokens on a later send if the device is truly
        // gone, so this is non-fatal.
        logger.error(
          { err: error, chunkSize: receiptIdChunk.length },
          'Failed to fetch Expo push notification receipts',
        );
      }
    }
  }

  // Guard against an empty string sneaking in from the `?? ''` fallbacks above
  // (only possible if Expo flagged DeviceNotRegistered without echoing a token
  // and our index map missed it -- defensive, should not normally happen).
  invalidTokens.delete('');

  return { invalidTokens: [...invalidTokens] };
}
