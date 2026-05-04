import { Text, View } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        backgroundColor: colors.light.background,
      }}
    >
      <Text style={{ ...typography.h1, color: colors.light.text }}>Welcome</Text>
      <Text
        style={{
          ...typography.body,
          marginTop: spacing.sm,
          color: colors.light.textSecondary,
          textAlign: 'center',
        }}
      >
        Starter template. Replace this screen with your application.
      </Text>
    </View>
  );
}
