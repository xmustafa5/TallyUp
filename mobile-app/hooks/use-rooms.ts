import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roomsService, type CreateRoomInput } from '@/services/rooms';
import { queryKeys } from '@/constants/query-keys';

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

function useRoomAction(fn: (id: string) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.rooms.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.rooms.list() });
    },
  });
}

export function useStartRoom() {
  return useRoomAction((id) => roomsService.start(id));
}
export function usePauseRoom() {
  return useRoomAction((id) => roomsService.pause(id));
}
export function useResumeRoom() {
  return useRoomAction((id) => roomsService.resume(id));
}
export function useArchiveRoom() {
  return useRoomAction((id) => roomsService.archive(id));
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.rooms.detail(roomId) }),
  });
}
