import { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { colors, spacing, typography } from '@/constants/theme';

const schema = z.object({
  displayName: z.string().min(1, 'Name is required').max(80),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const t = colors.light;
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormValues) {
    setSubmitting(true);
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    register.mutate(
      { ...values, timezone },
      {
        onError: (err: unknown) => {
          setSubmitting(false);
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? 'Could not create account';
          Alert.alert('Sign up failed', msg);
        },
      },
    );
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
        <Text style={[typography.h1, { color: t.text }]}>
          Create your account
        </Text>
        <Text
          style={[
            typography.body,
            { color: t.textSecondary, textAlign: 'center' },
          ]}
        >
          You will get a shareable User ID to invite friends.
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Controller
          control={control}
          name="displayName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Display name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.displayName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              error={errors.password?.message}
            />
          )}
        />
        <Button
          title="Create account"
          onPress={handleSubmit(onSubmit)}
          loading={submitting}
          fullWidth
        />
        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          style={{ alignSelf: 'center' }}
        >
          <Text style={[typography.body, { color: t.primary }]}>
            Already have an account? Log in
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
