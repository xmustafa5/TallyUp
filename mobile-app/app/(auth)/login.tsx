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
import { Ionicons } from '@expo/vector-icons';
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
  email: z.string().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
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
    defaultValues: { email: 'musmoh73@gmail.com', password: 'MM123321mm' },
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
        error?.response?.data?.message || 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.';
      Alert.alert('خطأ', message);
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
        <View style={{ gap: 12, alignItems: 'center' }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              borderCurve: 'continuous',
              backgroundColor: theme.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="moon" size={36} color={theme.primary} />
          </View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: theme.text,
            }}
          >
            متتبع صلاة القضاء
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: theme.textSecondary,
              textAlign: 'center',
            }}
          >
            احسب وتابع صلواتك الفائتة
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="البريد الإلكتروني"
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
                label="كلمة المرور"
                placeholder="••••••••"
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
            title="تسجيل الدخول"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
          />
        </View>

        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>
            ليس لديك حساب؟
          </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: theme.primary,
                }}
              >
                سجّل الآن
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
