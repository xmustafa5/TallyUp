import { AuthGuard } from '@/components/shared/auth-guard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
