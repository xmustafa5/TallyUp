import { View } from 'react-native';
import type { ViewProps } from 'react-native';
import { colors, radii, shadows } from '@/constants/theme';

interface BrandCardProps extends ViewProps {
  variant?: 'plain' | 'raised' | 'outlined';
  padding?: number;
}

export function BrandCard({
  variant = 'raised',
  padding = 20,
  style,
  children,
  ...rest
}: BrandCardProps) {
  const theme = colors.light;
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          padding,
        },
        variant === 'raised' && shadows.md,
        variant === 'outlined' && {
          borderWidth: 1,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
