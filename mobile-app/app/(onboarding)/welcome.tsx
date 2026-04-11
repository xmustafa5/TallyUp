import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { colors, radii, spacing, typography } from '@/constants/theme';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = colors.light;

  const features = [
    'احسب عدد الصلوات الفائتة',
    'تابع صلواتك اليومية',
    'سجّل صلوات القضاء بلمسة واحدة',
    'شاهد تقدّمك عبر الزمن',
  ];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        paddingHorizontal: spacing['2xl'],
        paddingTop: insets.top + 60,
        paddingBottom: insets.bottom + spacing['2xl'],
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing['2xl'] }}>
        <View style={{ alignItems: 'center', gap: spacing.lg }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: radii['2xl'],
              borderCurve: 'continuous',
              backgroundColor: theme.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="moon" size={44} color={theme.primary} />
          </View>
          <Text
            style={{
              ...typography.h1,
              color: theme.text,
              textAlign: 'center',
            }}
          >
            متتبع صلاة القضاء
          </Text>
          <Text
            style={{
              ...typography.body,
              color: theme.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
            احسب، تابع، واقضِ صلواتك الفائتة بخطة منظمة ورحيمة.
          </Text>
        </View>

        <View style={{ gap: spacing.md }}>
          {features.map((item, index) => (
            <View
              key={item}
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radii.pill,
                  backgroundColor: theme.accentLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: theme.accent,
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                style={{
                  ...typography.bodyLg,
                  color: theme.text,
                  flex: 1,
                  textAlign: 'right',
                }}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Button
        title="ابدأ الآن"
        onPress={() => router.push('/(onboarding)/setup')}
        fullWidth
      />
    </View>
  );
}
