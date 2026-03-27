import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Pressable,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginUser } from '@/services/auth';
import { useAuthStore } from '@/stores/auth.store';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { colors } from '@/constants/theme';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const theme = colors.light;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setLoading(true);
    try {
      const data = await loginUser(values);
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      if (!data.user.birthdate) {
        router.replace('/(onboarding)/welcome');
      } else {
        router.replace('/(tabs)/(home)');
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Login failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          gap: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 8, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: '700',
              color: theme.text,
            }}
          >
            Qatha
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.textSecondary,
              textAlign: 'center',
            }}
          >
            Track and make up your missed prayers
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Email"
                placeholder="your@email.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Password"
                placeholder="Enter your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
              />
            )}
          />

          <Button
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
          />
        </View>

        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>
            Don't have an account?
          </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.primary,
                }}
              >
                Sign Up
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
