export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">TallyUp</h1>
          <p className="text-sm text-muted-foreground">
            Challenge your friends. Track the score.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
