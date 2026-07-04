'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Menu, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useSocket } from '@/components/providers/socket-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function onLogout() {
    setMenuOpen(false);
    await logout();
    router.replace('/login');
  }

  const initials = (user?.name ?? user?.email ?? '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      <div className="flex-1" />

      <div
        className={cn(
          'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs sm:flex',
          connected
            ? 'border-success/40 text-success'
            : 'border-muted-foreground/30 text-muted-foreground',
        )}
        title={connected ? 'Live connection active' : 'Reconnecting…'}
      >
        {connected ? (
          <Wifi className="size-3.5" />
        ) : (
          <WifiOff className="size-3.5" />
        )}
        {connected ? 'Live' : 'Offline'}
      </div>

      <ThemeToggle />

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-accent"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-none">
              {user?.name}
            </span>
          </span>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 rounded-lg border bg-card p-2 shadow-lg"
          >
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
              <Badge
                variant={user?.role === 'ADMIN' ? 'default' : 'secondary'}
                className="mt-2"
              >
                {user?.role}
              </Badge>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={onLogout}
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
