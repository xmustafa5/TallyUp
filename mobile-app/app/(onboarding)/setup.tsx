import { useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfile } from '@/services/profile';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { colors, format as fmt, radii, spacing, typography } from '@/constants/theme';
import { format } from 'date-fns';

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const theme = colors.light;
  const updateUser = useAuthStore((state) => state.updateUser);

  const [birthdate, setBirthdate] = useState<Date | null>(new Date(2000, 0, 1));
  const [pubertyAge, setPubertyAge] = useState<number>(13);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!birthdate) {
      Alert.alert('تنبيه', 'يرجى اختيار تاريخ الميلاد.');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await updateProfile({
        birthdate: format(birthdate, 'yyyy-MM-dd'),
        pubertyAge,
      });
      updateUser(updatedUser);
      router.push('/(onboarding)/gap-periods');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'تعذّر حفظ الملف الشخصي.';
      Alert.alert('خطأ', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing['2xl'],
        paddingTop: insets.top + 40,
        paddingBottom: insets.bottom + spacing['2xl'],
        gap: spacing['3xl'],
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 8 }}>
        <Text
          style={[
            typography.h1,
            { color: theme.text, textAlign: 'right' },
          ]}
        >
          معلوماتك
        </Text>
        <Text
          style={{
            ...typography.body,
            color: theme.textSecondary,
            lineHeight: 22,
            textAlign: 'right',
          }}
        >
          نحتاج تاريخ ميلادك لحساب الصلوات الفائتة. عمر البلوغ يحدد متى أصبحت
          الصلاة واجبة.
        </Text>
      </View>

      <View style={{ gap: spacing['2xl'] }}>
        <DateField
          label="تاريخ الميلاد"
          value={birthdate}
          onChange={setBirthdate}
          maximumDate={new Date()}
        />

        <View style={{ gap: spacing.sm }}>
          <Text
            style={[
              typography.label,
              { color: theme.text, textAlign: 'right' },
            ]}
          >
            عمر البلوغ (اختياري)
          </Text>
          <Text
            style={[
              typography.caption,
              { color: theme.textSecondary, textAlign: 'right' },
            ]}
          >
            متى أصبحت الصلاة واجبة عليك (عادة ٩–١٧)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: 6 }}
          >
            {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((age) => {
              const selected = pubertyAge === age;
              return (
                <Pressable
                  key={age}
                  onPress={() => setPubertyAge(age)}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: radii.pill,
                    backgroundColor: selected ? theme.primary : theme.surface,
                    borderWidth: 1.5,
                    borderColor: selected ? theme.primary : theme.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: selected ? '#FFFFFF' : theme.text,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {fmt.toArabicDigits(age)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <Button title="متابعة" onPress={onSubmit} loading={loading} fullWidth />
    </ScrollView>
  );
}
