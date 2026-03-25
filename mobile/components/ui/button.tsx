import { Pressable, Text, ActivityIndicator } from 'react-native';
import { colors } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const theme = colors.light;

  const bgColor =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.error
        : variant === 'secondary'
          ? theme.surfaceAlt
          : 'transparent';

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'ghost'
        ? theme.primary
        : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => ({
        backgroundColor: bgColor,
        opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderCurve: 'continuous',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      })}
    >
      {loading && <ActivityIndicator size="small" color={textColor} />}
      <Text
        style={{
          color: textColor,
          fontSize: 16,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
