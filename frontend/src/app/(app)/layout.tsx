'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CheckSquare, Home, RotateCcw, Settings, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AuthGuard } from '@/components/shared/auth-guard';
import { LanguageSwitcher } from '@/components/shared/language-switcher';

const NAV_ITEMS = [
  { href: '/', labelKey: 'dashboard', icon: Home },
  { href: '/daily-tracker', labelKey: 'daily', icon: CheckSquare },
  { href: '/makeup', labelKey: 'makeup', icon: RotateCcw },
  { href: '/calendar', labelKey: 'calendar', icon: Calendar },
  { href: '/schedule', labelKey: 'schedule', icon: Target },
  { href: '/settings', labelKey: 'settings', icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname.startsWith(href);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r bg-card md:block rtl:border-r-0 rtl:border-l">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b p-4">
              <h1 className="text-lg font-bold tracking-tight">Qatha</h1>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-4" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t p-3">
              <LanguageSwitcher />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
          <div className="flex items-center justify-around">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="size-5" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </AuthGuard>
  );
}
