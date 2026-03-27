import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrayerBalance } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { colors } from '@/constants/theme';
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
        paddingHorizontal: 24,
        paddingTop: insets.top + 60,
        paddingBottom: insets.bottom + 24,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 32 }}>
        <View
          style={{ alignItems: 'center', gap: 8 }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '500',
              color: theme.textSecondary,
            }}
          >
            Your total missed prayers
          </Text>
          <Text
            selectable
            style={{
              fontSize: 48,
              fontWeight: '700',
              color: theme.primary,
              fontVariant: ['tabular-nums'],
              textAlign: 'center',
            }}
          >
            {totalRemaining.toLocaleString()}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.textSecondary,
            }}
          >
            prayers to make up
          </Text>
        </View>

        {balance && (
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 20,
              gap: 12,
            }}
          >
            {PRAYER_TYPES.map((type) => {
              const key = type.toLowerCase() as keyof typeof balance;
              const count = (balance[key] as number) ?? 0;

              return (
                <View
                  key={type}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: theme.text,
                      fontWeight: '500',
                    }}
                  >
                    {PRAYER_NAMES[type].en}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: theme.primary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {count.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View>
          <Text
            style={{
              fontSize: 16,
              color: theme.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            Let us help you make these up, one prayer at a time.
          </Text>
        </View>
      </View>

      <View>
        <Button
          title="Start Your Journey"
          onPress={() => router.replace('/(tabs)/(home)')}
        />
      </View>
    </View>
  );
}
