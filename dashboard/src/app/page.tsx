'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';

export default function IndexPage() {
  const router = useRouter();
  const { user, initializing } = useAuth();

  React.useEffect(() => {
    if (initializing) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [user, initializing, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Loading…
    </div>
  );
}
