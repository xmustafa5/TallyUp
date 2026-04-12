import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, left, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = colors.light;

  return (
    <View
      style={{
        backgroundColor: theme.background,
        paddingTop: insets.top + spacing.sm,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.xl,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: spacing.md,
      }}
    >
      {right && <View>{right}</View>}
      <View style={{ flex: 1 }}>
        {subtitle && (
          <Text
            style={[
              typography.caption,
              { color: theme.textSecondary, textAlign: 'right' },
            ]}
          >
            {subtitle}
          </Text>
        )}
        <Text
          style={[
            typography.h2,
            { color: theme.text, textAlign: 'right' },
          ]}
        >
          {title}
        </Text>
      </View>
      {left && <View>{left}</View>}
    </View>
  );
}
