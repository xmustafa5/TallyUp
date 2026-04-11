import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { colors, radii, typography } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const theme = colors.light;

  const bg =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.error
        : variant === 'secondary'
          ? theme.surface
          : 'transparent';

  const fg =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'secondary'
        ? theme.primary
        : theme.primary;

  const borderColor =
    variant === 'secondary' ? theme.primary : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderColor,
        borderWidth: variant === 'secondary' ? 1.5 : 0,
        opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 52,
        alignSelf: fullWidth ? 'stretch' : 'auto',
      })}
    >
      <View
        style={{
          position: 'absolute',
          left: 16,
          top: 0,
          bottom: 0,
          justifyContent: 'center',
          opacity: loading ? 1 : 0,
        }}
      >
        <ActivityIndicator size="small" color={fg} />
      </View>
      <Text style={[typography.bodyLg, { color: fg, fontWeight: '700' }]}>
        {title}
      </Text>
    </Pressable>
  );
}
