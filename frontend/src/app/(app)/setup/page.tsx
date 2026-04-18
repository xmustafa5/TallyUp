'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateProfile } from '@/services/profile';
import { useAuthStore } from '@/stores/auth.store';

const setupSchema = z.object({
  birthdate: z.string().min(1, 'Birthdate is required'),
  pubertyAge: z.string().optional(),
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      birthdate: user?.birthdate?.split('T')[0] || '',
      pubertyAge: undefined,
    },
  });

  async function onSubmit(data: SetupFormData) {
    setError(null);
    try {
      const pubertyAge = data.pubertyAge ? parseInt(data.pubertyAge, 10) : null;
      const updatedUser = await updateProfile({
        birthdate: data.birthdate,
        pubertyAge: pubertyAge && pubertyAge >= 9 && pubertyAge <= 17 ? pubertyAge : null,
      });
      if (accessToken && refreshToken) {
        setAuth(updatedUser, accessToken, refreshToken);
      }
      router.push('/gap-periods/new');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Profile Setup</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your birthdate to calculate your missed prayers
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="birthdate" className="text-sm font-medium">
              Date of Birth
            </label>
            <input
              id="birthdate"
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              max={new Date().toISOString().split('T')[0]}
              {...register('birthdate')}
            />
            {errors.birthdate && (
              <p className="text-sm text-destructive">{errors.birthdate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="pubertyAge" className="text-sm font-medium">
              Age of Puberty{' '}
              <span className="text-muted-foreground">(optional, 9-17)</span>
            </label>
            <input
              id="pubertyAge"
              type="number"
              min={9}
              max={17}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Leave empty if unsure"
              {...register('pubertyAge')}
            />
            {errors.pubertyAge && (
              <p className="text-sm text-destructive">{errors.pubertyAge.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Used to calculate when prayers became obligatory for you
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <Loader2
              className={`mr-2 size-4 animate-spin ${isSubmitting ? '' : 'hidden'}`}
            />
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
