'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Moon, Sun } from 'lucide-react';
import { useOfficeHours } from '@/hooks/use-queries';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/ui/toast';
import { dataApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { OfficeHoursMode, OfficeHoursState } from '@/lib/types';

const OPTIONS: {
  mode: OfficeHoursMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { mode: 'auto', label: 'Auto', icon: Clock },
  { mode: 'open', label: 'Office hours', icon: Sun },
  { mode: 'closed', label: 'After hours', icon: Moon },
];

export function OfficeHoursControl() {
  const { data, isLoading } = useOfficeHours();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (mode: OfficeHoursMode) => dataApi.setOfficeHours(mode),
    onSuccess: (state) => {
      queryClient.setQueryData<OfficeHoursState>(queryKeys.officeHours, state);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
    onError: () =>
      toast({
        title: 'Could not change office hours',
        description: 'Only an ADMIN can change this.',
        variant: 'destructive',
      }),
  });

  const mode = data?.mode ?? 'auto';
  const within = data?.withinOfficeHours;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-lg',
              within ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
            )}
          >
            {within ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </div>
          <div>
            <p className="text-sm font-medium">Office Hours</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-4 w-40" />
            ) : (
              <p className="text-xs text-muted-foreground">
                Currently{' '}
                <span className={within ? 'text-success' : 'text-foreground'}>
                  {within ? 'within office hours' : 'after hours'}
                </span>
                {data ? ` · ${data.startHour}:00–${data.endHour}:00 ${data.timezone}` : ''}
                {mode !== 'auto' && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    forced
                  </Badge>
                )}
              </p>
            )}
          </div>
        </div>

        {isAdmin ? (
          <div className="inline-flex rounded-md border p-1">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  onClick={() => mutation.mutate(opt.mode)}
                  disabled={mutation.isPending}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title={
                    opt.mode === 'auto'
                      ? 'Follow the real clock'
                      : opt.mode === 'open'
                        ? 'Force office hours (no after-hours alerts)'
                        : 'Force after hours (demo alerts)'
                  }
                >
                  {mutation.isPending && mutation.variables === opt.mode ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : (
          <Badge variant="secondary" className="capitalize">
            {mode === 'auto' ? 'Auto' : mode === 'open' ? 'Office hours' : 'After hours'}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
