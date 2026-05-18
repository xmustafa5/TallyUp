import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/mmkv';
import { checkinsService } from '@/services/checkins';

export interface QueuedCheckIn {
  roomId: string;
  points: number;
  clientId: string;
  createdAtClient: number;
}

interface CheckinQueueState {
  pending: QueuedCheckIn[];
  enqueue: (item: QueuedCheckIn) => void;
  /** Try to flush the queue to the server in order. Server idempotency on
   *  (userId, clientId) makes replay safe. Items that fail (offline) stay. */
  flush: () => Promise<void>;
  flushing: boolean;
}

export const useCheckinQueue = create<CheckinQueueState>()(
  persist(
    (set, get) => ({
      pending: [],
      flushing: false,
      enqueue: (item) =>
        set((s) => ({ pending: [...s.pending, item] })),
      flush: async () => {
        if (get().flushing) return;
        set({ flushing: true });
        try {
          // Process oldest-first; drop each item only once it succeeds.
          for (const item of [...get().pending]) {
            try {
              await checkinsService.create(item.roomId, {
                points: item.points,
                clientId: item.clientId,
              });
              set((s) => ({
                pending: s.pending.filter(
                  (p) => p.clientId !== item.clientId,
                ),
              }));
            } catch {
              // Still offline / server error -- keep this and the rest.
              break;
            }
          }
        } finally {
          set({ flushing: false });
        }
      },
    }),
    {
      name: 'tu_checkin_queue',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (s) => ({ pending: s.pending }),
    },
  ),
);
