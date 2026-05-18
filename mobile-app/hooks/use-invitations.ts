import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invitationsService } from '@/services/invitations';
import { queryKeys } from '@/constants/query-keys';

export function useIncomingInvitations() {
  return useQuery({
    queryKey: queryKeys.invitations.incoming,
    queryFn: invitationsService.incoming,
    refetchInterval: 30_000,
  });
}

export function useInvitationActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.invitations.incoming });
    qc.invalidateQueries({ queryKey: queryKeys.rooms.all });
  };
  return {
    accept: useMutation({
      mutationFn: (id: string) => invitationsService.accept(id),
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: (id: string) => invitationsService.reject(id),
      onSuccess: invalidate,
    }),
  };
}

export function useSendInvitation(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (toPublicId: string) =>
      invitationsService.send(roomId, toPublicId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.rooms.detail(roomId) }),
  });
}
