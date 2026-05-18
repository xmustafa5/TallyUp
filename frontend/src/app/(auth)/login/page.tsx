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
  email: z.string().email('errorEmailInvalid'),
  password: z.string().min(1, 'errorPasswordRequired'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const { login } = useAuth();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormValues) {
    login.mutate(values, {
      onError: () =>
        toast({ type: 'error', message: t('invalidCredentials') }),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('welcomeBack')}</CardTitle>
        <CardDescription>{t('loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {t(errors.password.message as 'errorPasswordRequired')}
              </p>
            )}
          </div>
          <Button type="submit" disabled={login.isPending} className="w-full">
            <Loader2
              className={`me-2 size-4 animate-spin ${login.isPending ? '' : 'hidden'}`}
            />
            {t('logIn')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-primary hover:underline">
            {t('createOne')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
