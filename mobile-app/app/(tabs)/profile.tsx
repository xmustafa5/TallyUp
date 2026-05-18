import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/hooks/use-auth';
import { useMyHistory } from '@/hooks/use-users';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, typography, radii, shadows } from '@/constants/theme';
import { successNotification } from '@/lib/haptics';
import type { HistoryOutcome } from '@/types/tallyup';

function Stat({ label, value }: { label: string; value: string }) {
  const t = colors.light;
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text
        style={[
          typography.h2,
          { color: t.text, fontVariant: ['tabular-nums'] },
        ]}
      >
        {value}
      </Text>
      <Text style={[typography.caption, { color: t.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
}

const OUTCOME: Record<
  HistoryOutcome,
  { labelKey: string; color: keyof typeof colors.light }
> = {
  won: { labelKey: 'profile.outcomeWon', color: 'success' },
  lost: { labelKey: 'profile.outcomeLost', color: 'error' },
  participated: { labelKey: 'profile.outcomeParticipated', color: 'textSecondary' },
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: history } = useMyHistory();
  const { t: tr, locale, setLocale } = useI18n();
  const t = colors.light;
  const [copied, setCopied] = useState(false);

  if (!user) {
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

  async function copyId() {
    if (!user) return;
    await Clipboard.setStringAsync(user.publicId);
    successNotification();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      <View
        style={[
          {
            backgroundColor: t.card,
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            padding: spacing.xl,
            gap: spacing.lg,
          },
          shadows.sm,
        ]}
      >
        <Text style={[typography.h2, { color: t.text }]}>
          {user.displayName}
        </Text>

        <View style={{ gap: 6 }}>
          <Text style={[typography.caption, { color: t.textTertiary }]}>
            {tr('profile.yourUserId')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <Text
              selectable
              style={[
                typography.h2,
                { color: t.primary, letterSpacing: 1 },
              ]}
            >
              {user.publicId}
            </Text>
            <Pressable
              onPress={copyId}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radii.pill,
                backgroundColor: t.primaryLight,
              }}
            >
              <Icon
                name={copied ? 'checkmark' : 'copy-outline'}
                size={14}
                tone="primary"
              />
              <Text style={[typography.caption, { color: t.primary }]}>
                {copied ? tr('profile.copied') : tr('profile.copy')}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xl }}>
          <View>
            <Text style={[typography.caption, { color: t.textTertiary }]}>
              {tr('profile.email')}
            </Text>
            <Text style={[typography.body, { color: t.text }]}>
              {user.email}
            </Text>
          </View>
          <View>
            <Text style={[typography.caption, { color: t.textTertiary }]}>
              {tr('profile.timezone')}
            </Text>
            <Text style={[typography.body, { color: t.text }]}>
              {user.timezone}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          {
            backgroundColor: t.card,
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            padding: spacing.xl,
            gap: spacing.lg,
          },
          shadows.sm,
        ]}
      >
        <Text style={[typography.label, { color: t.textSecondary }]}>
          {tr('profile.yourHistory')}
        </Text>
        {!history ? (
          <ActivityIndicator color={t.primary} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Stat
                label={tr('profile.cycles')}
                value={String(history.participations)}
              />
              <Stat label={tr('profile.wins')} value={String(history.wins)} />
              <Stat
                label={tr('profile.losses')}
                value={String(history.losses)}
              />
              <Stat
                label={tr('profile.avgPercent')}
                value={`${Math.round(history.avgPercent)}%`}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text
                style={[typography.caption, { color: t.textTertiary }]}
              >
                {tr('profile.streak')}
              </Text>
              <Text style={[typography.body, { color: t.text }]}>
                {tr('profile.streakValue', {
                  current: history.currentStreak,
                  best: history.bestStreak,
                })}
              </Text>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text
                style={[typography.caption, { color: t.textTertiary }]}
              >
                {tr('profile.badges')}
              </Text>
              {history.badges.length === 0 ? (
                <Text
                  style={[typography.body, { color: t.textTertiary }]}
                >
                  {tr('profile.noBadges')}
                </Text>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                  }}
                >
                  {history.badges.map((b) => (
                    <View
                      key={b.code}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 6,
                        borderRadius: radii.pill,
                        backgroundColor: t.surfaceAlt,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{b.icon}</Text>
                      <Text
                        style={[typography.caption, { color: t.text }]}
                      >
                        {b.name}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {history.recent.length > 0 && (
              <View style={{ gap: spacing.sm }}>
                <Text
                  style={[
                    typography.caption,
                    { color: t.textTertiary },
                  ]}
                >
                  {tr('profile.recent')}
                </Text>
                {history.recent.map((r) => {
                  const o = OUTCOME[r.outcome];
                  return (
                    <Pressable
                      key={r.cycleId}
                      onPress={() =>
                        router.push(`/results/${r.cycleId}`)
                      }
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: spacing.md,
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
                        borderRadius: radii.md,
                        borderCurve: 'continuous',
                        backgroundColor: pressed
                          ? t.surfaceAlt
                          : 'transparent',
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            typography.body,
                            { color: t.text },
                          ]}
                          numberOfLines={1}
                        >
                          {r.roomName}
                        </Text>
                        <Text
                          style={[
                            typography.caption,
                            { color: t.textTertiary },
                          ]}
                        >
                          {tr('profile.cycleDate', {
                            number: r.cycleNumber,
                            date: new Date(r.endsAt).toLocaleDateString(),
                          })}
                        </Text>
                      </View>
                      <Text
                        style={[
                          typography.caption,
                          { color: t[o.color], fontWeight: '700' },
                        ]}
                      >
                        {tr(o.labelKey)}
                      </Text>
                      <Icon
                        name="chevron-forward"
                        size={16}
                        tone="muted"
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>

      <View
        style={[
          {
            backgroundColor: t.card,
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            padding: spacing.xl,
            gap: spacing.md,
          },
          shadows.sm,
        ]}
      >
        <Text style={[typography.label, { color: t.textSecondary }]}>
          {tr('profile.language')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['en', 'ar'] as const).map((lng) => {
            const active = locale === lng;
            return (
              <Pressable
                key={lng}
                onPress={() => setLocale(lng)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  borderRadius: radii.md,
                  borderCurve: 'continuous',
                  backgroundColor: active ? t.primary : t.surfaceAlt,
                }}
              >
                <Text
                  style={[
                    typography.label,
                    { color: active ? '#FFFFFF' : t.text },
                  ]}
                >
                  {lng === 'en' ? 'English' : 'العربية'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button
        title={tr('profile.logOut')}
        variant="secondary"
        onPress={logout}
        fullWidth
      />
    </ScrollView>
  );
}
