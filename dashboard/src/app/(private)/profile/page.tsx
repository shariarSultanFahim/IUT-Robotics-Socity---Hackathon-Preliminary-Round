'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Mail, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatDateTime } from '@/lib/format';

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your account details and role.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {(user.name || user.email).slice(0, 2).toUpperCase()}
          </span>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <Badge
              variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
              className="mt-1"
            >
              {user.role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="mb-2" />
          <Row icon={UserIcon} label="Name" value={user.name} />
          <Row icon={Mail} label="Email" value={user.email} />
          <Row
            icon={Shield}
            label="Role & permissions"
            value={
              user.role === 'ADMIN'
                ? 'Administrator — can view everything and control devices.'
                : 'Viewer — read-only access to dashboard, alerts and history.'
            }
          />
          <Row
            icon={UserIcon}
            label="Member since"
            value={formatDateTime(user.createdAt)}
          />
          <Separator className="my-3" />
          <Button
            variant="destructive"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
