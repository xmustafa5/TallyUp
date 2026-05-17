/**
 * Centralized TanStack Query key factory.
 */
export const queryKeys = {
  me: ['me'] as const,
  rooms: {
    all: ['rooms'] as const,
    list: () => [...queryKeys.rooms.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.rooms.all, 'detail', id] as const,
    currentCycle: (id: string) =>
      [...queryKeys.rooms.all, 'detail', id, 'current-cycle'] as const,
    history: (id: string) =>
      [...queryKeys.rooms.all, 'detail', id, 'history'] as const,
    members: (id: string) =>
      [...queryKeys.rooms.all, 'detail', id, 'members'] as const,
  },
  cycles: {
    detail: (id: string) => ['cycles', id] as const,
  },
  invitations: {
    incoming: ['invitations', 'incoming'] as const,
  },
  notifications: {
    list: (opts: { unread?: boolean }) => ['notifications', opts] as const,
  },
} as const;
