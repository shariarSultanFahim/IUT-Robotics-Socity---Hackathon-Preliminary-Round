'use client';

import { Fan, Lightbulb } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useDevices } from '@/hooks/use-queries';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/ui/toast';
import { dataApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ROOM_LABELS, ROOM_ORDER, type Device, type RoomId } from '@/lib/types';

function DeviceTile({
  device,
  canToggle,
  onToggle,
  pending,
}: {
  device: Device;
  canToggle: boolean;
  onToggle: (d: Device) => void;
  pending: boolean;
}) {
  const on = device.status === 'on';
  const Icon = device.type === 'fan' ? Fan : Lightbulb;
  const content = (
    <>
      <Icon
        className={cn(
          'size-6',
          on && device.type === 'fan' && 'animate-spin-slow text-primary',
          on && device.type === 'light' && 'glow-on',
          !on && 'text-muted-foreground/60',
        )}
      />
      <span className="text-xs font-medium">{device.label}</span>
      <span
        className={cn(
          'text-[10px] font-semibold uppercase',
          on ? 'text-success' : 'text-muted-foreground',
        )}
      >
        {device.status}
      </span>
    </>
  );

  const base =
    'flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-center transition-colors';
  const stateCls = on ? 'border-success/40 bg-success/5' : 'bg-muted/30';

  if (!canToggle) {
    return <div className={cn(base, stateCls)}>{content}</div>;
  }
  return (
    <button
      onClick={() => onToggle(device)}
      disabled={pending}
      className={cn(
        base,
        stateCls,
        'hover:border-primary/50 disabled:opacity-60',
      )}
      title="Toggle device (ADMIN)"
    >
      {content}
    </button>
  );
}

function RoomCard({
  room,
  devices,
  canToggle,
  onToggle,
  pendingId,
}: {
  room: RoomId;
  devices: Device[];
  canToggle: boolean;
  onToggle: (d: Device) => void;
  pendingId: string | null;
}) {
  const watts = devices
    .filter((d) => d.status === 'on')
    .reduce((sum, d) => sum + d.wattage, 0);
  const onCount = devices.filter((d) => d.status === 'on').length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{ROOM_LABELS[room]}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{onCount}/5 on</Badge>
          <Badge variant={watts > 0 ? 'default' : 'secondary'}>{watts} W</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {devices.map((d) => (
            <DeviceTile
              key={d.id}
              device={d}
              canToggle={canToggle}
              onToggle={onToggle}
              pending={pendingId === d.id}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function OfficeOverview() {
  const { data, isLoading } = useDevices();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'on' | 'off' }) =>
      dataApi.setDeviceStatus(id, status),
    onError: () =>
      toast({
        title: 'Could not update device',
        description: 'Your role may not permit this action.',
        variant: 'destructive',
      }),
  });

  const onToggle = (d: Device) =>
    mutation.mutate({ id: d.id, status: d.status === 'on' ? 'off' : 'on' });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {ROOM_ORDER.map((r) => (
          <Skeleton key={r} className="h-48" />
        ))}
      </div>
    );
  }

  const byRoom = (room: RoomId) =>
    (data ?? []).filter((d) => d.room === room);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {ROOM_ORDER.map((room) => (
        <RoomCard
          key={room}
          room={room}
          devices={byRoom(room)}
          canToggle={isAdmin}
          onToggle={onToggle}
          pendingId={mutation.isPending ? mutation.variables?.id ?? null : null}
        />
      ))}
    </div>
  );
}
