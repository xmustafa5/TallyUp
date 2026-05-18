'use client';

import { useState } from 'react';
import { Copy, Check, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonCard } from '@/components/shared/skeleton';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <div className="p-6">
        <SkeletonCard />
      </div>
    );
  }

  function copyId() {
    if (!user) return;
    void navigator.clipboard.writeText(user.publicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <PageHeader title="Profile" />
      <div className="mx-auto max-w-xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>{user.displayName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Your User ID</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">
                  {user.publicId}
                </code>
                <Button size="sm" variant="outline" onClick={copyId}>
                  {copied ? (
                    <Check className="mr-1.5 size-4" />
                  ) : (
                    <Copy className="mr-1.5 size-4" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Share this with friends so they can invite you to rooms.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p>{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Timezone</p>
                <p>{user.timezone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => logout()}>
          <LogOut className="mr-1.5 size-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
