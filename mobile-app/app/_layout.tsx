import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getQueryClient } from '@/lib/query-client';
import { useAuth } from '@/hooks/use-auth';
import { usePushRegistration } from '@/hooks/use-push-registration';
import { useCheckinQueue } from '@/stores/checkin-queue';
import { bootstrapLocale, useI18n } from '@/hooks/use-i18n';

const queryClient = getQueryClient();

// Apply the persisted locale (and I18nManager.forceRTL) before first render.
// forceRTL fully applies on the next launch; per-component direction is
// driven by `isRTL` from useI18n where it visibly matters.
bootstrapLocale();

/**
 * Redirects based on auth state and flushes the offline check-in queue
 * whenever the user is authenticated.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();
  const flush = useCheckinQueue((s) => s.flush);

  usePushRegistration(isAuthenticated);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  useEffect(() => {
    if (isAuthenticated) void flush();
  }, [isAuthenticated, flush]);

  return <>{children}</>;
}

export default function RootLayout() {
  const { t } = useI18n();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="rooms/[id]/index"
                options={{ headerShown: true, title: t('room.title') }}
              />
              <Stack.Screen
                name="rooms/[id]/settings"
                options={{ headerShown: true, title: t('settings.title') }}
              />
              <Stack.Screen
                name="rooms/[id]/history"
                options={{ headerShown: true, title: t('room.history') }}
              />
              <Stack.Screen
                name="rooms/[id]/activity"
                options={{ headerShown: true, title: t('room.activity') }}
              />
              <Stack.Screen
                name="rooms/new"
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  title: t('createRoom.title'),
                }}
              />
              <Stack.Screen
                name="results/[cycleId]"
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  title: t('results.headerTitle'),
                }}
              />
            </Stack>
          </AuthGate>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
