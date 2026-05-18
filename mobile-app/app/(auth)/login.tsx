import { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { colors, spacing, typography } from '@/constants/theme';

const schema = z.object({
  email: z.string().email('errorEmailInvalid'),
  password: z.string().min(1, 'errorPasswordRequired'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { t: tr } = useI18n();
  const t = colors.light;
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormValues) {
    setSubmitting(true);
    login.mutate(values, {
      onError: () => {
        setSubmitting(false);
        Alert.alert(tr('auth.loginFailed'), tr('auth.invalidCredentials'));
      },
    });
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: t.background }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing['2xl'],
        gap: spacing.xl,
      }}
    >
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Text style={[typography.display, { color: t.primary }]}>
          TallyUp
        </Text>
        <Text style={[typography.body, { color: t.textSecondary }]}>
          {tr('auth.tagline')}
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={tr('auth.email')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              error={
                errors.email?.message
                  ? tr(`auth.${errors.email.message}`)
                  : undefined
              }
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={tr('auth.password')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              error={
                errors.password?.message
                  ? tr(`auth.${errors.password.message}`)
                  : undefined
              }
            />
          )}
        />
        <Button
          title={tr('auth.logIn')}
          onPress={handleSubmit(onSubmit)}
          loading={submitting}
          fullWidth
        />
        <Pressable
          onPress={() => router.replace('/(auth)/register')}
          style={{ alignSelf: 'center' }}
        >
          <Text style={[typography.body, { color: t.primary }]}>
            {tr('auth.noAccount')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
