import { View, Text } from 'react-native';
import { colors, spacing, typography, radii } from '@/constants/theme';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Icon } from '@/components/ui/icon';
import { useI18n } from '@/hooks/use-i18n';
import type { LeaderboardRow } from '@/types/tallyup';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Leaderboard({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[];
  currentUserId?: string;
}) {
  const t = colors.light;
  const { t: tr } = useI18n();

  if (rows.length === 0) {
    return (
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
        {tr('room.noMembersScored')}
      </Text>
    );
  }

  const topPercent = Math.max(...rows.map((r) => r.percent));

  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((row, i) => {
        const isMe = row.userId === currentUserId;
        const isLeader = row.percent === topPercent && topPercent > 0;
        const reached = row.percent >= 100;
        const atRisk = !reached && row.percent < 25;
        return (
          <View
            key={row.userId}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.sm,
              borderRadius: radii.md,
              borderCurve: 'continuous',
              backgroundColor: isMe ? t.primaryLight : 'transparent',
            }}
          >
            <Text
              style={[
                typography.label,
                { width: 20, textAlign: 'center', color: t.textTertiary },
              ]}
            >
              {i + 1}
            </Text>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.pill,
                backgroundColor: t.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[typography.caption, { color: t.text }]}>
                {initials(row.displayName)}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text
                  style={[typography.body, { color: t.text }]}
                  numberOfLines={1}
                >
                  {row.displayName}
                  {isMe ? tr('room.you') : ''}
                </Text>
                {isLeader && (
                  <Icon name="trophy" size={14} color={t.accent} />
                )}
                {reached && (
                  <Icon
                    name="checkmark-circle"
                    size={14}
                    color={t.success}
                  />
                )}
                {atRisk && (
                  <Icon name="warning" size={14} color={t.error} />
                )}
                {row.streak >= 2 && (
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: t.textTertiary,
                        fontVariant: ['tabular-nums'],
                      },
                    ]}
                  >
                    {tr('room.streakBadge', { count: row.streak })}
                  </Text>
                )}
              </View>
              <ProgressBar percent={row.percent} height={6} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  typography.label,
                  { color: t.text, fontVariant: ['tabular-nums'] },
                ]}
              >
                {row.points}/{row.target}
              </Text>
              <Text
                style={[
                  typography.caption,
                  {
                    color: t.textTertiary,
                    fontVariant: ['tabular-nums'],
                  },
                ]}
              >
                {row.percent}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
