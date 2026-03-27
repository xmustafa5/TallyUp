import { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { format, parseISO, parse, isValid } from 'date-fns';
import { useAuthStore } from '@/stores/auth.store';
import { updateProfile } from '@/services/profile';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { colors } from '@/constants/theme';

export default function EditProfileScreen() {
  const theme = colors.light;
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [name, setName] = useState(user?.name ?? '');
  const [birthdateText, setBirthdateText] = useState(
    user?.birthdate ? format(parseISO(user.birthdate), 'yyyy-MM-dd') : '2000-01-01',
  );
  const [pubertyAge, setPubertyAge] = useState(String(user?.pubertyAge ?? ''));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const parsedDate = parse(birthdateText, 'yyyy-MM-dd', new Date());
    if (!isValid(parsedDate)) {
      Alert.alert('Error', 'Date of birth must be in YYYY-MM-DD format.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateProfile({
        name,
        birthdate: birthdateText,
        pubertyAge: pubertyAge ? parseInt(pubertyAge) : null,
      });
      updateUser(updated);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
        />

        <View style={{ gap: 8 }}>
          <TextInput
            label="Email"
            value={user?.email ?? ''}
            editable={false}
            placeholder="Email cannot be changed"
          />
        </View>

        <TextInput
          label="Date of Birth"
          placeholder="YYYY-MM-DD"
          value={birthdateText}
          onChangeText={setBirthdateText}
        />

        <TextInput
          label="Age of Puberty (optional, 9-17)"
          value={pubertyAge}
          onChangeText={setPubertyAge}
          keyboardType="number-pad"
          placeholder="e.g., 13"
        />

        <Button title="Save Changes" onPress={handleSave} loading={loading} />
      </ScrollView>
    </>
  );
}
