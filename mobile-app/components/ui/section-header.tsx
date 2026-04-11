import { View, Text, Pressable } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  const theme = colors.light;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.h3, { color: theme.text }]}>{title}</Text>
        {subtitle && (
          <Text
            style={[
              typography.caption,
              { color: theme.textSecondary, marginTop: 2 },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text
            style={[
              typography.label,
              { color: theme.primary },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
