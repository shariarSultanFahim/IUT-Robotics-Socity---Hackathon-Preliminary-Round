'use client';

import { Bell, Gauge, Power, Zap } from 'lucide-react';
import { useAlerts, useDevices, useUsage } from '@/hooks/use-queries';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format';

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex size-11 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <p className="truncate text-2xl font-semibold tracking-tight">
              {value}
            </p>
          )}
          {hint && !loading && (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCards() {
  const usage = useUsage();
  const devices = useDevices();
  const alerts = useAlerts();

  const devicesOn = devices.data?.filter((d) => d.status === 'on').length ?? 0;
  const totalDevices = devices.data?.length ?? 15;
  const activeAlerts = alerts.data?.length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Current Power"
        value={`${formatNumber(usage.data?.currentWatts ?? 0)} W`}
        icon={Zap}
        accent="bg-primary/10 text-primary"
        loading={usage.isLoading}
      />
      <StatCard
        label="Devices ON"
        value={`${devicesOn} / ${totalDevices}`}
        icon={Power}
        accent="bg-success/10 text-success"
        loading={devices.isLoading}
      />
      <StatCard
        label="Active Alerts"
        value={`${activeAlerts}`}
        hint={activeAlerts === 0 ? 'All clear' : 'Needs attention'}
        icon={Bell}
        accent={
          activeAlerts > 0
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted text-muted-foreground'
        }
        loading={alerts.isLoading}
      />
      <StatCard
        label="Today’s Energy"
        value={`${formatNumber(usage.data?.todayKwh ?? 0, 3)} kWh`}
        icon={Gauge}
        accent="bg-primary/10 text-primary"
        loading={usage.isLoading}
      />
    </div>
  );
}
