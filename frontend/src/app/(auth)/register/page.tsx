'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const schema = z.object({
  displayName: z.string().min(1, 'errorNameRequired').max(80),
  email: z.string().email('errorEmailInvalid'),
  password: z.string().min(8, 'errorPasswordMin'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const t = useTranslations('auth');
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormValues) {
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    registerUser.mutate(
      { ...values, timezone },
      {
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? t('couldNotCreateAccount');
          toast({ type: 'error', message: msg });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('createAccountTitle')}</CardTitle>
        <CardDescription>{t('registerSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">{t('displayName')}</Label>
            <Input id="displayName" autoComplete="name" {...register('displayName')} />
            {errors.displayName && (
              <p className="text-xs text-destructive">
                {t(errors.displayName.message as 'errorNameRequired')}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && (
              <p className="text-xs text-destructive">
                {t(errors.email.message as 'errorEmailInvalid')}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {t(errors.password.message as 'errorPasswordMin')}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={registerUser.isPending}
            className="w-full"
          >
            <Loader2
              className={`me-2 size-4 animate-spin ${registerUser.isPending ? '' : 'hidden'}`}
            />
            {t('createAccount')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('haveAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('logIn')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
