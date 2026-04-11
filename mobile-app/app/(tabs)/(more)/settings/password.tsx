import { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { changePassword } from '@/services/settings';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { colors, spacing } from '@/constants/theme';

export default function ChangePasswordScreen() {
  const theme = colors.light;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (newPassword.length < 8) {
      Alert.alert('خطأ', 'كلمة المرور الجديدة يجب أن تكون ٨ أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('خطأ', 'كلمتا المرور غير متطابقتين.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('تم بنجاح', 'تم تغيير كلمة المرور.', [
        { text: 'حسنًا', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        'خطأ',
        error?.response?.data?.message || 'تعذّر تغيير كلمة المرور.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'تغيير كلمة المرور' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          label="كلمة المرور الحالية"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <TextInput
          label="كلمة المرور الجديدة"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="٨ أحرف على الأقل"
        />
        <TextInput
          label="تأكيد كلمة المرور الجديدة"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="أعد كتابة كلمة المرور"
        />
        <Button
          title="تغيير كلمة المرور"
          onPress={handleSubmit}
          loading={loading}
          fullWidth
        />
      </ScrollView>
    </>
  );
}
