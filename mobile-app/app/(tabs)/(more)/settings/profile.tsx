import { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '@/stores/auth.store';
import { updateProfile } from '@/services/profile';
import { TextInput } from '@/components/ui/text-input';
import { DateField } from '@/components/ui/date-field';
import { Button } from '@/components/ui/button';
import { colors, spacing } from '@/constants/theme';

export default function EditProfileScreen() {
  const theme = colors.light;
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [name, setName] = useState(user?.name ?? '');
  const [birthdate, setBirthdate] = useState<Date | null>(
    user?.birthdate ? parseISO(user.birthdate) : new Date(2000, 0, 1),
  );
  const [pubertyAge, setPubertyAge] = useState(String(user?.pubertyAge ?? ''));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!birthdate) {
      Alert.alert('تنبيه', 'يرجى اختيار تاريخ الميلاد.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateProfile({
        name,
        birthdate: format(birthdate, 'yyyy-MM-dd'),
        pubertyAge: pubertyAge ? parseInt(pubertyAge) : null,
      });
      updateUser(updated);
      router.back();
    } catch (error: any) {
      Alert.alert(
        'خطأ',
        error?.response?.data?.message || 'تعذّر تحديث الملف الشخصي.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'تعديل الملف' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          label="الاسم"
          value={name}
          onChangeText={setName}
          placeholder="اسمك الكامل"
        />

        <TextInput
          label="البريد الإلكتروني"
          value={user?.email ?? ''}
          editable={false}
          placeholder="لا يمكن تغيير البريد"
        />

        <DateField
          label="تاريخ الميلاد"
          value={birthdate}
          onChange={setBirthdate}
          maximumDate={new Date()}
        />

        <TextInput
          label="عمر البلوغ (٩–١٧)"
          value={pubertyAge}
          onChangeText={setPubertyAge}
          keyboardType="number-pad"
          placeholder="مثال: ١٣"
        />

        <Button title="حفظ التغييرات" onPress={handleSave} loading={loading} fullWidth />
      </ScrollView>
    </>
  );
}
