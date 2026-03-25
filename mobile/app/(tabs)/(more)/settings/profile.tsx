import { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
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
  const [birthdate, setBirthdate] = useState(
    user?.birthdate ? parseISO(user.birthdate) : new Date(2000, 0, 1),
  );
  const [pubertyAge, setPubertyAge] = useState(String(user?.pubertyAge ?? ''));
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(process.env.EXPO_OS === 'ios');

  const handleSave = async () => {
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

        <View style={{ gap: 8 }}>
          <Button
            title={`Date of Birth: ${format(birthdate, 'MMMM d, yyyy')}`}
            variant="secondary"
            onPress={() => setShowDatePicker(true)}
          />
          {showDatePicker && (
            <DateTimePicker
              value={birthdate}
              mode="date"
              display={process.env.EXPO_OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, date) => {
                if (process.env.EXPO_OS !== 'ios') setShowDatePicker(false);
                if (date) setBirthdate(date);
              }}
            />
          )}
        </View>

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
