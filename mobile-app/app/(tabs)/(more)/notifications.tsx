import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  useNotificationsInbox,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-notifications';
import { colors, format, radii, spacing, typography } from '@/constants/theme';
import { selectionFeedback, successNotification } from '@/lib/haptics';
import type { NotificationItem, NotificationType } from '@/services/notifications';

function formatRelative(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'الآن';
  if (min < 60) return `منذ ${format.toArabicDigits(min)} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${format.toArabicDigits(hr)} ساعة`;
  const day = Math.floor(hr / 24);
  return `منذ ${format.toArabicDigits(day)} يوم`;
}

function typeAccent(type: NotificationType, theme: typeof colors.light): string {
  switch (type) {
    case 'PRAYER_REMINDER':
      return theme.primary;
    case 'STREAK_REMINDER':
      return theme.streak;
    case 'GOAL_REMINDER':
      return theme.accent;
    case 'MILESTONE':
      return theme.success;
  }
}

function NotificationRow({
  item,
  onPress,
  theme,
}: {
  item: NotificationItem;
  onPress: (id: string) => void;
  theme: typeof colors.light;
}) {
  const isRead = item.readAt !== null;
  const accent = typeAccent(item.type, theme);

  return (
    <Pressable
      onPress={() => {
        if (!isRead) {
          selectionFeedback();
          onPress(item.id);
        }
      }}
      style={({ pressed }) => ({
        backgroundColor: isRead ? theme.card : theme.primaryLight,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderLeftWidth: isRead ? 0 : 3,
        borderLeftColor: accent,
        padding: spacing.lg,
        flexDirection: 'row-reverse',
        gap: spacing.md,
        opacity: pressed ? 0.75 : 1,
        boxShadow: '0 1px 2px rgba(26,54,93,0.06)',
      })}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: isRead ? 'transparent' : accent,
          marginTop: 6,
        }}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[typography.label, { color: theme.text, textAlign: 'right' }]}>
          {item.title}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: theme.textSecondary, textAlign: 'right' },
          ]}
        >
          {item.body}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: theme.textTertiary, textAlign: 'right', fontSize: 11 },
          ]}
        >
          {formatRelative(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const theme = colors.light;
  const [onlyUnread, setOnlyUnread] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useNotificationsInbox({
    pageSize: 50,
    onlyUnread,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="الإشعارات" />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={{
          padding: spacing.xl,
          paddingTop: spacing.sm,
          gap: spacing.md,
          paddingBottom: spacing['4xl'],
        }}
      >
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              flexDirection: 'row-reverse',
              backgroundColor: theme.surfaceAlt,
              borderRadius: radii.pill,
              padding: 3,
            }}
          >
            <Pressable
              onPress={() => {
                selectionFeedback();
                setOnlyUnread(false);
              }}
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: 6,
                borderRadius: radii.pill,
                backgroundColor: !onlyUnread ? theme.primary : 'transparent',
              }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: !onlyUnread ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                الكل
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                selectionFeedback();
                setOnlyUnread(true);
              }}
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: 6,
                borderRadius: radii.pill,
                backgroundColor: onlyUnread ? theme.primary : 'transparent',
              }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: onlyUnread ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                غير مقروءة
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              if (hasUnread && !markAllRead.isPending) {
                successNotification();
                markAllRead.mutate();
              }
            }}
            disabled={!hasUnread || markAllRead.isPending}
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 4,
              opacity: hasUnread ? 1 : 0.4,
            }}
          >
            <Ionicons name="checkmark-done" size={16} color={theme.primary} />
            <Text style={[typography.caption, { color: theme.primary }]}>
              تعليم الكل
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ padding: spacing['3xl'], alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : total === 0 ? (
          <View
            style={{
              padding: spacing['3xl'],
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <Ionicons name="notifications-off-outline" size={48} color={theme.textTertiary} />
            <Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
              لا توجد إشعارات بعد
            </Text>
          </View>
        ) : (
          items.map((n) => (
            <NotificationRow
              key={n.id}
              item={n}
              theme={theme}
              onPress={(id) => markRead.mutate(id)}
            />
          ))
        )}
      </ScrollView>
    </>
  );
}
