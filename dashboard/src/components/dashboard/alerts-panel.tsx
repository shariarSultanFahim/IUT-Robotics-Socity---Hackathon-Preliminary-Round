'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAlerts } from '@/hooks/use-queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { ROOM_LABELS } from '@/lib/types';

const TYPE_LABEL: Record<string, string> = {
  AFTER_HOURS: 'After hours',
  ALL_DEVICES_ON_TOO_LONG: 'Room on > 2h',
};

export function AlertsPanel() {
  const { data, isLoading } = useAlerts();

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Active Alerts</CardTitle>
        {!isLoading && (
          <Badge variant={data && data.length > 0 ? 'destructive' : 'success'}>
            {data?.length ?? 0}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
            <CheckCircle2 className="size-8 text-success" />
            <p className="text-sm">All clear — no active alerts.</p>
          </div>
        ) : (
          data.map((alert) => (
            <div
              key={alert.id}
              className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {TYPE_LABEL[alert.type] ?? alert.type}
                  </Badge>
                  {alert.room && (
                    <span className="text-xs text-muted-foreground">
                      {ROOM_LABELS[alert.room]}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm">{alert.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(alert.triggeredAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
