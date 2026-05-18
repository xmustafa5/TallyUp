import { getTranslations } from 'next-intl/server';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('auth');
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">TallyUp</h1>
          <p className="text-sm text-muted-foreground">{t('tagline')}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
