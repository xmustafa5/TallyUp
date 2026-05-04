import { LanguageSwitcher } from '@/components/shared/language-switcher';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight">App</h1>
        <LanguageSwitcher />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
