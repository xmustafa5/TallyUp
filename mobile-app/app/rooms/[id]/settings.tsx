import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput as RNTextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useRoomQuery,
  usePatchMember,
  useArchiveRoom,
} from '@/hooks/use-rooms';
import { useSendInvitation } from '@/hooks/use-invitations';
import { roomsService } from '@/services/rooms';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import { TextInput } from '@/components/ui/text-input';
import { colors, spacing, typography, radii, shadows } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';

function errMsg(e: unknown, fallback: string) {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  );
}

export default function RoomSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t: tr } = useI18n();
  const t = colors.light;
  const qc = useQueryClient();
  const { data: room, isLoading } = useRoomQuery(id);
  const sendInvite = useSendInvitation(id);
  const patchMember = usePatchMember(id);
  const archive = useArchiveRoom();
  const [publicId, setPublicId] = useState('');
  const [targets, setTargets] = useState<Record<string, string>>({});

  if (isLoading || !room) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  if (room.myRole !== 'admin') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <Text style={[typography.body, { color: t.textSecondary }]}>
          {tr('settings.onlyAdmin')}
        </Text>
      </View>
    );
  }

  function invite() {
    if (!publicId.trim()) return;
    sendInvite.mutate(publicId.trim().toUpperCase(), {
      onSuccess: () => {
        setPublicId('');
        Alert.alert(tr('settings.sent'), tr('settings.invitationSent'));
      },
      onError: (e) =>
        Alert.alert(
          tr('settings.error'),
          errMsg(e, tr('settings.inviteFailed')),
        ),
    });
  }

  function saveTarget(userId: string) {
    const val = Number(targets[userId]);
    if (!Number.isInteger(val) || val < 1) {
      Alert.alert(tr('settings.invalid'), tr('settings.targetPositive'));
      return;
    }
    patchMember.mutate(
      { userId, body: { target: val } },
      {
        onSuccess: () =>
          Alert.alert(tr('settings.saved'), tr('settings.targetUpdated')),
        onError: (e) =>
          Alert.alert(
            tr('settings.error'),
            errMsg(e, tr('settings.updateFailed')),
          ),
      },
    );
  }

  async function transfer(userId: string) {
    try {
      await roomsService.transferAdmin(id, userId);
      qc.invalidateQueries({ queryKey: queryKeys.rooms.detail(id) });
      Alert.alert(tr('settings.done'), tr('settings.adminTransferred'));
    } catch (e) {
      Alert.alert(
        tr('settings.error'),
        errMsg(e, tr('settings.transferFailed')),
      );
    }
  }

  const activeMembers = room.members.filter((m) => !m.leftAt);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      {/* Invite */}
      <View
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
        <Text style={[typography.h3, { color: t.text }]}>
          {tr('settings.inviteMember')}
        </Text>
        <TextInput
          label={tr('settings.userId')}
          placeholder="ALI-2941"
          value={publicId}
          onChangeText={setPublicId}
          autoCapitalize="characters"
        />
        <Pressable
          onPress={invite}
          disabled={sendInvite.isPending}
          style={{
            backgroundColor: t.primary,
            paddingVertical: 12,
            borderRadius: radii.md,
            borderCurve: 'continuous',
            alignItems: 'center',
            opacity: sendInvite.isPending ? 0.6 : 1,
          }}
        >
          <Text style={[typography.label, { color: '#FFFFFF' }]}>
            {tr('settings.sendInvite')}
          </Text>
        </Pressable>
      </View>

      {/* Members & targets */}
      <View
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
        <Text style={[typography.h3, { color: t.text }]}>
          {tr('settings.membersAndTargets')}
        </Text>
        {activeMembers.map((m) => (
          <View
            key={m.user.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: t.border,
              paddingBottom: spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: t.text }]}>
                {m.user.displayName}
                {m.role === 'admin' ? tr('settings.adminTag') : ''}
              </Text>
              <Text
                style={[typography.caption, { color: t.textTertiary }]}
              >
                {m.user.publicId}
                {m.joinedLate ? tr('settings.joinedLate') : ''}
              </Text>
            </View>
            <RNTextInput
              defaultValue={String(m.target)}
              keyboardType="number-pad"
              onChangeText={(v) =>
                setTargets((s) => ({ ...s, [m.user.id]: v }))
              }
              style={{
                width: 56,
                height: 40,
                borderWidth: 1.5,
                borderColor: t.border,
                borderRadius: radii.sm,
                borderCurve: 'continuous',
                textAlign: 'center',
                color: t.text,
              }}
            />
            <Pressable
              onPress={() => saveTarget(m.user.id)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                borderRadius: radii.sm,
                borderCurve: 'continuous',
                backgroundColor: t.surfaceAlt,
              }}
            >
              <Text style={[typography.caption, { color: t.text }]}>
                {tr('settings.save')}
              </Text>
            </Pressable>
            {m.role !== 'admin' && (
              <Pressable onPress={() => transfer(m.user.id)}>
                <Text style={[typography.caption, { color: t.primary }]}>
                  {tr('settings.makeAdmin')}
                </Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {/* Danger zone */}
      <Pressable
        onPress={() =>
          Alert.alert(
            tr('settings.archiveRoom'),
            tr('settings.archiveConfirm'),
            [
              { text: tr('settings.cancel'), style: 'cancel' },
              {
                text: tr('settings.archive'),
                style: 'destructive',
                onPress: () =>
                  archive.mutate(id, {
                    onSuccess: () => router.replace('/(tabs)'),
                  }),
              },
            ],
          )
        }
        style={{
          borderWidth: 1.5,
          borderColor: t.error,
          borderRadius: radii.md,
          borderCurve: 'continuous',
          paddingVertical: 12,
          alignItems: 'center',
        }}
      >
        <Text style={[typography.label, { color: t.error }]}>
          {tr('settings.archiveRoom')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
