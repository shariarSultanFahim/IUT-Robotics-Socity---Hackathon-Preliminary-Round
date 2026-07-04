'use client';

import { AlertsPanel } from '@/components/dashboard/alerts-panel';
import { OfficeOverview } from '@/components/dashboard/office-overview';
import { PowerChart } from '@/components/dashboard/power-chart';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { OfficeHoursControl } from '@/components/dashboard/office-hours-control';
import { useAuth } from '@/components/providers/auth-provider';
import { useDevices } from '@/hooks/use-queries';
import OfficeMap from '@/components/dashboard/office-map';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { data } = useDevices();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? 'Live office overview — tap a device to toggle it.'
            : 'Live office overview (read-only).'}
        </p>
      </div>

      <OfficeHoursControl />
      <SummaryCards />
      <OfficeOverview />

      {/* Office Top Down View Live Device status component */}
      <div className="w-full">
        <OfficeMap devices={data ?? []} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PowerChart />
        </div>
        <AlertsPanel />
      </div>
    </div>
  );
}
