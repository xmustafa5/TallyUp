import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import {
  useNotifications,
  useMarkRead,
} from '@/hooks/use-notifications';
import {
  useIncomingInvitations,
  useInvitationActions,
} from '@/hooks/use-invitations';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, typography, radii, shadows } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';

export default function NotificationsScreen() {
  const { t: tr } = useI18n();
  const t = colors.light;
  const { data: notifications } = useNotifications();
  const { data: invites } = useIncomingInvitations();
  const markRead = useMarkRead();
  const { accept, reject } = useInvitationActions();

  useEffect(() => {
    if (notifications?.items.some((n) => !n.readAt)) {
      markRead.mutate('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications?.items.length]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      {invites && invites.length > 0 && (
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.label, { color: t.textSecondary }]}>
            {tr('notifications.pendingInvitations')}
          </Text>
          {invites.map((inv) => (
            <View
              key={inv.id}
              style={[
                {
                  backgroundColor: t.card,
                  borderRadius: radii.lg,
                  borderCurve: 'continuous',
                  padding: spacing.lg,
                  gap: spacing.md,
                },
                shadows.sm,
              ]}
            >
              <Text style={[typography.body, { color: t.text }]}>
                <Text style={{ fontWeight: '700' }}>
                  {inv.from.displayName}
                </Text>
                {tr('notifications.invitedYouToPrefix')}
                <Text style={{ fontWeight: '700' }}>{inv.roomName}</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Pressable
                  onPress={() =>
                    accept.mutate(inv.id, {
                      onError: () =>
                        Alert.alert(
                          tr('notifications.error'),
                          tr('notifications.couldNotAccept'),
                        ),
                    })
                  }
                  style={{
                    flex: 1,
                    backgroundColor: t.primary,
                    paddingVertical: 12,
                    borderRadius: radii.md,
                    borderCurve: 'continuous',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={[
                      typography.label,
                      { color: '#FFFFFF' },
                    ]}
                  >
                    {tr('notifications.accept')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => reject.mutate(inv.id)}
                  style={{
                    flex: 1,
                    backgroundColor: t.surfaceAlt,
                    paddingVertical: 12,
                    borderRadius: radii.md,
                    borderCurve: 'continuous',
                    alignItems: 'center',
                  }}
                >
                  <Text style={[typography.label, { color: t.text }]}>
                    {tr('notifications.decline')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ gap: spacing.md }}>
        <Text style={[typography.label, { color: t.textSecondary }]}>
          {tr('notifications.activity')}
        </Text>
        {notifications?.items.length === 0 &&
          (!invites || invites.length === 0) && (
            <Text
              style={[
                typography.body,
                {
                  color: t.textTertiary,
                  textAlign: 'center',
                  paddingVertical: spacing['2xl'],
                },
              ]}
            >
              {tr('notifications.nothingYet')}
            </Text>
          )}
        {notifications?.items.map((n) => (
          <View
            key={n.id}
            style={[
              {
                flexDirection: 'row',
                gap: spacing.md,
                backgroundColor: t.card,
                borderRadius: radii.md,
                borderCurve: 'continuous',
                padding: spacing.lg,
              },
              shadows.sm,
            ]}
          >
            <Icon name="mail-outline" size={18} tone="muted" />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: t.text }]}>
                {(n.payload.roomName as string) ?? 'TallyUp'} —{' '}
                {n.type.replace(/_/g, ' ')}
                {n.payload.outcome ? ` (${n.payload.outcome})` : ''}
              </Text>
              <Text
                style={[typography.caption, { color: t.textTertiary }]}
              >
                {new Date(n.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
