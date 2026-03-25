import { View, Text, TextInput as RNTextInput } from 'react-native';
import type { TextInputProps as RNTextInputProps } from 'react-native';
import { colors } from '@/constants/theme';

interface TextInputProps extends RNTextInputProps {
  label: string;
  error?: string;
}

export function TextInput({ label, error, style, ...props }: TextInputProps) {
  const theme = colors.light;

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: theme.text,
        }}
      >
        {label}
      </Text>
      <RNTextInput
        style={[
          {
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: error ? theme.error : theme.border,
            borderRadius: 10,
            borderCurve: 'continuous',
            paddingVertical: 12,
            paddingHorizontal: 14,
            fontSize: 16,
            color: theme.text,
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
