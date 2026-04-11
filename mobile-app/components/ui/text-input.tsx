import { useState } from 'react';
import { View, Text, TextInput as RNTextInput } from 'react-native';
import type { TextInputProps as RNTextInputProps } from 'react-native';
import { colors, radii, typography } from '@/constants/theme';

interface TextInputProps extends RNTextInputProps {
  label: string;
  error?: string;
}

export function TextInput({ label, error, style, onFocus, onBlur, ...props }: TextInputProps) {
  const theme = colors.light;
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.error
    : focused
      ? theme.primary
      : theme.border;

  return (
    <View style={{ gap: 6 }}>
      <Text style={[typography.label, { color: theme.text }]}>{label}</Text>
      <RNTextInput
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            backgroundColor: theme.surface,
            borderWidth: 1.5,
            borderColor,
            borderRadius: radii.md,
            borderCurve: 'continuous',
            paddingVertical: 14,
            paddingHorizontal: 16,
            fontSize: 16,
            color: theme.text,
            writingDirection: 'rtl',
            textAlign: 'right',
          },
          style,
        ]}
        placeholderTextColor={theme.textTertiary}
        {...props}
      />
      {error && (
        <Text style={{ fontSize: 13, color: theme.error }}>{error}</Text>
      )}
    </View>
  );
}
