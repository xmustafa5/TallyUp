import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { updateProfile } from '@/services/profile';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { colors } from '@/constants/theme';
import { format } from 'date-fns';

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const theme = colors.light;
  const updateUser = useAuthStore((state) => state.updateUser);

  const [birthdate, setBirthdate] = useState<Date>(new Date(2000, 0, 1));
  const [pubertyAge, setPubertyAge] = useState<number>(13);
  const [showDatePicker, setShowDatePicker] = useState(
    process.env.EXPO_OS === 'ios',
  );
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
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
      <Animated.View
        entering={FadeInDown.duration(600).delay(200)}
        style={{ gap: 8 }}
      >
        <Text
          style={{ fontSize: 28, fontWeight: '700', color: theme.text }}
        >
          About You
        </Text>
        <Text style={{ fontSize: 16, color: theme.textSecondary, lineHeight: 22 }}>
          We need your date of birth to calculate missed prayers. Puberty age
          helps determine when prayer became obligatory.
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(600).delay(400)}
        style={{ gap: 24 }}
      >
        <View style={{ gap: 8 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '500', color: theme.text }}
          >
            Date of Birth
          </Text>
          {process.env.EXPO_OS !== 'ios' && (
            <Button
              title={format(birthdate, 'MMMM d, yyyy')}
              variant="secondary"
              onPress={() => setShowDatePicker(true)}
            />
          )}
          {showDatePicker && (
            <DateTimePicker
              value={birthdate}
              mode="date"
              display={process.env.EXPO_OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              minimumDate={new Date(1940, 0, 1)}
              onChange={(_, selectedDate) => {
                if (process.env.EXPO_OS !== 'ios') {
                  setShowDatePicker(false);
                }
                if (selectedDate) {
                  setBirthdate(selectedDate);
                }
              }}
            />
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '500', color: theme.text }}
          >
            Age of Puberty (optional)
          </Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary }}>
            When prayer became obligatory (typically 9-17)
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
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(600).delay(600)}>
        <Button title="Continue" onPress={onSubmit} loading={loading} />
      </Animated.View>
    </ScrollView>
  );
}
