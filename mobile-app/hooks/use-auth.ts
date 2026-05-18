import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, type RegisterInput } from '@/services/auth';
import { authStorage } from '@/lib/auth-storage';
import { queryKeys } from '@/constants/query-keys';
import type { FullProfile } from '@/types/tallyup';

/**
 * Auth state + actions. The `me` query is the source of truth for "am I
 * logged in"; enabled only when an access token exists so anonymous
 * sessions do not 401 on first render.
 */
export function useAuth() {
  const router = useRouter();
  const qc = useQueryClient();
  const hasToken = !!authStorage.getAccess();

  const meQuery = useQuery<FullProfile>({
    queryKey: queryKeys.me,
    queryFn: authService.me,
    enabled: hasToken,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (res) => {
      authStorage.set(res);
      qc.setQueryData(queryKeys.me, res.user);
      qc.invalidateQueries({ queryKey: queryKeys.me });
      router.replace('/(tabs)');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: (res) => {
      authStorage.set(res);
      qc.setQueryData(queryKeys.me, res.user);
      qc.invalidateQueries({ queryKey: queryKeys.me });
      router.replace({
        pathname: '/(auth)/onboarding',
        params: { publicId: res.user.publicId },
      });
    },
  });

  async function logout() {
    try {
      await authService.logout();
    } catch {
      // ignore -- clear locally regardless
    }
    authStorage.clear();
    qc.clear();
    router.replace('/(auth)/login');
  }

  return {
    user: meQuery.data ?? null,
    isLoading: hasToken && meQuery.isLoading,
    isAuthenticated: !!meQuery.data,
    login: loginMutation,
    register: registerMutation,
    logout,
  };
}
