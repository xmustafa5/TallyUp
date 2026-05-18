'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: ErrorPageProps) {
  const t = useTranslations('errors');
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold">{t('somethingWentWrong')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || t('unexpected')}
        </p>
        <Button className="mt-4" onClick={reset}>
          {t('tryAgain')}
        </Button>
      </div>
    </div>
  );
}
