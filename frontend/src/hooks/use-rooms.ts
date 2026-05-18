'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roomsService, type CreateRoomInput } from '@/services/rooms';
import { queryKeys } from '@/lib/query-keys';

export function useRoomsQuery() {
  return useQuery({
    queryKey: queryKeys.rooms.list(),
    queryFn: roomsService.list,
  });
}

export function useRoomQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.rooms.detail(id),
    queryFn: () => roomsService.get(id),
    enabled: !!id,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoomInput) => roomsService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rooms.all }),
  });
}

function useRoomMutation<TArgs>(
  fn: (id: string, args: TArgs) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, args }: { id: string; args: TArgs }) => fn(id, args),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.rooms.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.rooms.list() });
    },
  });
}

export function usePatchRoom() {
  return useRoomMutation<Partial<CreateRoomInput>>((id, args) =>
    roomsService.patch(id, args),
  );
}

export function useStartRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => roomsService.start(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.rooms.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.rooms.list() });
    },
  });
}

export function useRoomLifecycle() {
  const qc = useQueryClient();
  const invalidate = (id: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.rooms.detail(id) });
    qc.invalidateQueries({ queryKey: queryKeys.rooms.list() });
  };
  return {
    pause: useMutation({
      mutationFn: (id: string) => roomsService.pause(id),
      onSuccess: (_d, id) => invalidate(id),
    }),
    resume: useMutation({
      mutationFn: (id: string) => roomsService.resume(id),
      onSuccess: (_d, id) => invalidate(id),
    }),
    archive: useMutation({
      mutationFn: (id: string) => roomsService.archive(id),
      onSuccess: (_d, id) => invalidate(id),
    }),
    remove: useMutation({
      mutationFn: (id: string) => roomsService.remove(id),
      onSuccess: (_d, id) => {
        qc.removeQueries({ queryKey: queryKeys.rooms.detail(id) });
        qc.invalidateQueries({ queryKey: queryKeys.rooms.list() });
      },
    }),
  };
}

export function usePatchMember(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      body,
    }: {
      userId: string;
      body: { target?: number; includeInCurrentCycle?: boolean | null };
    }) => roomsService.patchMember(roomId, userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rooms.detail(roomId) });
      qc.invalidateQueries({ queryKey: queryKeys.rooms.members(roomId) });
    },
  });
}
