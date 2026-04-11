import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrayerBalance } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { BrandCard } from '@/components/ui/brand-card';
import { PrayerIcon, type PrayerName } from '@/components/ui/prayer-icon';
import { colors, format, radii, spacing, typography } from '@/constants/theme';
import { PRAYER_NAMES, PRAYER_TYPES } from '@/constants/prayers';

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const theme = colors.light;
  const { data: balance } = usePrayerBalance();

  const totalRemaining = balance?.totalRemaining ?? 0;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        paddingHorizontal: spacing['2xl'],
        paddingTop: insets.top + 48,
        paddingBottom: insets.bottom + spacing['2xl'],
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing['3xl'] }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text
            style={[typography.label, { color: theme.textSecondary }]}
          >
            إجمالي صلواتك الفائتة
          </Text>
          <Text
            selectable
            style={{
              ...typography.display,
              fontSize: 56,
              color: theme.primary,
              fontVariant: ['tabular-nums'],
              textAlign: 'center',
            }}
          >
            {format.toArabicDigits(totalRemaining)}
          </Text>
          <Text
            style={[typography.body, { color: theme.textSecondary }]}
          >
            صلاة بحاجة إلى قضاء
          </Text>
        </View>

        {balance && (
          <BrandCard>
            <View style={{ gap: spacing.md }}>
              {PRAYER_TYPES.map((type) => {
                const key = type.toLowerCase() as keyof typeof balance;
                const count = (balance[key] as number) ?? 0;

                return (
                  <View
                    key={type}
                    style={{
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      gap: spacing.md,
                    }}
                  >
                    <PrayerIcon
                      name={type.toLowerCase() as PrayerName}
                      size={40}
                      tone="gold"
                    />
                    <Text
                      style={{
                        ...typography.bodyLg,
                        flex: 1,
                        fontWeight: '700',
                        color: theme.text,
                        textAlign: 'right',
                      }}
                    >
                      {PRAYER_NAMES[type].ar}
                    </Text>
                    <Text
                      selectable
                      style={{
                        ...typography.h3,
                        color: theme.accent,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {format.toArabicDigits(count)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </BrandCard>
        )}

        <Text
          style={{
            ...typography.body,
            color: theme.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >
          سنساعدك في قضائها صلاة تلو الأخرى، بخطى ثابتة.
        </Text>
      </View>

      <Button
        title="ابدأ رحلتك"
        onPress={() => router.replace('/(tabs)/(home)')}
        fullWidth
      />
    </View>
  );
}
