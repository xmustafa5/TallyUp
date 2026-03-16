'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { setUserLocale } from '@/i18n/locale';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const handleToggle = async () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    await setUserLocale(newLocale);
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="text-xs text-muted-foreground hover:text-foreground"
    >
      {locale === 'en' ? 'عربي' : 'EN'}
    </Button>
  );
}
