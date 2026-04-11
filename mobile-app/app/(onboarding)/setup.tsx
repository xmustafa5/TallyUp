import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfile } from '@/services/profile';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { colors } from '@/constants/theme';
import { parse, isValid, format } from 'date-fns';

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const theme = colors.light;
  const updateUser = useAuthStore((state) => state.updateUser);

  const [birthdateText, setBirthdateText] = useState('2000-01-01');
  const [pubertyAge, setPubertyAge] = useState<number>(13);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const parsed = parse(birthdateText, 'yyyy-MM-dd', new Date());
    if (!isValid(parsed)) {
      Alert.alert('Error', 'Please enter a valid date in YYYY-MM-DD format.');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await updateProfile({
        birthdate: format(parsed, 'yyyy-MM-dd'),
        pubertyAge,
      });
      updateUser(updatedUser);
      router.push('/(onboarding)/gap-periods');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Failed to save profile.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: insets.top + 40,
        paddingBottom: insets.bottom + 24,
        gap: 32,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: theme.text, textAlign: 'right' }}>
          معلوماتك
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: theme.textSecondary,
            lineHeight: 22,
            textAlign: 'right',
          }}
        >
          نحتاج تاريخ ميلادك لحساب الصلوات الفائتة. عمر البلوغ يحدد متى أصبحت الصلاة واجبة.
        </Text>
      </View>

      <View
        style={{ gap: 24 }}
      >
        <View style={{ gap: 8 }}>
          <TextInput
            label="تاريخ الميلاد"
            placeholder="YYYY-MM-DD"
            value={birthdateText}
            onChangeText={setBirthdateText}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '600', color: theme.text, textAlign: 'right' }}
          >
            عمر البلوغ (اختياري)
          </Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'right' }}>
            متى أصبحت الصلاة واجبة عليك (عادة ٩–١٧)
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              paddingTop: 4,
            }}
          >
            {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((age) => (
              <View
                key={age}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor:
                    pubertyAge === age ? theme.primary : theme.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  onPress={() => setPubertyAge(age)}
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color:
                      pubertyAge === age ? '#FFFFFF' : theme.textSecondary,
                  }}
                >
                  {age}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View>
        <Button title="متابعة" onPress={onSubmit} loading={loading} fullWidth />
      </View>
    </ScrollView>
  );
}
